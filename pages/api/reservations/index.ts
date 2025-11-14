import { NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { requireAuth, AuthRequest } from "../../../lib/middleware";
import { withErrorHandler, throwError } from "../../../lib/errorHandler";
import { logAction } from "../../../lib/logger";
import { paginate } from "../../../lib/pagination";
import { Prisma } from "@prisma/client";

const HOLD_MINUTES = 15;

async function handler(req: AuthRequest, res: NextApiResponse) {
  // 🔹 Evitar caché en cualquier respuesta (para panel admin)
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  // === GET ===
  if (req.method === "GET") {
    const { page = "1", limit = "10", status } = req.query;

    // ✅ Evitar errores de tipo (string | string[])
    const pageValue = Array.isArray(page) ? page[0] : page;
    const limitValue = Array.isArray(limit) ? limit[0] : limit;
    const statusValue = Array.isArray(status) ? status[0] : status;

    const where: any = req.user?.role === "CLIENT" ? { userId: req.user.id } : {};
    if (statusValue) where.status = String(statusValue);

    const result = await paginate({
      model: "reservation",
      where,
      include: {
        room: { include: { hotel: true } },
        payment: true,
        // 🔹 Agregamos también el usuario para mostrar en panel admin
        user: true,
      },
      page: Number(pageValue),
      limit: Number(limitValue),
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(result);
  }

  // === POST ===
  if (req.method === "POST") {
    const { roomId, startDate, endDate, totalAmount } = req.body;
    if (!roomId || !startDate || !endDate) throwError(400, "Missing required fields");

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()))
      throwError(400, "Invalid date format");
    if (start >= end) throwError(400, "Start date must be before end date");

    const room = await prisma.room.findUnique({ where: { id: Number(roomId) } });
    if (!room) throwError(404, "Room not found");

    const now = new Date();
    const overlap = await prisma.reservation.findFirst({
      where: {
        roomId: Number(roomId),
        status: { in: ["PENDING", "CONFIRMED"] },
        startDate: { lte: end },
        endDate: { gte: start },
        OR: [{ holdExpiresAt: null }, { holdExpiresAt: { gt: now } }],
      },
    });

    if (overlap) throwError(409, "Room not available for the selected dates");

    const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);

    const reservation = await prisma.reservation.create({
      data: {
        userId: req.user!.id,
        roomId: Number(roomId),
        startDate: start,
        endDate: end,
        status: "PENDING",
        totalAmount: totalAmount
          ? new Prisma.Decimal(totalAmount)
          : new Prisma.Decimal(room.price),
        holdExpiresAt,
      },
    });

    await logAction(req.user!.id, `Reservation created (PENDING) for room ${roomId}`);

    return res.status(201).json({
      reservation,
      holdExpiresAt,
      message: `Hold active for ${HOLD_MINUTES} minutes.`,
    });
  }

  throwError(405, "Method not allowed");
}

export default requireAuth(
  withErrorHandler(handler),
  ["CLIENT", "ADMIN", "SUPERADMIN"]
);
