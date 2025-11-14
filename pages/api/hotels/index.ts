// pages/api/hotels/index.ts
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { requireAuth, AuthRequest } from "../../../lib/middleware";
import { logAction } from "../../../lib/logger";
import { paginate } from "../../../lib/pagination";

const VALID_ROOM_TYPES = ["SINGLE", "DOUBLE", "SUITE", "FAMILY"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const { city, district, stars, type, minPrice, maxPrice, page = "1", limit = "10" } = req.query;

    const pageValue = Number(Array.isArray(page) ? page[0] : page);
    const limitValue = Number(Array.isArray(limit) ? limit[0] : limit);

    const where: any = {};

    // Filtros básicos
    if (city && city !== "") where.city = Array.isArray(city) ? city[0] : city;
    if (district && district !== "") where.district = Array.isArray(district) ? district[0] : district;
    if (stars && stars !== "") where.stars = Number(Array.isArray(stars) ? stars[0] : stars);

    // Filtro seguro por tipo de habitación
    if (type && type !== "" && VALID_ROOM_TYPES.includes(String(type))) {
      where.rooms = { some: { type: String(type) } };
    }

    // Filtro por rango de precios
    const priceFilter: any = {};
    if (minPrice && minPrice !== "") priceFilter.gte = Number(minPrice);
    if (maxPrice && maxPrice !== "") priceFilter.lte = Number(maxPrice);

    if (Object.keys(priceFilter).length > 0) {
      where.rooms = where.rooms || {};
      where.rooms.some = { ...where.rooms.some, price: priceFilter };
    }

    try {
      const result = await paginate({
        model: "hotel",
        where,
        include: { rooms: true },
        page: pageValue,
        limit: limitValue,
        orderBy: { createdAt: "desc" },
      });

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Error fetching hotels:", error);
      return res.status(500).json({ error: "Error al cargar los hoteles" });
    }
  }

  if (req.method === "POST") {
    const protectedHandler = requireAuth(
      async (reqAuth: AuthRequest, resAuth: NextApiResponse) => {
        const { name, address, city, country, description } = reqAuth.body;
        if (!name || !address || !city || !country)
          return resAuth.status(400).json({ error: "Missing fields" });

        const hotel = await prisma.hotel.create({
          data: { name, address, city, country, description },
        });

        await logAction(reqAuth.user!.id, `Hotel created: ${hotel.name}`);
        return resAuth.status(201).json(hotel);
      },
      ["ADMIN", "SUPERADMIN"]
    );

    return protectedHandler(req as AuthRequest, res);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
