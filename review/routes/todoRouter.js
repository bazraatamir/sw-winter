const express = require("express")
const router = express.Router()
const {addList} = require("../controller/todoController")

router.post("/addlist",addList)
router.get("/")

module.exports = router