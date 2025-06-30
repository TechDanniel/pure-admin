import Axios, { AxiosInstance, AxiosRequestConfig, CustomParamsSerializer } from 'axios'
import { stringify } from 'qs'
import { HttpError, HttpRequestConfig, HttpResponseConfig, RequestMethods } from './type.s'
import { formatToken, getToken } from '@/utils/auth'
import Nprogress from '@/utils/progress'
import { useUserStore } from '@/store/modules/user'

const defaultConfig: AxiosRequestConfig = {
  //请求超时时间
  timeout: 10000,
  headers: {
    // 该字段告诉服务器客户端可以接受的响应内容类型.表示客户端可以接受 JSON 格式、纯文本格式或任意类型的响应内容。
    Accept: 'application/json, text/plain, */*',
    // 请求体将以 JSON 格式发送
    'Content-Type': 'application/json',
    // 这是一个自定义的请求头字段，通常用于标识请求是通过 XMLHttpRequest 发起的
    'X-Requested-With': 'XMLHttpRequest'
  },
  //数组格式参数序列化:foo: ['bar', 'baz']=>输出: foo[]=bar&foo[]=baz
  //这里一定要写成对象格式，不然axios合并配置项会报错
  paramsSerializer: {
    serialize: stringify as unknown as CustomParamsSerializer //or (params) => Qs.stringify(params, {arrayFormat: 'brackets'})
  }
}

//封装请求
class Http {
  //自动调用请求拦截器和响应拦截器
  constructor() {
    this.httpInterceptorsRequest()
    this.httpInterceptorsResponse()
  }

  /**token过期后暂存待执行的请求 */
  //便于token更新后自动重新发送请求
  private static requests = []

  /**防止重复刷新token */
  //如果发送多个请求的时候同时检测到token过期，他们都会执行刷新token，浪费资源
  private static isRefreshing = false

  /**初始化配置对象 */
  //Axios 的配置可能会根据不同的环境、业务需求进行调整。将这些配置信息集中存储在 initConfig 中，方便在整个类的生命周期内进行管理和复用。
  private static initConfig: HttpRequestConfig = {}

  /**保存当前的Axios实例对象 */
  private static axiosInstance: AxiosInstance = Axios.create(defaultConfig)

  /**重连原始请求 */
  private static retruOriginalRequest(config: HttpRequestConfig) {
    return new Promise(resolve => {
      // 更新原始请求配置中的 Authorization 请求头字段
      Http.requests.push((token: string) => {
        config.headers['Authorization'] = formatToken(token)
        resolve(config)
      })
    })
  }

  /**请求拦截 */
  private httpInterceptorsRequest() {
    // 第一个参数是一个函数，当请求配置成功处理时调用。你可以在这个函数中修改请求配置（如添加头信息、修改 URL 等）。
    // 第二个参数是一个函数，当请求配置处理失败时调用。你可以在这个函数中处理配置错误（如抛出错误、记录日志等）。
    Http.axiosInstance.interceptors.request.use(
      async (config: HttpRequestConfig): Promise<any> => {
        //开启进度条动画
        Nprogress.start()

        //先检查get/post方法是否传入了发送请求前的回调函数
        if (typeof config.beforeRequestCallback === 'function') {
          //可能会在这里处理一些配置
          config.beforeRequestCallback(config)
          return config
        }
        //还要检查初始化的config，执行回调
        if (Http.initConfig.beforeRequestCallback) {
          Http.initConfig.beforeRequestCallback(config)
          return config
        }

        /**请求白名单，放置不需要token的接口 */
        const whiteList = ['/refreshToken', '/login']
        //如果当前请求在白名单中，就直接返回config，不进行后续的token处理
        return whiteList.some(url => config.url.endsWith(url))
          ? config
          : new Promise(resolve => {
              //获取token信息
              const data = getToken()
              if (data) {
                const now = new Date().getTime()
                const expired = data.expires - now < 0
                // /如果 token 过期且当前没有正在刷新 token（PureHttp.isRefreshing 为 false），
                // 则将 PureHttp.isRefreshing 设为 true，调用 useUserStoreHook().handRefreshToken 方法刷新 token。
                if (expired) {
                  if (!Http.isRefreshing) {
                    Http.isRefreshing = true
                    //刷新过期的token
                    useUserStore()
                      .handleRefreshToken({ refreshToken: data.refreshToken })
                      .then(res => {
                        //得到新的token
                        const token = res.data.accessToken
                        //响应头更新token
                        config.headers['Authorization'] = formatToken(token)
                        //更新由于过期请求失败的请求的token
                        Http.requests.forEach(cb => cb(token))
                        //清空过期token请求失败的请求队列
                        Http.requests = []
                      })
                      .finally(() => {
                        // finally 方法的回调函数无论 Promise 是成功（resolved）还是失败（rejected）都会被执行
                        //token更新完毕记得设置isRefreshing为false
                        Http.isRefreshing = false
                      })
                  }
                  //更新token的过程是异步的，所以需要记录当前请求，等待token更新后再重新发送请求
                  resolve(Http.retruOriginalRequest(config))
                } else {
                  config.headers['Authorization'] = formatToken(data.accessToken)
                  resolve(config)
                }
              } else {
                resolve(config)
              }
            })
      },
      error => {
        return Promise.reject(error)
      }
    )
  }

  /** 响应拦截 */
  private httpInterceptorsResponse() {
    Http.axiosInstance.interceptors.response.use(
      (response: HttpResponseConfig) => {
        //关闭进度条
        Nprogress.done()
        if (typeof response.beforeResponseCallback === 'function') {
          response.beforeResponseCallback(response)
          return response.data
        }
        if (Http.initConfig.beforeResponseCallback) {
          Http.initConfig.beforeResponseCallback(response)
          return response.data
        }
        return response.data
      },
      (error: HttpError) => {
        // Axios.isCancel 方法判断该错误是否是由取消请求引起的
        error.isCancelRequest = Axios.isCancel(error)
        //关闭进度条动画
        Nprogress.done()
        //区分响应异常的来源是取消请求还是非取消请求
        return Promise.reject(error)
      }
    )
  }

  /**发送请求的工具函数 */
  public request<T>(
    method: RequestMethods,
    url: string,
    params?: AxiosRequestConfig,
    axiosConfig?: HttpRequestConfig
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      Http.axiosInstance
        .request({ method, url, ...params, ...axiosConfig })
        .then(response => {
          resolve(response as unknown as T)
        })
        .catch(error => {
          reject(error)
        })
    })
  }

  /**单独抽离的post工具函数 */
  public post(url: string, params?: AxiosRequestConfig, config?: HttpRequestConfig) {
    return this.request('post', url, params, config)
  }

  /**单独抽离get工具函数 */
  public get(url: string, params?: AxiosRequestConfig, config?: HttpRequestConfig) {
    return this.request('get', url, params, config)
  }
}

export default new Http()