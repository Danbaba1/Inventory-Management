import express from "express";
const app = express();
import { DB } from "./db.js";

DB();

app.listen("3000", () => {
  console.log("server is running");
});
