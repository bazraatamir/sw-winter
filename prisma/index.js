import express from "express";
import prisma from "./lib/prisma.js";

const app = express();

app.listen(3000, () => {
  console.log("server listen 300 port");
});
