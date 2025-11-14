import { NextApiRequest, NextApiResponse } from "next";
import { verifyToken } from "./auth";

export interface AuthRequest extends NextApiRequest {
  user?: { id: number; role: string };
}

export function requireAuth(handler: Function, roles: string[] = []) {
  return async (req: AuthRequest, res: NextApiResponse) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid token" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = verifyToken(token) as { id: number; role: string; exp?: number };

      if (!decoded || (decoded.exp && decoded.exp * 1000 < Date.now())) {
        return res.status(401).json({ error: "Token expired or invalid" });
      }

      req.user = { id: decoded.id, role: decoded.role };

      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: "Forbidden: insufficient role" });
      }

      return handler(req, res);
    } catch (err) {
      console.error("Auth error:", err);
      return res.status(401).json({ error: "Unauthorized" });
    }
  };
}
