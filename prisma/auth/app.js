import express from "express";
import {router as registerRouter} from "./routes/register.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({status: "ok", service: "auth"});
});

app.use("/api/v1/auth", registerRouter);

app.listen(3001, () => {
  console.log("Auth server listening on port 3001");
});
