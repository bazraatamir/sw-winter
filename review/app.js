const express = require("express");
const app = express()
const todoRouter = require("./routes/todoRouter")



app.use(express.json())



app.use("/api/todo",todoRouter)



// app.get("/listen",(req,res)=>{
//     res.json({
//        status:200,
//        message:"жагсаалтуудыг амжилтай илгээлээ"
//     })
// })

// app.post("/addList",(req,res)=>{
//     console.log(req.body)
//     res.json({
//        status:200,
//        message:"мэдээлэл амжилтай нэмэгдлээ"
//     })
// })

app.listen(3000,()=>{
    console.log("listen 3000 port")
})