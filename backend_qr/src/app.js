import express from "express";
import cors from "cors";
import helmet from "helmet";

import loginRoutes from "./routes/login.routes.js";
import alumnosRoutes from "./routes/alumnos.routes.js";
import materiaRoutes from "./routes/materias.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import authenticationRoutes from "./routes/authentication.routes.js";
import asistenciaRoutes from "./routes/asistencias.routes.js";
import maestroRoutes from "./routes/maestro.routes.js";
import reportesRoutes from "./routes/reportes.routes.js";
import gruposRoutes from "./routes/grupos.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

const app = express();

// Orígenes permitidos: configurar FRONTEND_URL y/o ALLOWED_ORIGINS en Render.
// ALLOWED_ORIGINS admite varios dominios separados por coma.
const normalizarOrigen = (valor) => String(valor || "").trim().replace(/\/$/, "");
const origenesConfigurados = [
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS || "").split(","),
]
  .map(normalizarOrigen)
  .filter(Boolean);

// Mantener disponibles los orígenes locales utilizados durante el desarrollo.
const origenesLocales = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8081",
  "https://0hffwew-anonymous-8081.exp.direct",
  "http://192.168.137.76:3000",
  "http://192.168.137.76:5173",
];

const origenesPermitidos = new Set([...origenesLocales, ...origenesConfigurados]);

app.disable("x-powered-by");
app.set("trust proxy", 1); // Render se ejecuta detrás de un proxy.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.use(
  cors({
    origin(origin, callback) {
      // Aplicaciones nativas (Expo/Android) normalmente no envían Origin.
      if (!origin) return callback(null, true);

      const origen = normalizarOrigen(origin);
      if (origenesPermitidos.has(origen)) return callback(null, true);

      console.warn(`[CORS] Origen rechazado: ${origen}`);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    maxAge: 86400,
  })
);

// Importación masiva: se conserva el límite de 10 MB que ya utilizaba el proyecto.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/", (_req, res) => {
  res.status(200).json({ msg: "Backend funcionando", status: "ok" });
});

// Comprobación básica para Render (no consulta la base de datos).
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "pase-lista-backend" });
});

// Se mantienen los mismos prefijos de rutas del backend original.
app.use("/api", loginRoutes);
app.use("/api/alumnos", alumnosRoutes);
app.use("/api", materiaRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api", authenticationRoutes);
app.use("/api", asistenciaRoutes);
app.use("/api", maestroRoutes);
app.use("/api/reportes", reportesRoutes);
app.use("/api/grupos", gruposRoutes);
app.use("/api/dashboard", dashboardRoutes);

// 404 consistente en JSON.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// Manejo final de errores de middleware (incluidos errores de parsing JSON).
app.use((error, _req, res, _next) => {
  console.error("[HTTP] Error no controlado:", error);

  if (error?.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "El contenido enviado supera el límite permitido de 10 MB." });
  }

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ success: false, message: "El JSON enviado no tiene un formato válido." });
  }

  return res.status(500).json({ success: false, message: "Error interno del servidor." });
});

export default app;
