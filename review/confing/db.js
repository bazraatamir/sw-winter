const mysql=require("mysql2/promise");

const db =async()=>{
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        database: 'test',
        password:"bazarragchaa89@"
    });
}

module.exports = db

// const a = (arg1,arg2)=>{

// }

// a(1,2)

// const a = [5]
// let a = 6