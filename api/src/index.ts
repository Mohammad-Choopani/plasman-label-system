import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routes/auth.routes";
import stationRouter from "./routes/station.routes";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    ok: true,
    service: "plasman-label-system-api",
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRouter);
app.use("/api/station", stationRouter);

app.listen(PORT, () => {
  console.log(`API is running on http://localhost:${PORT}`);
});