// pages/api/users/index.ts
import { NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { Role } from "@prisma/client";
import { requireAuth, AuthRequest } from "../../../lib/middleware";
import { withErrorHandler, throwError } from "../../../lib/errorHandler";
import { paginate } from "../../../lib/pagination";
import { logAction } from "../../../lib/logger";

async function handler(req: AuthRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const { page = "1", limit = "10", role } = req.query;

    //Aseguramos que page y limit sean strings simples
    const pageValue = Array.isArray(page) ? page[0] : page;
    const limitValue = Array.isArray(limit) ? limit[0] : limit;
    const roleValue = Array.isArray(role) ? role[0] : role;

    const validRoles = ["CLIENT", "ADMIN", "SUPERADMIN"];
    const where =
      roleValue && validRoles.includes(String(roleValue))
        ? { role: roleValue as Role }
        : {};

    // Usa el helper genérico
    const result = await paginate({
      model: "user",
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
      },
      page: pageValue,
      limit: limitValue,
    });

    return res.status(200).json(result);
  }

  if (req.method === "PUT") {
    const { userId, role } = req.body;
    if (!userId || !role) throwError(400, "Missing fields");

    const validRoles = ["CLIENT", "ADMIN", "SUPERADMIN"];
    if (!validRoles.includes(role)) throwError(400, "Invalid role");

    const updatedUser = await prisma.user.update({
      where: { id: Number(userId) },
      data: { role: role as Role },
    });

    await logAction(req.user!.id, `Changed role of user ${userId} to ${role}`);

    return res.status(200).json({ message: "User role updated", user: updatedUser });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default requireAuth(withErrorHandler(handler), ["ADMIN", "SUPERADMIN"]);
