<template>
  <div>
    <el-row :gutter="24" justify="space-around">
      <el-col
        v-for="(item, index) in charData"
        :key="index"
        class="mb-[18px]"
        :span="6"
        v-motion
        :initial="{
          opacity: 0,
          y: 100
        }"
        :enter="{
          opacity: 1,
          y: 0,
          transition: {
            delay: 480
          }
        }"
      >
        <el-card shadow="never" class="line-card">
          <!-- 卡片标题和图标 -->
          <div class="flex justify-between">
            <span class="font-medium text-md">{{ item.name }}</span>
            <div
              class="w-8 h-8 flex justify-center items-center rounded-md"
              :style="{
                backgroundColor: item.bgColor
              }"
            >
              <IconifyIconOffline :icon="item.icon" :color="item.color" width="18" />
            </div>
          </div>
          <!-- 数字，百分比和折线图 -->
          <div class="flex justify-between items-start mt-3">
            <!-- 宽度为容器的1/2 -->
            <div class="w-1/2">
              <ReNormalCountTo :duration="item.duration" :fontSize="'1.6em'" :startVal="100" :endVal="item.value" />
            </div>
            <p class="font-medium text-green-500">{{ item.percent }}</p>
          </div>
          <CharLine class="!w-1/2" :color="item.color" :data="item.data" />
        </el-card>
      </el-col>

      <el-col
        v-motion
        class="mb-[18px]"
        :span="18"
        :initial="{
          opacity: 0,
          y: 100
        }"
        :enter="{
          opacity: 1,
          y: 0,
          transition: {
            delay: 400
          }
        }"
      >
        <el-card class="bar-card" shadow="never">
          <div class="flex justify-between">
            <span class="text-md font-medium">分析概览</span>
            <Segmented v-model="curWeek" :options="optionsBasis" />
          </div>
          <div class="flex justify-between items-start mt-3">
            <ChartBar
              :requireData="barChartData[curWeek].requireData"
              :questionData="barChartData[curWeek].questionData"
            />
          </div>
        </el-card>
      </el-col>

      <el-col
        v-motion
        class="mb-[18px]"
        :span="6"
        :initial="{
          opacity: 0,
          y: 100
        }"
        :enter="{
          opacity: 1,
          y: 0,
          transition: {
            delay: 480
          }
        }"
      >
        <el-card shadow="never">
          <div class="flex justify-between">
            <span class="text-md font-medium">解决概率</span>
          </div>
          <div
            v-for="(item, index) in progressData"
            :key="index"
            :class="['flex', 'justify-between', 'items-start', index === 0 ? 'mt-8' : 'mt-[2.15rem]']"
          >
            <el-progress
              :text-inside="true"
              :percentage="item.percentage"
              :stroke-width="21"
              :color="item.color"
              striped
              striped-flow
              :duration="item.duration"
            />
            <span class="text-nowrap ml-2 text-text_color_regular text-sm">
              {{ item.week }}
            </span>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { IconifyIconOffline } from '@/components/ReIcon/index'
import CharLine from './components/charts/ChartLine.vue'
import ChartBar from './components/charts/ChartBar.vue'
import { ReNormalCountTo } from '@/components/ReCountTo'
import { charData, progressData, barChartData } from './data'
import { ref } from 'vue'
import { OptionsType } from './type'
import Segmented from '@/components/ReSegment/index.vue'

defineOptions({
  name: 'welcome'
})

let curWeek = ref(1) // 0上周、1本周
const optionsBasis: Array<OptionsType> = [
  {
    label: '上周'
  },
  {
    label: '本周'
  }
]
</script>

<style lang="scss" scoped>
:deep(.el-card) {
  --el-card-border-color: none;

  /* 解决概率进度条宽度 */
  .el-progress--line {
    width: 85%;
  }

  /* 解决概率进度条字体大小 */
  .el-progress-bar__innerText {
    font-size: 15px;
  }

  /* 隐藏 el-scrollbar 滚动条 */
  .el-scrollbar__bar {
    display: none;
  }

  /* el-timeline 每一项上下、左右边距 */
  .el-timeline-item {
    margin: 0 6px;
  }
}

.main-content {
  margin: 20px 20px 0 !important;
}
</style>
