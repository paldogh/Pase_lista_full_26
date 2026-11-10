import "dotenv/config";
import app from "./app.js";
import { cerrarConexionDB, comprobarConexionDB } from "./config/prisma.js";

const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const HOST = "0.0.0.0";

const server = app.listen(PORT, HOST, () => {
  console.log(`[Servidor] Escuchando en ${HOST}:${PORT}`);
  console.log(`[Servidor] Entorno: ${process.env.NODE_ENV || "development"}`);

  // La API puede iniciar aunque Neon tarde en responder; se informa el estado
  // sin bloquear el arranque del servicio en Render.
  comprobarConexionDB()
    .then(() => console.log("[PostgreSQL] Conexión verificada correctamente."))
    .catch((error) => console.error("[PostgreSQL] No se pudo verificar la conexión:", error.message));
});

let cerrando = false;
async function apagar(signal) {
  if (cerrando) return;
  cerrando = true;
  console.log(`[Servidor] Recibida señal ${signal}. Cerrando correctamente...`);

  server.close(async (error) => {
    if (error) console.error("[Servidor] Error al cerrar HTTP:", error.message);
    try {
      await cerrarConexionDB();
      console.log("[Servidor] Conexiones cerradas.");
      process.exit(0);
    } catch (closeError) {
      console.error("[Servidor] Error al cerrar la base de datos:", closeError.message);
      process.exit(1);
    }
  });

  // Evita que un cierre pendiente deje el proceso vivo indefinidamente.
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGTERM", () => apagar("SIGTERM"));
process.on("SIGINT", () => apagar("SIGINT"));
