<template>
  <div v-if="!showTags" ref="containerDom" class="tags-view">
    <!-- 向左滚动图标 -->
    <span v-show="isShowArrow" class="arrow-left">
      <IconifyIconOffline :icon="ArrowLeftSLine" @click="handleScroll(200)" />
    </span>
    <div ref="scrollbarDom" class="scroll-container">
      <div ref="tabDom" class="tab select-none" :style="getTabStyle">
        <div
          v-for="(item, index) in multiTags"
          :ref="'dynamic' + index"
          :key="index"
          :class="['scroll-item is-closable', linkIsActive(item), isFixedTag(item, index) && 'fixed-tag']"
          @mouseenter.prevent="onMouseenter(index)"
          @mouseleave.prevent="onMouseleave(index)"
          @click="tagOnClick(item)"
        >
          <span class="tag-title dark:!text-text_color_primary dark:hover:!text-primary">
            {{ item.meta.title }}
          </span>
          <span
            v-if="isFixedTag(item, index) ? false : iconIsActive(item, index) || (index === activeIndex && index !== 0)"
            class="el-icon-close"
            @click.stop="deleteMenu(item)"
          >
            <IconifyIconOffline :icon="Close" />
            <span v-if="scheduleIndex === index" :ref="'schedule' + index" :class="[scheduleIsActive(item)]"></span>
          </span>
          <span v-if="scheduleIndex === index" :ref="'schedule' + index" :class="[scheduleIsActive(item)]"></span>
        </div>
      </div>
    </div>
    <!-- 向右滚动图标 -->
    <span v-show="isShowArrow" class="arrow-right">
      <IconifyIconOffline :icon="ArrowRightSLine" @click="handleScroll(-200)" />
    </span>
    <!-- 右侧功能按钮 -->
    <el-dropdown trigger="click" placement="bottom-end" @command="handleCommand">
      <span class="arrow-down">
        <IconifyIconOffline :icon="ArrowDown" class="dark:text-white" />
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="(item, key) in tagsViews"
            :key="key"
            :command="{ key, item }"
            :divided="item.divided"
            :disabled="item.disabled"
          >
            <IconifyIconOffline :icon="item.icon" />
            {{ item.text }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import ArrowDown from '@iconify-icons/ri/arrow-down-s-line'
import ArrowRightSLine from '@iconify-icons/ri/arrow-right-s-line'
import ArrowLeftSLine from '@iconify-icons/ri/arrow-left-s-line'
import Close from '@iconify-icons/ep/close'

import { emitter } from '@/utils/mitt'
import { isEmpty, isEqual } from 'lodash'
import { IconifyIconOffline } from '@/components/ReIcon'
import { useTags } from '../hooks/useTags'
import { ref, nextTick, toRaw, unref, watch, onBeforeUnmount } from 'vue'
import router from '@/router'
import { useMultiTagsStore } from '@/store/modules/multiTags'
import { getTopMenu, handleAliveRoute } from '@/router/utils'
import { RouteConfigs } from '../type'
const {
  showTags,
  isScrolling,
  translateX,
  multiTags,
  route,
  getTabStyle,
  tagsViews,
  onMouseenter,
  onMouseleave,
  instance,
  activeIndex,
  scheduleIsActive,
  linkIsActive,
  isFixedTag,
  iconIsActive
} = useTags()

//滚动图标事件
const isShowArrow = ref(false)
const scrollbarDom = ref()
const tabDom = ref()
const handleScroll = (offset: number) => {
  //获取滚动条容器的宽度
  const scrollbarDomWidth = scrollbarDom.value ? scrollbarDom.value?.offsetWidth : 0
  //获取标签页容器宽度
  const tabDomWidth = tabDom.value ? tabDom.value.offsetWidth : 0
  //向左滚动
  if (offset > 0) {
    translateX.value = Math.min(0, translateX.value + offset)
  } else {
    //向右滚动
    if (scrollbarDomWidth < tabDomWidth) {
      // 标签页内容的宽度大于滚动条容器的宽度，有向右滚动的必要
      if (translateX.value >= -(tabDomWidth - scrollbarDomWidth)) {
        translateX.value = Math.max(translateX.value + offset, scrollbarDomWidth - tabDomWidth)
      }
    } else {
      translateX.value = 0
    }
  }
  isScrolling.value = false
}

//点击tags触发页面跳转
function tagOnClick(item) {
  const { name, path } = item
  if (name) {
    if (item.query) {
      router.push({ name, query: item.query })
    } else if (item.params) {
      router.push({ name, params: item.params })
    } else {
      router.push({ name })
    }
  } else {
    router.push({ path })
  }
}

//刷新页面
const scheduleIndex = ref(0)
const dynamicTagView = async () => {
  await nextTick()
  const index = multiTags.value.findIndex(item => {
    if (!isEmpty(route.query)) {
      return isEqual(item.query, route.query)
    } else if (!isEmpty(route.params)) {
      return isEqual(item.params, route.params)
    } else {
      return item.path === route.path
    }
  })
  //记录当前激活的标签项，路由所在的标签项
  scheduleIndex.value = index
  //将当前标签项滚动到可见区域
  moveToView(index)
}

//将指定索引的标签项滚动到可见区域
const moveToView = async (index: number): Promise<void> => {
  await nextTick()
  const tabNavPadding = 10
  if (!instance?.refs['dynamic' + index]) return
  //获取标签页dom
  const tabItemEl = instance.refs['dynamic' + index][0]
  //获取标签页的左偏移量
  const tabItemElOffsetLeft = (tabItemEl as HTMLElement)?.offsetLeft
  //获取此标签页的宽度
  const tabItemOffsetWidth = (tabItemEl as HTMLElement)?.offsetWidth
  //标签页导航栏可视长度（不包含溢出部分）
  const scrollbarDomWidth = scrollbarDom.value ? scrollbarDom.value.offsetWidth : 0
  // 已有标签页总长度（包含溢出部分）
  const tabDomWidth = tabDom.value ? tabDom.value?.offsetWidth : 0
  //判断图标的显示隐藏
  scrollbarDomWidth.value <= tabDomWidth.value ? (isShowArrow.value = true) : (isShowArrow.value = false)
  // 根据标签项的位置计算滚动偏移量
  //情况 1：标签页总长度小于导航栏可视长度或标签项左偏移量为 0
  if (tabDomWidth < scrollbarDomWidth || tabItemElOffsetLeft === 0) {
    translateX.value = 0
  }
  // 情况 2：标签在可视区域左侧
  else if (tabItemElOffsetLeft < -translateX.value) {
    translateX.value = -tabItemElOffsetLeft + tabNavPadding
  }
  // 情况 3：标签在可视区
  else if (
    tabItemElOffsetLeft > -translateX.value &&
    tabItemElOffsetLeft + tabItemOffsetWidth < -translateX.value + scrollbarDomWidth
  ) {
    translateX.value = Math.min(0, scrollbarDomWidth - tabItemOffsetWidth - tabItemOffsetWidth)
  }
  // 情况 4：标签在可视区右侧
  else {
    translateX.value = -(tabItemElOffsetLeft - scrollbarDomWidth + tabNavPadding + tabItemOffsetWidth)
  }
}

//删除指定的标签
function deleteDynamicTag(obj: any, current: any, tag?: string) {
  //查找要删除的标签索引
  const valueIndex: number = multiTags.value.findIndex(item => {
    if (item.query) {
      if (item.path === obj.path) {
        return item.query === obj.query
      }
    } else if (item.params) {
      if (item.path === obj.path) {
        return item.params === obj.params
      }
    } else {
      return item.path === obj.path
    }
  })
  //删除指定范围的标签并更新标签页布局
  const spliceRoute = (startIndex?: number, length?: number, other?: boolean): void => {
    if (other) {
      useMultiTagsStore().handleTags('equal', [toRaw(getTopMenu()), obj].flat())
    } else {
      useMultiTagsStore().handleTags('splice', '', {
        startIndex,
        length
      }) as any
    }
  }

  //根据指令tag进行删除
  if (tag === 'other') {
    spliceRoute(1, 1, true)
  } else {
    // 从当前匹配到的路径中删除
    spliceRoute(valueIndex, 1)
  }

  //删除后确定激活标签页
  //最后一项
  const newRoute = useMultiTagsStore().handleTags('slice')
  if (current === route.path) {
    // 如果删除当前激活tag就自动切换到最后一个tag
    if (newRoute[0]?.query) {
      router.push({ name: newRoute[0].name, query: newRoute[0].query })
    } else if (newRoute[0]?.params) {
      router.push({ name: newRoute[0].name, params: newRoute[0].params })
    } else {
      router.push({ path: newRoute[0].path })
    }
  } else {
    // 如果删除的不是当前激活的标签，且当前激活的标签仍然存在于标签列表中，则不进行路由切换
    if (!multiTags.value.length) return
    if (multiTags.value.some(item => item.path === route.path)) return
    if (newRoute[0]?.query) {
      router.push({ name: newRoute[0].name, query: newRoute[0].query })
    } else if (newRoute[0]?.params) {
      router.push({ name: newRoute[0].name, params: newRoute[0].params })
    } else {
      router.push({ path: newRoute[0].path })
    }
  }
  dynamicTagView()
}
//点×删除该标签
function deleteMenu(item, tag?: string) {
  deleteDynamicTag(item, item.path, tag)
  //处理Permissionstore里缓存的路由,刷新一下
  handleAliveRoute(route as ToRouteType)
}

const topPath = getTopMenu()?.path
// 借助 redirect 来实现路由刷新，其核心原理是通过临时跳转到一个中间路由（/redirect 开头的路由），然后再重新回到原本的路由，这样就能触发路由的重新加载，从而实现刷新的效果。
/** 刷新路由 */
function onFresh() {
  const { fullPath, query } = unref(route)
  router.replace({
    path: '/redirect' + fullPath,
    query
  })
  handleAliveRoute(route as ToRouteType, 'refresh')
}
// selectRoute表示要操作的路由信息
function onClickDrop(key, item, selectRoute?: RouteConfigs) {
  if (item && item.disabled) return

  //当前要操作的路由
  let selectTagRoute
  if (selectRoute) {
    selectTagRoute = {
      path: selectRoute.path,
      meta: selectRoute.meta,
      name: selectRoute.name,
      query: selectRoute?.query,
      params: selectRoute?.params
    }
  } else {
    selectTagRoute = { path: route.path, meta: route.meta }
  }

  switch (key) {
    case 0:
      //刷新路由
      onFresh()
      break
    case 1:
      //关闭当前标签页
      deleteMenu(selectTagRoute)
      break
    case 2:
      //关闭其他标签页
      deleteMenu(selectTagRoute, 'other')
      break
    case 3:
      //关闭所有标签页
      useMultiTagsStore().handleTags('splice', '', {
        startIndex: 1,
        length: multiTags.value.length
      })
      router.push('/' + topPath)
      handleAliveRoute(route as ToRouteType)
      break
  }
}
//右侧功能按钮实现
function handleCommand(command: any) {
  const { key, item } = command
  onClickDrop(key, item)
}

//点击导航后，动态添加标签
function dynamicRouteTag(value: string): void {
  const hasValue = multiTags.value.some(item => {
    return item.path === value
  })

  function concatPath(arr: object[], value: string) {
    if (!hasValue) {
      arr.forEach((arrItem: any) => {
        if (arrItem.path === value.slice(1)) {
          console.log('动态添加标签', value)
          useMultiTagsStore().handleTags('push', {
            path: value,
            meta: arrItem.meta,
            name: arrItem.name
          })
        } else {
          if (arrItem.children && arrItem.children.length > 0) {
            concatPath(arrItem.children, value)
          }
        }
      })
    }
  }
  concatPath(router.options.routes as any, value)
}

//  接收侧边栏切换传递过来的参数
emitter.on('changLayoutRoute', indexPath => {
  dynamicRouteTag(indexPath)
})

//监听路由，更新activeIndex，并调整标签页布局
watch(
  [route],
  () => {
    activeIndex.value = -1
    dynamicTagView()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  emitter.off('changLayoutRoute')
})
</script>
<style lang="scss" scoped>
@import url('./index.scss');
</style>
