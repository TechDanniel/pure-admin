import SparkMD5 from "spark-md5";

self.onmessage=function(e){
    const {filename,tasks}=e.data
    let currentChunk = 0,
    spark = new SparkMD5.ArrayBuffer()
    function loadNext(){
        const reader=new FileReader()
        reader.onload=function(e){
            spark.append(e.target.result) //将读取的文件内容添加到SparkMD5实例中
            currentChunk++
            if(currentChunk<tasks.length){
                loadNext() //继续读取下一个分片
            }else{
                const hash=spark.end() //计算文件的MD5哈希值
                self.postMessage({
                    hash,
                    filename,
                    tasks
                })
            }
        }
        reader.readAsArrayBuffer(tasks[currentChunk]) //读取当前分片的内容
    }
    loadNext()
}