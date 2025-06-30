import { getConfig } from '@/config'
import { computed } from 'vue'
import { useAppStore } from '@/store/modules/app'
import { useUserStore } from '@/store/modules/user'
import type { CSSProperties } from 'vue'
import { isEmpty } from 'element-plus/es/utils/types.mjs'
import Avatar from '@/assets/user.jpg'
import { usePermissionStore } from '@/store/modules/permission'
import { emitter } from '@/utils/mitt'
import { storeToRefs } from 'pinia'
import { remainingPaths } from '@/router'
import { useSystemInfo } from '@/store/modules/systemInfo'

export function useNav() {
  //获取store里存储的侧边导航栏状态
  const AppStore = useAppStore()
  // 将 store 中的状态（state）和计算属性（getters）转换为响应式引用（refs）,直接结构会失去响应式
  const { wholeMenu } = storeToRefs(usePermissionStore())

  /** 平台`layout`中所有`el-tooltip`的`effect`配置，默认`light` */
  const tooltipEffect = getConfig()?.TooltipEffect ?? 'light'

  //侧边导航是否折叠
  const isCollapse = computed(() => {
    return AppStore.getSidebarStatus
  })

  const { $storage } = useSystemInfo()
  const layout = computed(() => {
    return $storage?.layout?.layout
  })

  //菜单标题样式
  const getDivStyle = computed((): CSSProperties => {
    return {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      overflow: 'hidden'
    }
  })

  /** 头像（如果头像为空则使用 src/assets/user.jpg ） */
  const userAvatar = computed(() => {
    return isEmpty(useUserStore()?.avatar) ? Avatar : useUserStore()?.avatar
  })

  /** 昵称（如果昵称为空则显示用户名） */
  const username = computed(() => {
    return isEmpty(useUserStore()?.nickname) ? useUserStore()?.username : useUserStore()?.nickname
  })

  //头像样式
  const avatarsStyle = computed(() => {
    return username.value ? { marginRight: '10px' } : ''
  })

  /** 退出登录 */
  function logout() {
    useUserStore().logOut()
  }

  //侧边导航折叠
  function toggleSideBar() {
    AppStore.toggleSidebar()
  }

  /** 判断路径是否参与菜单 */
  function isRemaining(path: string) {
    return remainingPaths.includes(path)
  }
  function menuSelect(indexPath: string) {
    if (wholeMenu.value.length === 0 || isRemaining(indexPath)) return
    emitter.emit('changLayoutRoute', indexPath)
  }
  return {
    isCollapse,
    tooltipEffect,
    layout,
    getDivStyle,
    userAvatar,
    username,
    avatarsStyle,
    logout,
    toggleSideBar,
    AppStore,
    menuSelect
  }
}
