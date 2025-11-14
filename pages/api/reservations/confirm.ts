// pages/api/reservations/confirm.ts
import { NextApiResponse } from "next";
import { Prisma } from "@prisma/client";
import prisma from "../../../lib/prisma";
import { requireAuth, AuthRequest } from "../../../lib/middleware";
import { withErrorHandler, throwError } from "../../../lib/errorHandler";
import { logAction } from "../../../lib/logger";

async function handler(req: AuthRequest, res: NextApiResponse) {
  if (req.method !== "POST") throwError(405, "Method not allowed");

  const { reservationId, paymentMethod } = req.body;
  if (!reservationId || !paymentMethod)
    throwError(400, "Missing required fields");

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id: Number(reservationId) },
    });
    if (!reservation) throw { status: 404, message: "Reservation not found" };
    if (reservation.status !== "PENDING")
      throw { status: 400, message: "Reservation not pending" };

    if (reservation.holdExpiresAt && reservation.holdExpiresAt < now)
      throw { status: 410, message: "Hold expired" };

    const updated = await tx.reservation.update({
      where: { id: reservation.id },
      data: { status: "CONFIRMED" },
    });

    const payment = await tx.payment.create({
      data: {
        reservationId: reservation.id,
        amount: reservation.totalAmount ?? new Prisma.Decimal(0),
        method: paymentMethod,
        status: "COMPLETED",
      },
    });

    await logAction(req.user!.id, `Confirmed reservation ${reservationId}`);
    return { updated, payment };
  });

  return res.status(200).json(result);
}

export default requireAuth(
  withErrorHandler(handler),
  ["CLIENT", "ADMIN", "SUPERADMIN"]
);
