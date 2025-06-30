<template>
   <div>
    <input type="file" ref="fileInput">
    <el-button type="primary" plain @click="handleUpload">上传文件</el-button>
   <div>
   </div>
   </div> 
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { isCancel,progress } from './hook';

//分片大小
const chunkSize=1024*1024*1 //1MB
const fileInput=ref<HTMLInputElement | null>(null);

//为文件生成hash值
const worker=new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });


function handleUpload(){
   isCancel.value=false;//重置取消状态
   const file=fileInput.value?.files[0]
   if(!file){
      alert('请选择文件')
      return
   }
   const total=Math.ceil(file.size/chunkSize) //分片总数
   const tasks=Array.from({length:total},(_,i)=>{
      return file.slice(i*chunkSize,(i+1)*chunkSize)
   })
   worker.postMessage({
      filename:file.name,
      tasks
   })
}

//监听worker消息
worker.onmessage=async function(event){
   const {filename,hash,tasks}=event.data
   //验证后端是否存在该文件,fetch返回的是响应消息（promise类型），需要json解析得到数据消息
   const response=await fetch(`/api/verify?filename=${filename}&hash=${hash}`)
   const resJson=await response.json();
   if(resJson.exists){
      alert('文件已存在')
      return
   }
   //获得已上传的分片
   const uploadedChunks=resJson.uploadedChunks || [];
   //过滤出未上传的分片
   const remainingTasks=tasks.map((chunk:Blob,index:number)=>({chunk,index})).filter(({index})=>{
      return !uploadedChunks.includes(`${filename}-${index}`)
   });

   //控制批量上传数量
   const batchSize=3; //每次上传3个分片


   //处理分片为formData格式
   const uploadChunk=async({chunk,index})=>{
      const formData=new FormData()    
      formData.append('filename',filename)
      formData.append('index',index)
      formData.append('hash',hash)
      formData.append('file',chunk)
      return await fetch('/api/upload',{
         method:'Post',
         body:formData
      })
   }

   for(let i=0;i<remainingTasks.length;i+=batchSize){
      if(isCancel.value){
         console.log('上传已取消')
         return
      }
      const batch=remainingTasks.slice(i,i+batchSize)
      const promises=batch.map(task=>{
         return uploadChunk(task)
      })
      try{
         const results=await Promise.all(promises)
         results.forEach((response,index)=>{
            if(response.ok){
               progress.value=(i+index+1)/remainingTasks.length*100; //更新进度
               console.log(`分片${batch[index].index}上传成功`)
            }else{
               console.error(`分片${batch[index].index}上传失败`)
            }
         })
      }catch(error){
         console.error('批量上传失败:',error)
      }
   }
   //上传完成后通知后端合并分片
   await fetch(`/api/merge?filename=${filename}&hash=${hash}`,{method:'POST'}
   )
   console.log('合并成功')
}
</script>