import { h,ref } from 'vue';
import { addDialog } from '@/components/ReDialog';
import uploadForm from './upload.vue';

const isCancel=ref(false)
const progress=ref(0); // 上传进度

function handleUpload(title:string){
    addDialog({
        title: title,
        width: '40%',
        contentRender: () => h(uploadForm),
        //取消上传
        beforeCancel:(done) => {
            isCancel.value = true; // 设置取消状态
            console.log('点击按钮取消上传');
            done(); // 调用 done 以关闭对话框
        }
    })
}

export{
    handleUpload,
    isCancel,
    progress
}