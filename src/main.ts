import { createApp,Directive } from 'vue'
import { MotionPlugin } from '@vueuse/motion'
import { setupStore } from './store'
import { getPlatformConfig } from './config'
import router from './router'
import { getConfig } from './config'

import App from './App.vue'

// 引入重置样式
import './style/reset.scss'
// 导入公共样式
import './style/index.scss'
import { injectResponsiveStorage } from './utils/responsive'
import './style/tailwind.css'
//引入element-plus样式
import 'element-plus/dist/index.css'

// 1.查找具有 id 为 app 的元素
// 2.将跟组件App.vue渲染成虚拟 DOM
// 3.Vue 会把虚拟 DOM 转换成真实的 DOM 节点。在这个转换过程中，Vue 会处理组件的模板、指令、数据绑定等内容，把它们转换成实际的 HTML 元素和属性。
// 4.Vue 会把生成的真实 DOM 节点插入到 HTML 文档中，并且替换掉之前找到的具有 id 为 app 的元素。
const app = createApp(App)

//全局注册自定义指令
import * as directives from '@/directives/index'
Object.keys(directives).forEach(key => {
  app.directive(key, (directives as { [key: string]: Directive })[key])
  console.log(key, directives[key])
})

// 全局注册vue-tippy(提示框库)
import 'tippy.js/dist/tippy.css'
import 'tippy.js/themes/light.css'
import VueTippy from 'vue-tippy'
app.use(VueTippy)

//全局注册pinia
setupStore(app)

getPlatformConfig(app).then(async config => {
  const bodyElement = document.querySelector('body')
  bodyElement.setAttribute('layout', getConfig().Layout)
  app.use(MotionPlugin)
  app.use(router)
  // 这行代码的作用是等待路由实例完成初始化，也就是等待路由的所有异步操作（例如异步组件加载、导航守卫执行等）结束，确保路由已经完全准备好处理导
  // 会暂停当前 async 函数的执行，直到 router.isReady() 返回的 Promise 被解决，之后再继续执行后续代码。
  await router.isReady()
  //动态注入响应式信息，如果浏览器还未存储就先用config的默认值（这些信息用$Storage存储，而且已经注册为全局）
  injectResponsiveStorage(app, config)
  app.mount('#app')
})
