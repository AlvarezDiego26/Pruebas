// /middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// CORS - dominios permitidos
const allowedOrigins = [
  "http://localhost:5173",  // Frontend Vite (desarrollo local)
  "http://localhost:3000",  // Next.js local
  "https://tu-frontend.com" // Dominio de producción
];

// Rate limit por IP (memoria local)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const MAX_REQUESTS = 100; // Máximo de requests por IP por minuto
const WINDOW_MS = 60 * 1000; // Ventana de tiempo (1 minuto)

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (now - record.timestamp > WINDOW_MS) {
    // reinicia el contador si ya pasó 1 min
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return true;
  }

  record.count++;
  if (record.count > MAX_REQUESTS) return false;

  rateLimitMap.set(ip, record);
  return true;
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const ip = req.ip || req.headers.get("x-forwarded-for") || "unknown";

  // Configurar headers CORS
  const headers = new Headers();
  if (allowedOrigins.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  } else {
    headers.set("Access-Control-Allow-Origin", "*"); // fallback
  }
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Manejar preflight OPTIONS
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 200, headers });
  }

  // Aplicar Rate Limit global (solo para /api)
  if (req.nextUrl.pathname.startsWith("/api")) {
    if (!checkRateLimit(String(ip))) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...Object.fromEntries(headers) } }
      );
    }
  }

  // Para todas las demás requests, devolver respuesta normal con headers CORS
  const res = NextResponse.next();
  headers.forEach((value, key) => res.headers.set(key, value));
  return res;
}

// Aplica solo a las rutas de la API
export const config = {
  matcher: "/api/:path*",
};
