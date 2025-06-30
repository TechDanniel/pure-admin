<template>
  <div :class="['flex']">
    <div style="width: 100%">
      <!-- 搜索表单 -->
      <el-form
        ref="formRef"
        :inline="true"
        :model="form"
        class="search-form bg-bg_color w-[99/100] pl-8 pt-[12px] overflow-auto"
      >
        <el-form-item label="用户名称：" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名称" clearable class="!w-[180px]" />
        </el-form-item>
        <el-form-item label="手机号码：" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号码" clearable class="!w-[180px]" />
        </el-form-item>
        <el-form-item label="部门名称：" prop="name">
          <el-input v-model="form.deptname" placeholder="请输入部门名称" clearable class="!w-[180px]" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="useRenderIcon('ri:search-line')" :loading="loading" @click="onSearch">
            搜索
          </el-button>
          <el-button :icon="useRenderIcon(Refresh)" @click="resetForm(formRef)"> 重置 </el-button>
        </el-form-item>
      </el-form>
      <!-- 表格 -->
      <ReTable title="用户权限" :columns="columns" @refresh="onSearch">
        <template #buttons>
          <el-button type="primary" :icon="useRenderIcon(AddFill)" @click="openDialog()"> 新增用户 </el-button>
        </template>
        <template v-slot="{ size, dynamicColumns }">
          <el-table :data="dataList" height="250" style="width: 100%" ref="tableRef">
            <el-table-column
              v-for="column in dynamicColumns"
              :key="column.prop"
              :prop="column.prop"
              :label="column.label"
              :type="column.type"
              align="center"
              :formatter="column.formatter"
            >
              <template v-if="column.prop === 'role'" #default="{ row }">
                <el-select v-model="row.role" class="!w-[160px]" @change="value => onChange(value, row)">
                  <el-option v-for="item in options" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
              </template>
              <template v-else #default="scope">
                <!-- 处理嵌套属性，如 dept.name -->
                {{ getNestedValue(scope.row, column.prop) }}
              </template>
            </el-table-column>
            <el-table-column fixed="right" label="Operations" min-width="120">
              <template #default="{ row }">
                <el-button
                  class="reset-margin"
                  link
                  type="primary"
                  :size="size"
                  :icon="useRenderIcon(EditPen)"
                  @click="openDialog('修改', row)"
                >
                  修改
                </el-button>
                <el-popconfirm :title="`是否确认删除用户编号为${row.id}的这条数据`" @confirm="handleDelete(row)">
                  <template #reference>
                    <el-button class="reset-margin" link type="primary" :size="size" :icon="useRenderIcon(Delete)">
                      删除
                    </el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
        </template>
      </ReTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRenderIcon } from '@/components/ReIcon/src/hooks'
import { ref, onMounted } from 'vue'
import { handleTree } from '@/utils/tree'
import { getDeptList } from '@/http/api/system'
import { useUserStore } from '@/store/modules/user.ts'
import { initRouter } from '@/router/utils'
import { usePermissionStore } from '@/store/modules/permission.ts'

import Delete from '@iconify-icons/ep/delete'
import EditPen from '@iconify-icons/ep/edit-pen'
import Refresh from '@iconify-icons/ep/refresh'
import AddFill from '@iconify-icons/ri/add-circle-line'

import {
  form,
  loading,
  onSearch,
  dataList,
  resetForm,
  columns,
  openDialog,
  handleDelete,
  higherDeptOptions
} from './hook.ts'
import router from '@/router/index.ts'
import ReactiveStorage from '@/utils/ReactiveStorage.ts'

//表单实例
const formRef = ref()

const options = [
  {
    value: 'admin',
    label: '管理员角色'
  },
  {
    value: 'common',
    label: '普通角色'
  }
]

//辅助函数，用于获取嵌套函数的值
function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj)
}

function onChange(value, row) {
  console.log(value, row)
  if (row.username === useUserStore().nickname) {
    ReactiveStorage.clear()
    usePermissionStore().clearAllCachePage()
    useUserStore()
      .loginByUsername({ username: useUserStore().username, password: 'admin123', roles: [value] })
      .then(res => {
        if (res.success) {
          return initRouter().then(() => {
            router.push('/').then(() => {
              window.location.reload()
            })
          })
        }
      })
  }
}

onMounted(async () => {
  onSearch()
  // 归属部门
  const { data } = await getDeptList()
  console.log("部门信息",data)
  higherDeptOptions.value = handleTree(data)
})
</script>
