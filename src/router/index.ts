//vite提供的方法动态导入模块,返回一个对象，键是路径，值是导入该模块的函数;'./dir/bar.js': () => import('./dir/bar.js'),
//这是一个选项，表示所有匹配的模块应该被立即导入，而不是懒加载。

import { createRouter, createWebHashHistory, Router, RouteRecordRaw } from 'vue-router'
import { ascending, findRouteByPath, formaTwoStageRoutes, formatFlatteningRoutes, handleAliveRoute } from './utils'
import { usePermissionStore } from '@/store/modules/permission'
import ReactiveStorage from '@/utils/ReactiveStorage'
import { DataInfo, multipleTabsKey, userKey } from '@/utils/auth'
import Nprogress from '@/utils/progress'
import Cookies from 'js-cookie'
import { isOneOfArray, initRouter, getTopMenu } from './utils'
import { useMultiTagsStore } from '@/store/modules/multiTags'
import { isEmpty } from 'element-plus/es/utils/types.mjs'
import { removeToken } from '@/utils/auth'
import remainingRouter from './modules/remaining'

// 如果 eager 设置为 false 或者不设置，模块会在它们第一次被访问时才导入。
const modules: Record<string, any> = import.meta.glob(['./modules/*.ts'], { eager: true })

/**原始静态路由 */
const routes = []

/** 不参与菜单的路由 */
export const remainingPaths = Object.keys(remainingRouter).map(v => {
  return remainingRouter[v].path
})
//将modules的路由添加到routes中,不拍平remaining里面的，后面单独添加
Object.keys(modules).forEach(key => {
  const moduleRoute = modules[key].default
  if (moduleRoute && moduleRoute.path && !remainingPaths.includes(moduleRoute.path)) {
    routes.push(moduleRoute)
  }
})
/** 用于渲染菜单，保持原始层级 */
export const constantMenus = ascending(routes.flat(Infinity))

/**导出处理后的静态路由（将三级以上的路由全都拍成二级的） */
// RouteRecordRaw 类型的对象通常包含path、name、component 等属性
export const constantRoutes: Array<RouteRecordRaw> = formaTwoStageRoutes(
  formatFlatteningRoutes(ascending(routes.flat(Infinity)))
)

//创建路由实例
export const router: Router = createRouter({
  history: createWebHashHistory(),
  routes: constantRoutes.concat(...(remainingRouter as any)),
  // 严格匹配模式下，路由的路径会严格匹配，例如 /foo/ 和 /foo 会被视为不同的路径
  strict: true,
  // 自定义路由切换时滚动行为,路由切换时保持滚动的位置
  scrollBehavior(from, savedPosition) {
    return new Promise(resolve => {
      if (savedPosition) {
        // 通过浏览器的前进或后退按钮进行路由切换，savedPosition 会包含之前保存的滚动位置。
        return savedPosition
      } else {
        if (from.meta.saveScrollTop) {
          // 不同浏览器对滚动位置的存储位置可能不同，有些浏览器将滚动位置存储在 document.documentElement.scrollTop 中，有些则存储在 document.body.scrollTop 中。所以使用逻辑或运算符 || 来确保在不同浏览器中都能正确获取滚动位置。
          const top: number = document.documentElement.scrollTop || document.body.scrollTop
          resolve({ left: 0, top })
        }
      }
    })
  }
})

/**重置路由 */
export function resetRouter() {
  //移除后台管理系统的相关路由，以便后续根据权限动态添加
  router.getRoutes().forEach(route => {
    const { name, meta } = route
    if (name && router.hasRoute(name) && meta?.backstage) {
      router.removeRoute(name)
    }
  })
  usePermissionStore().clearAllCachePage()
}

/**路由白名单 */
//允许公开访问的页面
const whiteList = ['/login']

/**全局前置路由守卫 */
/** 如果已经登录并存在登录信息后不能跳转到路由白名单，而是继续保持在当前页面 */
function toCorrectRoute(to, from, next) {
  whiteList.includes(to.fullPath) ? next(from.fullPath) : next()
}

// 刷新页面处理路由和标签页
async function handleDynamicRoutesAndTags(to, from, next) {
  if (to.path !== 'login') {
    initRouter().then((router: Router) => {
      //initRouter初始化路由后处理标签页
      //没有缓存标签页的情况
      if (!useMultiTagsStore().getMultiTagsCache) {
        const { path } = to
        //找到要跳转的那个路由的信息
        const route = findRouteByPath(path, router.options.routes[0].children)
        //获取顶级菜单，并存到标签页（首页）
        getTopMenu(true)
        // query、params模式路由传参数的标签页不在此处处理
        // 针对当前正在处理的 route 路由对象进行的操作，根据该路由对象的属性来决定是存储其自身信息还是第一个子菜单的信息到标签页
        // 这个操作通常是在路由导航过程中，根据当前路由的具体情况动态更新标签页信息。
        if (route && route.meta?.title) {
          //该路由是顶级的动态菜单（是一个目录，我们要存起来的是他的孩子）
          if (isEmpty(route.parentId) && route.meta?.backstage) {
            const { path, name, meta } = route.children[0]
            let newpath = '/' + path
            useMultiTagsStore().handleTags('push', {
              newpath,
              name,
              meta
            })
          } else {
            const { path, name, meta } = route
            if (name !== 'Welcome') {
              const newpath = '/' + path
              useMultiTagsStore().handleTags('push', {
                path: newpath,
                name,
                meta
              })
            }
          }
        }
      }
      //刷新的时候第一次name为undefined所以push再次导航，第二次name能够匹配值
      if (to.name === undefined) {
        router.push(to.fullPath)
        return
      }
    })
    toCorrectRoute(to, from, next)
  }
}

router.beforeEach(async (to: ToRouteType, from, next) => {
  if (to.meta?.keepAlive) {
    handleAliveRoute(to, 'add')
    // 页面整体刷新
    if (from.name === undefined) {
      handleAliveRoute(to)
    }
  }

  //从本地获取用户信息，并开启进度条
  const userInfo = ReactiveStorage.getItem<DataInfo<number>>(userKey)
  Nprogress.start()

  //检查用户登录信息，判断用户是否登录
  if (Cookies.get(multipleTabsKey) && userInfo) {
    //用户已经登录但是无权限
    if (to.meta?.roles && !isOneOfArray(to.meta?.roles, userInfo?.roles)) {
      next({ path: '/error/403' })
      return
    }

    //处理重定向
    if (to.name === 'Redirect') {
      const { path } = to.params
      if (path) {
        const targetPath = Array.isArray(path) ? path.join('/') : path
        next({ path: `/${targetPath}`, query: to.query })
        return
      } else {
        // 若没有有效的路径参数，可重定向到首页或默认页面
        next('/')
        return
      }
    }

    if (from?.name) {
      toCorrectRoute(to, from, next)
      return
    } else {
      //页面刷新，from和to的name都是undefined
      handleDynamicRoutesAndTags(to, from, next)
    }
  } else {
    if (to.path !== '/login') {
      if (whiteList.indexOf(to.path) !== -1) {
        next()
      } else {
        removeToken()
        next({ path: '/login' })
      }
    } else {
      next()
    }
  }
})

router.afterEach(() => {
  Nprogress.done()
})

export default router
