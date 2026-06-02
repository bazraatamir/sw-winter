const db = require("../confing/db")
const addList = async (req,res)=>{
    const {title,description}=req.body
    const connection = await db()
    await connection.execute()
    res.json({
       status:200,
       message:"мэдээлэл амжилтай нэмэгдлээ"
    })
}

module.exports={
    addList
}


// arr=[1,2,3]
// const [a,b,c]=arr

// obj={name:"test",age:18}
// const {name,age}=obj