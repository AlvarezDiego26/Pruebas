// pages/api/rooms/[id]/availability.ts
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { withErrorHandler } from "../../../../lib/errorHandler";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const roomId = Number(req.query.id);
  if (!Number.isFinite(roomId)) {
    return res.status(400).json({ error: "Invalid room ID" });
  }

  const now = new Date();

  // Buscar reservas que bloqueen la habitación
  const reservations = await prisma.reservation.findMany({
    where: {
      roomId,
      status: { in: ["CONFIRMED", "PENDING"] },
      OR: [
        { status: "CONFIRMED" }, // siempre ocupadas
        { status: "PENDING", holdExpiresAt: { gt: now } }, // solo PENDING vigente
      ],
    },
    select: {
      startDate: true,
      endDate: true,
    },
  });

  // Retornar las fechas ocupadas
  return res.status(200).json(reservations);
}

export default withErrorHandler(handler);
