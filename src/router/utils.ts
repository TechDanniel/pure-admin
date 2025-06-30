import ReactiveStorage from '@/utils/ReactiveStorage'
import { buildHierachyTree } from '@/utils/tree'
import { isEmpty, isString } from 'element-plus/es/utils/types.mjs'
import { RouteRecordRaw, RouteComponent } from 'vue-router'
import { DataInfo, userKey } from '@/utils/auth'
import { deepClone } from '@/utils/deepClone'
import { usePermissionStore } from '@/store/modules/permission'
import router from '.'
import { getConfig } from '@/config'
import { toRaw, isProxy } from 'vue'
import { useMultiTagsStore } from '@/store/modules/multiTags'
import { menuType } from '@/layout/types'
import { getAsyncRoutes } from '@/http/api/routes'
import { useUserStore } from '@/store/modules/user'

//判断是否需要创建rank
//如果没有parentId，说明它是顶级路由,需要rank
function handRank(routeInfo: any) {
  const { name, path, parentId, meta } = routeInfo
  return isEmpty(parentId) ? isEmpty(meta?.rank) || (meta?.rank === 0 && name !== 'Home' && path !== '/') : false
}

/**按照meta下的rank等级升序来排序路由 */
function ascending(arr) {
  //遍历arr，为不存在rank的路由自动创建一个数字
  arr.forEach((v, index) => {
    //根据顺序自动创建，因为首页永远排在第一位rank=1，所以+2避免冲突
    if (handRank(v)) v.meta.rank = index + 2
  })
  //升序排列
  return arr.sort((a: { meta: { rank: number } }, b: { meta: { rank: number } }) => {
    return a.meta.rank - b.meta.rank
  })
}

/**
 * 将多级嵌套路由处理成一维数组
 * @param routeList 路由列表
 * @returns 一维路由数组
 */
function formatFlatteningRoutes(routeList: RouteRecordRaw[]) {
  if (routeList.length === 0) return routeList
  //得到树形结构
  let hierarchyList = buildHierachyTree(routeList)
  let newRouteList = []
  const flatten = (hierarchyList: any[]) => {
    for (let i = 0; i < hierarchyList.length; i++) {
      newRouteList.push({ ...hierarchyList[i], children: undefined }) // 移除当前路由的 children 属性
      if (hierarchyList[i].children) {
        flatten(hierarchyList[i].children)
      }
    }
  }
  flatten(hierarchyList)
  return newRouteList
}

/**
 * 一维数组处理成多级嵌套数组（三级以上的路由全部拍成二级，keep-alive只支持到二级缓存）
 * @param routeList 处理后的一维路由菜单数组
 * @returns 返回将一维数组重新处理成规定路由的格式
 */

function formaTwoStageRoutes(routeList: RouteRecordRaw[]) {
  if (routeList.length === 0) return routeList
  //新数组存储拍平后的二级路由
  const newRouteList: RouteRecordRaw[] = []
  routeList.forEach((v: RouteRecordRaw) => {
    //处理根路径
    if (v.path === '/') {
      newRouteList.push({
        component: v.component,
        name: v.name,
        path: v.path,
        redirect: v.redirect,
        meta: v.meta,
        children: []
      })
    } else {
      //全部拍平
      v.path = v.path.startsWith('/') ? v.path.slice(1) : v.path
      newRouteList[0]?.children.push({ ...v })
    }
  })
  return newRouteList
}

/**判断两个数组彼此是否存在相同值 */
function isOneOfArray(a: Array<string>, b: Array<string>) {
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < a.length; i++) {
      if (b.includes(a[i])) return true
    }
  }
  return false
}

/**从localStorage里取出当前登录用户的角色roles，过滤掉无权限的菜单 */
// RouteComponent 类型一般会包含路由的路径、名称、组件、元信息等属性
const currentRoles = ReactiveStorage.getItem<DataInfo<number>>(userKey)?.roles ?? []
function filterNoPermissionTree(data: RouteComponent[]) {
  const newTree = deepClone(data)
    .filter((v: any) => {
      // 如果菜单没有 meta 或者 meta 中没有 roles 属性，认为不需要权限即可访问
      if (!v.meta || !v.meta.roles) {
        return true
      }
      // 检查当前用户的角色是否满足菜单所需的角色权限
      return isOneOfArray(v.meta.roles, currentRoles)
    })
    .map((menu: any) => {
      // 如果菜单有子菜单，递归过滤子菜单
      if (menu.children) {
        menu.children = filterNoPermissionTree(menu.children)
      }
      return menu
    })
  return newTree
}

/** 处理缓存路由（添加、删除、刷新） */
function handleAliveRoute({ name }: ToRouteType, mode?: string) {
  switch (mode) {
    //将路由的名字添加到缓存列表cachePageList
    case 'add':
      usePermissionStore().cacheOperate({ mode: 'add', name })
      break
    //将路由的名字从缓存列表cachePageList中移除
    case 'delete':
      usePermissionStore().cacheOperate({ mode: 'delete', name })
      break
    case 'refresh':
      usePermissionStore().cacheOperate({ mode: 'refresh', name })
      break
    //默认情况下
    // 先从缓存中删除指定的路由，然后在 100 毫秒后再将该路由添加回缓存。这种操作通常用于刷新路由缓存，确保路由对应的组件重新加载，从而更新组件的状态或数据。
    default:
      usePermissionStore().cacheOperate({ mode: 'delete', name })
      setTimeout(() => {
        usePermissionStore().cacheOperate({ mode: 'add', name })
      }, 100)
  }
}

//匹配所有的组件
const modulesRoutes = import.meta.glob('/src/views/**/*.{vue,tsx}')
/** 过滤后端传来的动态路由 重新生成规范路由 */
function addAsyncRoutes(arrRoutes: Array<RouteRecordRaw>) {
  if (!arrRoutes || !arrRoutes.length) return
  arrRoutes.forEach((v: RouteRecordRaw) => {
    const modulesRoutesKeys = Object.keys(modulesRoutes)
    //将backstage属性加入meta，标识此路由为后端返回的路由
    v.meta.backsatge = true
    // 当前路由有子路由且父级路由的 redirect 属性不存在，就将父级路由的 redirect 属性设置为第一个子路由的路径（v.children[0].path）。
    if (v?.children && v.children.length && !v.redirect) {
      v.redirect = v.children[0].path
    }
    //如果父级name不存在
    if (v?.children && v.children.length && !v.name) {
      v.name = (v.children[0].name as string) + 'Parent'
    }

    //给后端路由加上component
    const index = v?.component
      ? modulesRoutesKeys.findIndex(ev => ev.includes(v.component as any))
      : modulesRoutesKeys.findIndex(ev => ev.includes(v.path))
    v.component = modulesRoutes[modulesRoutesKeys[index]]

    //递归处理孩子
    if (v?.children && v.children.length) {
      addAsyncRoutes(v.children)
    }
  })
  return arrRoutes
}

/**处理动态路由（后端返回的路由） */
function handleAsyncRoutes(routeList) {
  if (routeList.length) {
    //对后端传过来的做处理后拍平为一维数组，然后遍历将路由添加到router中，可以导航找到
    formatFlatteningRoutes(addAsyncRoutes(routeList)).map(v => {
      //防止重复添加路由，因为我们做了拍平处理所以routes[0]
      if (
        router.options.routes[0].children.findIndex(value => {
          value.path === v.path
        }) !== -1
      )
        return
      else {
        //一定要加上addRoute，不然路由不会生效
        router.options.routes[0].children.push({ ...v, path: v.path.slice(1) })
        if (!router.hasRoute(v?.name)) router.addRoute(v)
        const flattenRouters: any = router.getRoutes().find(n => n.path === '/')
        router.addRoute(flattenRouters)
      }
    })
    //将动态路由和静态合并，过滤掉了没有权限的菜单
    usePermissionStore().handleWholeMenu(routeList)
    console.log(usePermissionStore().wholeMenu)
  } else usePermissionStore().handleWholeMenu(routeList)
}

/** 初始化路由*/
//获取动态路由并做处理存到wholeMenu，如果开启了缓存就缓存到浏览器本地
function initRouter() {
  // CachingAsyncRoutes 是配置中的一个属性，用于表示是否开启动态路由缓存（存储在本地 localStorage 中）
  if (getConfig()?.CachingAsyncRoutes) {
    //开启动态路由缓存到本地localStorage
    const key = 'async-routes'
    // 从本地存储中获取对应的动态路由数据 asyncRouteList
    const asyncRouteList = ReactiveStorage.getItem<Array<RouteRecordRaw>>(key)
    // 如果获取到的数据存在且长度大于 0，
    // 则调用 handleAsyncRoutes 处理这些路由数据，然后通过 resolve 方法将路由实例 router 传递出去，以表示路由初始化完成。
    if (asyncRouteList && asyncRouteList?.length > 0) {
      return new Promise(resolve => {
        handleAsyncRoutes(asyncRouteList)
        resolve(router)
      })
    } else {
      //本地存储为空就用getAsyncRoutes异步获取
      return new Promise(resolve => {
        getAsyncRoutes().then(({ data }) => {
          handleAsyncRoutes(deepClone(data.data))
          ReactiveStorage.setItem(key, data.data)
          resolve(router)
        })
      })
    }
  } else {
    //没有开启本地存储路由
    return new Promise(resolve => {
      getAsyncRoutes().then(({ data }) => {
        handleAsyncRoutes(deepClone(data.data))
        resolve(router)
      })
    })
  }
}

/** 查找对应 `path` 的路由信息 */
function findRouteByPath(path: string, routes: RouteRecordRaw[]) {
  let res = routes.find((item: { path: string }) => item.path == path.slice(1))
  if (res) {
    //isProxy判断该路由是否是响应式的，toRaw将其转换为原生对象，失去响应式
    return isProxy(res) ? toRaw(res) : res
  } else {
    //没找到就递归查找子路由
    for (let i = 0; i < routes.length; i++) {
      if (routes[i].children instanceof Array && routes[i].children.length > 0) {
        res = findRouteByPath(path, routes[i].children)
        if (res) {
          return isProxy(res) ? toRaw(res) : res
        }
      }
    }
    return null
  }
}

// 根据路由对象的子路由情况和重定向配置，确定最终要使用的菜单路由对象
function handleTopMenu(route) {
  //如果该路由孩子不止一个
  if (route?.children && route.children.length > 1) {
    //根据重定向确定要返回的菜单
    if (route.redirect) {
      return route.children.filter(cur => cur.path === route.redirect)[0]
    } else {
      return route.children[0]
    }
  }
  //没有孩子就返回自己
  else {
    return route
  }
}

/** 获取所有菜单中的第一个菜单（顶级菜单）*/
function getTopMenu(tag = false): menuType {
  //顶级菜单是所有菜单中第一个菜单的子菜单的第一项
  const topMenu = handleTopMenu(usePermissionStore().wholeMenu[0]?.children[0])
  //根据tag标签判断是否要将这个菜单加入标签页
  tag && useMultiTagsStore().handleTags('push', { ...topMenu, path: '/' + topMenu.path })
  return topMenu
}

//   routes: RouteRecordRaw[]：当前要搜索的路由配置数组。
//   value: string：要查找的目标路由路径。
//   parents: string[]：存储当前已找到的上级路由路径的数组。
/** 通过指定 `key` 获取父级路径集合，默认 `key` 为 `path` */
function getParentPaths(value: string, routes: RouteRecordRaw[], key = 'path') {
  // 深度遍历查找
  function dfs(routes: RouteRecordRaw[], value: string, parents: string[]) {
    for (let i = 0; i < routes.length; i++) {
      const item = routes[i]
      // 返回父级path
      if (item[key] === value) return parents
      // children不存在或为空则不递归
      if (!item.children || !item.children.length) continue
      // 往下查找时将当前path入栈
      parents.push(item.path)

      if (dfs(item.children, value, parents).length) return parents
      // 深度遍历查找未找到时当前path 出栈
      parents.pop()
    }
    // 未找到时返回空数组
    return []
  }

  return dfs(routes, value, [])
}

/**获取当前页面按钮级别的权限 */
function getAuth(): Array<string> {
  return useUserStore().permissions as Array<string>
}

/**判断数组b是否包含另一个数组a的所有孩子 */
function isIncludeAllChildren(a: Array<string>, b: Array<string>): boolean {
  return a.every(item => b.includes(item))
}

/** 是否有按钮级别的权限（根据路由`meta`中的`auths`字段进行判断）*/
function hasAuths(value: string | Array<string>): boolean {
  if (!value) return false
  //获取当前路由的权限
  const metaAuths = getAuth()
  if (!metaAuths) return false
  //判断是否有权限
  const isAuths = isString(value) ? metaAuths.includes(value) : isIncludeAllChildren(metaAuths, value)
  return isAuths
}

export {
  ascending,
  formatFlatteningRoutes,
  formaTwoStageRoutes,
  filterNoPermissionTree,
  handleAliveRoute,
  isOneOfArray,
  initRouter,
  findRouteByPath,
  getTopMenu,
  getParentPaths,
  hasAuths
}
