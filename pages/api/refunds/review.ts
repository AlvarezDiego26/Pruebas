// pages/api/refunds/review.ts
import { NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { requireAuth, AuthRequest } from "../../../lib/middleware";
import { withErrorHandler, throwError } from "../../../lib/errorHandler";
import { logAction } from "../../../lib/logger";

async function handler(req: AuthRequest, res: NextApiResponse) {
  if (req.method !== "POST") throwError(405, "Method not allowed");

  const { refundRequestId, approve } = req.body;
  if (!refundRequestId || typeof approve !== "boolean")
    throwError(400, "Missing required fields");

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const refund = await tx.refundRequest.findUnique({
      where: { id: Number(refundRequestId) },
      include: { reservation: { include: { payment: true } }, user: true },
    });

    if (!refund) throw { status: 404, message: "Refund request not found" };
    if (refund.status !== "PENDING") throw { status: 400, message: "Refund already processed" };

    if (approve) {
      // Si hay un pago COMPLETED, marcar como REFUNDED
      if (refund.reservation.payment?.status === "COMPLETED") {
        await tx.payment.update({
          where: { id: refund.reservation.payment.id },
          data: {
            status: "REFUNDED",
            refundedAt: now,
            refundAmount: refund.reservation.payment.amount,
          },
        });
      }

      // Actualizar refundRequest como APPROVED
      await tx.refundRequest.update({
        where: { id: refund.id },
        data: {
          status: "APPROVED",
          reviewedAt: now,
          reviewedById: req.user!.id,
        },
      });

      // Ya que aprobamos el reembolso, dejamos la reserva CANCELLED (o se podría marcar REFUNDED)
      await tx.reservation.update({
        where: { id: refund.reservationId },
        data: { status: "CANCELLED" },
      });
    } else {
      // Rechazar: marcamos REJECTED y restauramos la reserva a CONFIRMED si tenía pago
      await tx.refundRequest.update({
        where: { id: refund.id },
        data: {
          status: "REJECTED",
          reviewedAt: now,
          reviewedById: req.user!.id,
        },
      });

      // Restaurar la reserva a CONFIRMED (si estaba confirmada antes)
      await tx.reservation.update({
        where: { id: refund.reservationId },
        data: { status: "CONFIRMED" },
      });
    }

    await logAction(req.user!.id, `${approve ? "Approved" : "Rejected"} refund ${refundRequestId}`);

    return { message: approve ? "Refund approved" : "Refund rejected" };
  });

  return res.status(200).json(result);
}

export default requireAuth(withErrorHandler(handler), ["ADMIN", "SUPERADMIN"]);
