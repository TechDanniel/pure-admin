<template>
    <div>
        <!-- 工具栏 -->
        <div class="absolute top-0 right-2 p-2 flex items-center gap-2">
            <div ref="upload" @click='handleUpload("上传文件")' class="relative w-10 h-10 flex justify-center items-center">
                <svg class="absolute left-0 top-0"  width="40" height="40">
                    <circle
                        cx="20"
                        cy="20"
                        r="18"
                        :stroke="'#409EFF'"
                        stroke-width="4"
                        fill="none"
                        :stroke-dasharray="2*Math.PI*18"
                        :stroke-dashoffset="2*Math.PI*18*(1-progress/100)"
                        :style="{ transition: 'stroke-dashoffset 0.3s' }"
                    />
                </svg>
                <IconifyIconOnline icon="ep:upload-filled" class="text-2xl cursor-pointer z-10" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { IconifyIconOnline } from '@/components/ReIcon';
import { handleUpload,progress } from './hook';
</script>