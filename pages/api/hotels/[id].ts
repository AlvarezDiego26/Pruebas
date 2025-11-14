// pages/api/hotels/[id].ts
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { requireAuth, AuthRequest } from "../../../lib/middleware";
import { logAction } from "../../../lib/logger";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = Number(req.query.id);

  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "ID inválido" });
  }

  // === GET: Obtener un hotel con sus habitaciones ===
  if (req.method === "GET") {
    try {
      const hotel = await prisma.hotel.findUnique({
        where: { id },
        include: {
          rooms: {
            where: { hotelId: id },
            orderBy: { id: "asc" },
            select: {
              id: true,
              number: true,
              type: true,
              price: true,
              capacity: true,
              status: true,
            },
          },
        },
      });

      if (!hotel) {
        return res.status(404).json({ error: "Hotel no encontrado" });
      }

      const roomsWithAvailability = hotel.rooms.map((room) => ({
        id: room.id,
        name: room.number,
        type: room.type,
        price: Number(room.price),
        capacity: room.capacity,
        available: room.status === "AVAILABLE",
      }));

      return res.status(200).json({
        id: hotel.id,
        name: hotel.name,
        address: hotel.address,
        city: hotel.city,
        district: hotel.district,
        country: hotel.country,
        description: hotel.description,
        stars: hotel.stars ?? null,
        latitude: hotel.latitude ?? null,
        longitude: hotel.longitude ?? null,
        rooms: roomsWithAvailability,
      });
    } catch (error) {
      console.error("Error al obtener hotel:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  // === PUT: Actualizar un hotel ===
  if (req.method === "PUT") {
    const protectedHandler = requireAuth(
      async (reqAuth: AuthRequest, resAuth: NextApiResponse) => {
        const {
          name,
          address,
          city,
          district,
          country,
          description,
          stars,
          latitude,
          longitude,
        } = reqAuth.body;

        try {
          const updated = await prisma.hotel.update({
            where: { id },
            data: {
              name,
              address,
              city,
              district,
              country,
              description,
              stars: Number(stars) || null,
              latitude: latitude ? Number(latitude) : null,
              longitude: longitude ? Number(longitude) : null,
            },
          });

          await logAction(reqAuth.user!.id, `Hotel actualizado: ${updated.name}`);
          return res.status(200).json(updated);
        } catch (error) {
          console.error("Error al actualizar hotel:", error);
          return res.status(500).json({ error: "No se pudo actualizar el hotel" });
        }
      },
      ["ADMIN", "SUPERADMIN"]
    );

    return protectedHandler(req as AuthRequest, res);
  }

  // === DELETE: Eliminar un hotel ===
  if (req.method === "DELETE") {
    const protectedHandler = requireAuth(
      async (reqAuth: AuthRequest, resAuth: NextApiResponse) => {
        try {
          // Primero eliminar habitaciones relacionadas (si existe FK)
          await prisma.room.deleteMany({ where: { hotelId: id } });

          // Luego eliminar el hotel
          await prisma.hotel.delete({ where: { id } });

          await logAction(reqAuth.user!.id, `Hotel eliminado: ID ${id}`);
          return resAuth.status(200).json({ success: true, message: "Hotel eliminado correctamente" });
        } catch (error) {
          console.error("Error al eliminar hotel:", error);
          return resAuth.status(500).json({ error: "No se pudo eliminar el hotel" });
        }
      },
      ["ADMIN", "SUPERADMIN"]
    );

    return protectedHandler(req as AuthRequest, res);
  }

  // Si llega otro método
  return res.status(405).json({ error: "Método no permitido" });
}
