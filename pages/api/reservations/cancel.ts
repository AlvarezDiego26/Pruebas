// pages/api/reservations/cancel.ts
import { NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { requireAuth, AuthRequest } from "../../../lib/middleware";
import { withErrorHandler, throwError } from "../../../lib/errorHandler";
import { logAction } from "../../../lib/logger";

async function handler(req: AuthRequest, res: NextApiResponse) {
  if (req.method !== "POST") throwError(405, "Method not allowed");

  const { reservationId, reason } = req.body;
  if (!reservationId) throwError(400, "Missing reservationId");

  const result = await prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id: Number(reservationId) },
      include: { payment: true },
    });

    if (!reservation) throw { status: 404, message: "Reservation not found" };

    // Solo el usuario dueño o admin puede solicitar
    if (req.user!.role === "CLIENT" && reservation.userId !== req.user!.id)
      throw { status: 403, message: "Forbidden" };

    if (!["PENDING", "CONFIRMED"].includes(reservation.status))
      throw { status: 400, message: "Reservation cannot be cancelled" };

    // Upsert: si ya existe una solicitud la actualizamos; sino la creamos
    const refundRequest = await tx.refundRequest.upsert({
      where: { reservationId: reservation.id },
      update: {
        reason: reason ?? undefined,
        status: "PENDING",
        createdAt: new Date(),
        reviewedAt: null,
        reviewedById: null,
      },
      create: {
        reservationId: reservation.id,
        userId: req.user!.id,
        reason: reason ?? undefined,
        status: "PENDING",
      },
    });

    // Marcamos la reserva como CANCELLED (temporal) para no dejarla activa
    // (opción: mantener PENDING -> pero aquí la cancelamos y admin decidirá reactivar si rechaza)
    const cancelled = await tx.reservation.update({
      where: { id: reservation.id },
      data: { status: "CANCELLED" },
    });

    await logAction(req.user!.id, `Refund request created for reservation ${reservationId}`);

    return { cancelled, refundRequest };
  });

  return res.status(200).json(result);
}

export default requireAuth(withErrorHandler(handler), ["CLIENT", "ADMIN", "SUPERADMIN"]);
