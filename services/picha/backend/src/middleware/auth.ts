import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// JWT_SECRET is validated at startup in server.ts — guaranteed to be set
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const DEMO_MODE = process.env.DEMO_MODE === "true";

const DEMO_USER = { username: "Nano", role: "Pathologist" };

export interface AuthPayload {
  username: string;
  role: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Demo mode — skip auth entirely, attach mock user
  if (DEMO_MODE) {
    (req as any).user = DEMO_USER;
    next();
    return;
  }

  // Accept token from cookie OR Authorization header
  const token =
    req.cookies?.picha_session ??
    req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}
