//将我们定义好的图标组件放在一个地方，方便后续引入
import iconifyIconOnline from './src/iconifyIconOnline'
import iconifyIconOffline from './src/inconifyIconOffline'
import fontIcon from './src/iconfonts'

// 本地图标组件
const IconifyIconOffline = iconifyIconOffline
//在线图标组件
const IconifyIconOnline = iconifyIconOnline
//iconfont组件
const FontIcon = fontIcon

export { IconifyIconOffline, IconifyIconOnline, FontIcon }