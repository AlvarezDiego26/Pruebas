// lib/pagination.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface PaginateOptions {
  model: keyof PrismaClient;   // Ej: "user", "hotel", "reservation"
  where?: any;
  select?: any;
  include?: any;
  orderBy?: any;
  page?: number | string;
  limit?: number | string;
}

/**
 * 🔁 Función de paginación genérica
 * Uso: await paginate({ model: "user", where: { role: "CLIENT" }, page: 1, limit: 20 })
 */
export async function paginate(options: PaginateOptions) {
  const {
    model,
    where = {},
    select,
    include,
    orderBy = { createdAt: "desc" },
    page = 1,
    limit = 10,
  } = options;

  const modelName = String(model); // ✅ evita error de Symbol
  const modelClient = (prisma as any)[modelName];
  if (!modelClient) {
    throw new Error(`Modelo Prisma no encontrado: ${modelName}`);
  }

  const pageNum = parseInt(String(page)) || 1;
  const limitNum = parseInt(String(limit)) || 10;
  const skip = (pageNum - 1) * limitNum;

  const [data, total] = await Promise.all([
    modelClient.findMany({
      where,
      select,
      include,
      orderBy,
      skip,
      take: limitNum,
    }),
    modelClient.count({ where }),
  ]);

  return {
    data,
    meta: {
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
  };
}
