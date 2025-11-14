// pages/api/refunds/index.ts
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { requireAuth, AuthRequest } from "../../../lib/middleware";
import { withErrorHandler } from "../../../lib/errorHandler";

async function handler(req: AuthRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Solo ADMIN y SUPERADMIN deberían usar este endpoint, pero requireAuth controla roles
    const refunds = await prisma.refundRequest.findMany({
      include: {
        reservation: { include: { room: { include: { hotel: true } }, payment: true } },
        user: true,
        reviewedBy: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json(refunds);
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default requireAuth(withErrorHandler(handler), ["ADMIN", "SUPERADMIN"]);
