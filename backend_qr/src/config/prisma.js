import "dotenv/config";
import pg from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("Falta configurar DATABASE_URL en las variables de entorno.");
}

// Una sola instancia de Pool y PrismaClient para toda la aplicación.
// Mantener un pool moderado evita agotar las conexiones de Neon.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number.parseInt(process.env.DB_POOL_MAX || "10", 10),
  min: 0,
  connectionTimeoutMillis: Number.parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || "10000", 10),
  idleTimeoutMillis: Number.parseInt(process.env.DB_IDLE_TIMEOUT_MS || "30000", 10),
  keepAlive: true,
  allowExitOnIdle: false,
  application_name: "pase-lista-qr-backend",
});

pool.on("error", (error) => {
  console.error("[PostgreSQL] Error en una conexión inactiva:", error.message);
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export async function comprobarConexionDB() {
  await pool.query("SELECT 1");
  return true;
}

export async function cerrarConexionDB() {
  try {
    await prisma.$disconnect();
  } finally {
    await pool.end();
  }
}

export default prisma;
