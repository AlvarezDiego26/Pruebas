import { NextApiRequest, NextApiResponse } from "next";
import { logAction } from "./logger";
import { AuthRequest } from "./middleware";

/**
 * Middleware que agrega logging asincrónico y no bloqueante
 * @param handler Función del endpoint
 * @param actionName Descripción o nombre de la acción
 */
export function withLogging(handler: Function, actionName: string) {
  return async (req: AuthRequest | NextApiRequest, res: NextApiResponse) => {
    const userId = (req as AuthRequest).user?.id || null;
    const startTime = Date.now();

    // Ejecutamos el handler principal
    const result = await handler(req, res);

    // Logueamos solo si la respuesta fue exitosa
    if (res.statusCode >= 200 && res.statusCode < 400) {
      const duration = Date.now() - startTime;

      // Ejecutar en background, sin bloquear la respuesta
      setImmediate(async () => {
        try {
          await logAction(
            userId,
            `${actionName} — ${req.method} ${req.url} — ${res.statusCode} (${duration}ms)`
          );
        } catch (err) {
          console.error("Error saving log:", err);
        }
      });
    }

    return result;
  };
}
