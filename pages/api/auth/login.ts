import { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import prisma from "../../../lib/prisma";
import { signToken } from "../../../lib/auth";
import { logAction } from "../../../lib/logger";
import { checkRateLimit } from "../../../lib/rateLimiter";
import { withErrorHandler } from "../../../lib/errorHandler";

export default withErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Manejo de CORS / preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Rate limiting
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  if (!checkRateLimit(String(ip))) {
    res.status(429).json({ error: "Too many requests. Please try again later." });
    return;
  }

  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Missing fields" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken({ id: user.id, role: user.role });

  // Log de login
  await logAction(user.id, "User logged in");

  res.status(200).json({
    user: { id: user.id, email: user.email, role: user.role },
    token,
  });
});
