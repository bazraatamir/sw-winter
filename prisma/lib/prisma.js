import dotenv from "dotenv";
import path from "path"
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.js";

dotenv.config({path:path.resolve(__dirname,"../.env")})
const adapter = new PrismaMariaDb({
  host:"localhost",
  user:"root",
  password:"Bazarragchaa89@",
  database:"sarchin" , 
  connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

export {prisma} ;