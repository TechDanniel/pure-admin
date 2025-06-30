import { defineStore } from "pinia"

export const useSystemInfo= defineStore('systemInfo', {
  state: () => ({ 
    $config: {} as PlatformConfigs, 
    $storage: {} as  ResponsiveStorage // 响应式存储
  }), // 系统配置   
  actions:{
    // 设置系统配置
    setConfig(config) {
      this.$config = config
    },
    // 获取系统配置
    getConfig() {
      return this.$config
    },
    // 设置响应式存储
    setStorage(storage) {
      this.$storage = storage
    },
    // 获取响应式存储
    getStorage() {
      return this.$storage
    }
  }
})