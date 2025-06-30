import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const app = express()

// 允许跨域
app.use(cors());
//定义multer的存储引擎,diskStorage用于将上传的文件存储到本地磁盘而不是内存
const storage=multer.diskStorage({
    destination:function(req,file,cb){
        fs.mkdirSync(`uploads/${req.body.hash}`,{recursive:true}) //创建目录
        cb(null,`uploads/${req.body.hash}/`) //回调函数，第一个参数是错误对象，第二个参数是存储路径
    },
    filename:function(req,file,cb){
        cb(null,`${req.body.filename}-${req.body.index}`)
    }
})

//创建multer实例
const upload=multer({storage})

//处理文件上传路由,upload.single('file')上传文件到指定路径，file对应formData中的file字段名
app.post('/upload',upload.single('file'),(req,res)=>{
    res.json({
        message: 'File uploaded successfully',
        success: true
    })
})

//处理文件合并路由
app.post('/merge',async(req,res)=>{
    const {hash,filename}=req.query
    
    //获取文件分片的列表
    const files=fs.readdirSync(`uploads/${hash}`)
    files.sort((a,b)=>{
        return a.split('-')[1]-b.split('-')[1]
    })
    //创建写入流，合并文件
    const writePath=path.join(__dirname,hash)
    fs.mkdirSync(writePath,{recursive:true})//创建目标目录
    const writeStream=fs.createWriteStream(path.join(writePath,filename))
    for(const file of files){
        await new Promise((resolve,reject)=>{
            const readStream=fs.createReadStream(path.join(__dirname,`uploads/${hash}`,file))
            readStream.pipe(writeStream,{end:false}) //将读取的文件流写入到目标文件中,end:false表示读取结束后取消自动关闭写入流
            //读完后删除分片
            readStream.on('end',()=>{
                fs.unlinkSync(path.join(__dirname,`uploads/${hash}`,file)) //删除分片文件
                resolve()
            })
            readStream.on('error',err=>{
                reject(err)
            })
        })
    }
    writeStream.end() //结束写入流
    res.json({
        message: 'File merged successfully',
        success: true
    })
})

//处理文件是否存在路由
app.get('/verify',(req,res)=>{
    const {hash,filename}=req.query
    const filePath=path.join(__dirname,hash,filename)
    //检查文件是否存在
    if(fs.existsSync(filePath)){
        return res.json({
            exists: true,
            message: 'File exists'
        })
    }
    //如果完整文件不存在，查找分片文件是否存在
    const isChunksExists=fs.existsSync(path.join(__dirname,`uploads/${hash}`))
    if(!isChunksExists){
        //不存在初始化files为空数组
        return res.json({
            exists: false,
            files:[]
        })
    }
    //获取分片文件列表
    const files=fs.readdirSync(path.join(__dirname,`uploads/${hash}`))
    return res.json({
        exists: false,
        files
    })
})

app.listen(3000,()=>{
    console.log('Server is running on http://localhost:3000')
});