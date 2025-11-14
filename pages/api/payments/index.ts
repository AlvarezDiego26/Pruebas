import { NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { requireAuth, AuthRequest } from "../../../lib/middleware";
import { withErrorHandler, throwError } from "../../../lib/errorHandler";
import { logAction } from "../../../lib/logger";
import { PrismaClient, Prisma } from "@prisma/client";

async function handler(req: AuthRequest, res: NextApiResponse) {
  // === POST: crear pago ===
  if (req.method === "POST") {
    const { reservationId, amount, method, cardHolder, cardNumber } = req.body;

    if (!reservationId || !amount || !method)
      throwError(400, "Missing required payment fields");

    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(reservationId) },
    });
    if (!reservation) throwError(404, "Reservation not found");

    // Crear pago PENDING
    const payment = await prisma.payment.create({
      data: {
        reservation: { connect: { id: Number(reservationId) } },
        amount: new Prisma.Decimal(amount),
        method,
        status: "PENDING",
        cardHolder,
        cardNumber: cardNumber ? `**** **** **** ${cardNumber.slice(-4)}` : null,
      },
    });

    // Simular demora del pago (1 segundo)
    await new Promise((r) => setTimeout(r, 1000));

    // Confirmar pago
    const completed = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "COMPLETED" },
    });

    // Marcar reserva como CONFIRMED
    await prisma.reservation.update({
      where: { id: Number(reservationId) },
      data: { status: "CONFIRMED" },
    });

    await logAction(req.user!.id, `Payment completed for reservation ${reservationId}`);
    return res.status(201).json(completed);
  }

  // === GET: listar pagos (solo admin/superadmin) ===
  if (req.method === "GET") {
    if (!["ADMIN", "SUPERADMIN"].includes(req.user!.role)) {
      throwError(403, "Forbidden: insufficient role");
    }

    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      include: { reservation: true },
    });

    return res.status(200).json(payments);
  }

  throwError(405, "Method not allowed");
}

export default requireAuth(withErrorHandler(handler), ["CLIENT", "ADMIN", "SUPERADMIN"]);
