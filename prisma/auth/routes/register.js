import {register} from "../controllers/register.js";
import express from "express";

const router = express.Router();

router.post("/register", register);

export {router};
