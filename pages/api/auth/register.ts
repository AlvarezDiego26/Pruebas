import { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import prisma from "../../../lib/prisma";
import { signToken } from "../../../lib/auth";
import { withErrorHandler, throwError } from "../../../lib/errorHandler";

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

  const { email, password, name, role } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  // Validación de email
  const emailRegex = /^[\w.-]+@([\w-]+\.)+[\w-]{2,4}$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: "Invalid email format" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const [firstName, ...rest] = name.split(" ");
  const lastName = rest.join(" ");

  const user = await prisma.user.create({
    data: { email, password: hashed, firstName, lastName, role: role || "CLIENT" },
  });

  const token = signToken({ id: user.id, role: user.role });

  res.status(201).json({
    user: { id: user.id, email: user.email, role: user.role },
    token,
  });
});
