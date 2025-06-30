<template>
  <section :class="[props.fixedHeader ? 'app-main' : 'app-main-nofixed-header']" :style="getSectionStyle">
    <router-view>
      <!--这个template内容是渲染当前路由的组件-->
      <template #default="{ Component, route }">
        <Frame :currComp="Component" :currRoute="route">
          <!--这个填充的是frame组件的默认插槽，根据是否缓存渲染-->
          <template #default="{ Comp, fullPath }">
            <el-scrollbar
              v-if="fixedHeader"
              :wrap-style="{
                display: 'flex',
                'flex-wrap': 'wrap',
                'max-width': getMainWidth,
                margin: '0 auto',
                transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)'
              }"
              :view-style="{
                display: 'flex',
                flex: 'auto',
                overflow: 'hidden',
                'flex-direction': 'column'
              }"
            >
              <el-backtop title="回到顶部" target=".app-main .el-scrollbar__wrap">
                <BackTopIcon />
              </el-backtop>
              <div class="grow">
                <transitionMain :route="route">
                  <keep-alive v-if="isKeepAlive" :include="usePermissionStore().cachePageList">
                    <component :is="Comp" :key="fullPath" class="main-content" />
                  </keep-alive>
                  <component :is="Comp" v-else :key="fullPath" class="main-content" />
                </transitionMain>
              </div>
            </el-scrollbar>
            <div v-else class="grow">
              <transitionMain :route="route">
                <keep-alive v-if="isKeepAlive" :include="usePermissionStore().cachePageList">
                  <component :is="Comp" :key="fullPath" class="main-content" />
                </keep-alive>
                <component :is="Comp" v-else :key="fullPath" class="main-content" />
              </transitionMain>
            </div>
          </template>
        </Frame>
      </template>
    </router-view>
  </section>
</template>

<script setup lang="ts">
import { computed, defineComponent, Transition, h } from 'vue'
import { useSystemInfo } from '@/store/modules/systemInfo'
import Frame from '@/layout/frame/index.vue'
import BackTopIcon from '@/assets/svg/back_top.svg?component'
import { usePermissionStore } from '@/store/modules/permission'
import { isNumber } from 'element-plus/es/utils/types.mjs'

const props = defineProps({
  fixedHeader: Boolean
})

const hideTabs = computed(() => {
  return $storage?.configure.hideTabs
})
const layout = computed(() => {
  return $storage?.layout.layout === 'vertical'
})
const getSectionStyle = computed(() => {
  return [
    hideTabs.value && layout ? 'padding-top: 48px;' : '',
    !hideTabs.value && layout ? 'padding-top: 81px;' : '',
    hideTabs.value && !layout.value ? 'padding-top: 48px;' : '',
    !hideTabs.value && !layout.value ? 'padding-top: 81px;' : '',
    props.fixedHeader
      ? ''
      : `padding-top: 0;${hideTabs.value ? 'min-height: calc(100vh - 48px);' : 'min-height: calc(100vh - 86px);'}`
  ]
})

const transitions = computed(() => {
  return route => {
    return route.meta.transition
  }
})
//为子组件添加过渡效果
const transitionMain = defineComponent({
  props: {
    route: { type: undefined, required: true }
  },
  render() {
    const transitionName = transitions.value(this.route)?.name || 'fade-transform'
    const enterTransition = transitions.value(this.route)?.enterTransition
    const leaveTransition = transitions.value(this.route)?.leaveTransition
    return h(
      Transition,
      {
        name: enterTransition ? 'pure-classes-transition' : transitionName,
        enterActiveClass: enterTransition ? `animate__animated ${enterTransition}` : undefined,
        leaveActiveClass: leaveTransition ? `animate__animated ${leaveTransition}` : undefined,
        mode: 'out-in',
        appear: true
      },
      {
        default: () => [this.$slots.default()]
      }
    )
  }
})

const { $storage, $config } = useSystemInfo()
const stretch = computed(() => {
  return $storage?.configure.stretch
})
const getMainWidth = computed(() => {
  return isNumber(stretch.value) ? stretch.value + 'px' : stretch.value ? '1440px' : '100%'
})

const isKeepAlive = computed(() => {
  return $config?.KeepAlive
})
</script>

<style scoped>
.app-main {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow-x: hidden;
}

.app-main-nofixed-header {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.main-content {
  margin: 24px;
}
</style>
