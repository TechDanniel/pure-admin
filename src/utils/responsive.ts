//拿到存储在浏览器本地的响应式信息,将其与系统配置config合并
import { responsiveStorageNameSpace } from '@/config'
import { App } from 'vue'
import ReactiveStorage from './ReactiveStorage'
import { routerArrays } from '@/layout/type'
import { useSystemInfo } from '@/store/modules/systemInfo'
//将响应式信息注入为全局变量$Storage,没有就是默认值
export const injectResponsiveStorage = (app: App, config: PlatformConfigs) => {
  const nameSpace = responsiveStorageNameSpace()
  const configObj = Object.assign(
    {
      // layout模式以及主题
      layout: ReactiveStorage.getItem(`${nameSpace}layout`) ?? {
        layout: config.Layout ?? 'vertical',
        theme: config.Theme ?? 'light',
        darkMode: config.DarkMode ?? false,
        sidebarStatus: config.SidebarStatus ?? true,
        epThemeColor: config.EpThemeColor ?? '#409EFF',
        themeColor: config.Theme ?? 'light', // 主题色（对应系统配置中的主题色，与theme不同的是它不会受到浅色、深色整体风格切换的影响，只会在手动点击主题色时改变）
        overallStyle: config.OverallStyle ?? 'light' // 整体风格（浅色：light、深色：dark、自动：system）
      },
      // 系统配置-界面显示
      configure: ReactiveStorage.getItem(`${nameSpace}configure}`) ?? {
        grey: config.Grey ?? false,
        weak: config.Weak ?? false,
        hideTabs: config.HideTabs ?? false,
        hideFooter: config.HideFooter ?? true,
        showLogo: config.ShowLogo ?? true,
        showModel: config.ShowModel ?? 'smart',
        multiTagsCache: config.MultiTagsCache ?? false,
        stretch: config.Stretch ?? false
      }
    },
    config.MultiTagsCache ? { tags: ReactiveStorage.getItem(`${nameSpace}tags`) ?? routerArrays } : {}
  )
  ReactiveStorage.setItem(`${nameSpace}configure`, configObj.configure)
  ReactiveStorage.setItem(`${nameSpace}layout`, configObj.layout)
  useSystemInfo().setStorage(configObj)
}
