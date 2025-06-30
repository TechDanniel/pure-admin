import axios from 'axios'
import { App } from 'vue'
import { useSystemInfo } from '@/store/modules/systemInfo'

let config: object = {}
const { VITE_PUBLIC_PATH } = import.meta.env

//将新的配置添加到config
const setConfig = (newConfig: object) => {
  config = Object.assign(config, newConfig)
}

//根据配置项键名拿到相应配置信息；如果没有传入key返回默认配置项
const getConfig = (key?: string): PlatformConfigs => {
  if (typeof key === 'string') {
    if (typeof key === 'string') {
      const arr = key.split('.')
      if (arr && arr.length) {
        let data = config
        arr.forEach(item => {
          if (data && data[item] !== undefined) {
            data = data[item]
          } else {
            data = null
          }
        })
        return data
      }
    }
  }
  return config
}

/**获取项目动态全局配置 */
const getPlatformConfig = async (app: App): Promise<any> => {
  useSystemInfo().setConfig(getConfig())
  return axios({
    method: 'get',
    url: `${VITE_PUBLIC_PATH}platform-config.json`
  }).then(({ data: config }) => {
    // 使用解构赋值从响应对象中提取 data 属性，并将其重命名为 config。
    let $config = useSystemInfo().getConfig()
    //自动注入系统配置
    if (app && $config && typeof config === 'object') {
      $config = Object.assign($config, config)
      //设置全局变量$config
      useSystemInfo().setConfig($config)
      //设置全局配置给getConfig使用
      setConfig($config)
      return $config
    }
  })
}

/**本地响应式存储的命名空间 */
const responsiveStorageNameSpace = () => getConfig().ResponsiveStorageNameSpace

export { getConfig, setConfig, responsiveStorageNameSpace, getPlatformConfig }
