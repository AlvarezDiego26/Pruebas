// pages/api/logs/index.ts
import { NextApiResponse } from "next";
import { requireAuth, AuthRequest } from "../../../lib/middleware";
import { withErrorHandler, throwError } from "../../../lib/errorHandler";
import { paginate } from "../../../lib/pagination";

async function handler(req: AuthRequest, res: NextApiResponse) {
  if (req.method !== "GET") throwError(405, "Method not allowed");

  const { page = "1", limit = "10" } = req.query;
  const pageValue = Array.isArray(page) ? page[0] : page;
  const limitValue = Array.isArray(limit) ? limit[0] : limit;

  //Usa el helper genérico
  const result = await paginate({
    model: "log",
    include: { user: { select: { id: true, email: true, role: true } } },
    page: pageValue,
    limit: limitValue,
    orderBy: { createdAt: "desc" },
  });

  return res.status(200).json(result);
}

// Solo ADMIN o SUPERADMIN
export default requireAuth(withErrorHandler(handler), ["ADMIN", "SUPERADMIN"]);
