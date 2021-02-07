import cookieParser from "cookie-parser";
import dotent from "dotenv";
import express from "express";
import morgan from "morgan";
import "reflect-metadata";
import { createConnection } from "typeorm";
import trim from "./middleware/trim";
import authRoutes from "./routes/auth";
import postRoutes from "./routes/posts";
import subRoutes from "./routes/subs";

dotent.config();

const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use(morgan("dev"));

app.use(trim);
app.use(cookieParser());

app.get("/", (req, res) => res.send("Hello world"));
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/subs", subRoutes);

app.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);

  try {
    await createConnection();
    console.log("Database connected");
  } catch (error) {
    console.log(error);
  }
});
