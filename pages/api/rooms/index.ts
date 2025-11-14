// pages/api/rooms/index.ts
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { requireAuth, AuthRequest } from "../../../lib/middleware";
import { paginate } from "../../../lib/pagination";
import { Prisma } from "@prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // === OBTENER HABITACIONES ===
  if (req.method === "GET") {
    const { hotelId, page = "1", limit = "10" } = req.query;

    const pageValue = Array.isArray(page) ? page[0] : page;
    const limitValue = Array.isArray(limit) ? limit[0] : limit;
    const hotelValue = Array.isArray(hotelId) ? hotelId[0] : hotelId;

    const where = hotelValue ? { hotelId: Number(hotelValue) } : {};

    const result = await paginate({
      model: "room",
      where,
      include: { hotel: true },
      page: pageValue,
      limit: limitValue,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(result);
  }

  // === CREAR HABITACIÓN ===
  if (req.method === "POST") {
    const protectedHandler = requireAuth(
      async (reqAuth: AuthRequest, resAuth: NextApiResponse) => {
        const { hotelId, number, type, price, capacity, status } = reqAuth.body;

        if (!hotelId || !number || !type || !price)
          return resAuth.status(400).json({ error: "Missing fields" });

        const room = await prisma.room.create({
          data: {
            hotelId: Number(hotelId),
            number: String(number),
            type,
            price: new Prisma.Decimal(price),
            capacity: Number(capacity || 1),
            status: status || "AVAILABLE",
          },
        });

        return resAuth.status(201).json(room);
      },
      ["ADMIN", "SUPERADMIN"]
    );

    return protectedHandler(req as AuthRequest, res);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
