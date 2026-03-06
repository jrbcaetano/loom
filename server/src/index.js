import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

app.use(cors({ origin: clientOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "loom-server" });
});

app.get("/api/message", (_req, res) => {
  res.json({
    message: "Loom v1 server is running.",
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
