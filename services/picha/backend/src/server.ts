import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";

import { globalLimiter } from "./middleware/rateLimiter";
import authRoutes from "./routes/auth";
import patientRoutes from "./routes/patients";
import auditRoutes from "./routes/audit";
import analysisRoutes from "./routes/analysis";
import { initDB } from "./db";
import logger from "./logger";

// ── Environment validation ────────────────────────────────────────────────────
const REQUIRED_ENV = ["JWT_SECRET", "DATABASE_URL"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[FATAL] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}
if (process.env.JWT_SECRET === "dev-secret-change-in-production") {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "[FATAL] JWT_SECRET is set to the default dev value in production. Set a strong secret in .env",
    );
    process.exit(1);
  } else {
    console.warn(
      "[WARN] Using insecure dev JWT_SECRET. Set JWT_SECRET in .env before deploying.",
    );
  }
}

const app = express();
const PORT = Number(process.env.BACKEND_PORT ?? process.env.PORT ?? 3005);

// ── Security ───────────────────────────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = [
  "http://localhost:3003",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(globalLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/analysis", analysisRoutes); // proxies to ai-service

app.get("/health", (_req, res) => res.json({ status: "ok", port: PORT }));

// ── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await initDB();
    app.listen(PORT, () => {
      logger.info(`PICHA Backend running on port ${PORT}`);
    });
  } catch (err) {
    logger.error("Failed to start server", { err });
    process.exit(1);
  }
}

start();
