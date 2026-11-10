
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

// ======================================================
// CONFIGURACIÓN CORS
// ======================================================

// Dominio de producción del frontend
const frontendProduccion = "https://pase-lista-front.onrender.com";

// Orígenes adicionales configurados en variables de entorno
const origenesConfigurados = [
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS || "").split(",")
]
  .map((origen) => String(origen || "").trim().replace(/\/+$/, ""))
  .filter(Boolean);

// Orígenes locales para desarrollo
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
  "http://192.168.137.76:5173"
];

const origenesPermitidos = new Set([
  frontendProduccion,
  ...origenesLocales,
  ...origenesConfigurados
]);

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir aplicaciones móviles o solicitudes sin Origin
      if (!origin) {
        return callback(null, true);
      }

      const origen = origin.trim().replace(/\/+$/, "");

      if (origenesPermitidos.has(origen)) {
        return callback(null, true);
      }

      console.warn("[CORS] Origen rechazado:", origen);

      return callback(new Error("Origen no permitido por CORS"));
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS"
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With"
    ],

    maxAge: 86400
  })
);

// ======================================================
// SEGURIDAD Y CONFIGURACIÓN EXPRESS
// ======================================================

app.disable("x-powered-by");

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin"
    }
  })
);

// Límite de solicitudes JSON y formularios
app.use(express.json({ limit: "10mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb"
  })
);

// ======================================================
// RUTAS GENERALES
// ======================================================

app.get("/", (_req, res) => {
  res.status(200).json({
    msg: "Backend funcionando",
    status: "ok"
  });
});

// Comprobación de disponibilidad para Render
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "pase-lista-backend"
  });
});

// ======================================================
// RUTAS API
// Se conservan los prefijos originales
// ======================================================

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

// ======================================================
// RUTA NO ENCONTRADA
// ======================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
});

// ======================================================
// MANEJO GLOBAL DE ERRORES
// ======================================================

app.use((error, _req, res, _next) => {
  console.error("[HTTP] Error:", error);

  if (error?.message === "Origen no permitido por CORS") {
    return res.status(403).json({
      success: false,
      message: "Origen no permitido por CORS"
    });
  }

  if (error?.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "El contenido supera el límite permitido de 10 MB."
    });
  }

  if (
    error instanceof SyntaxError &&
    error.status === 400 &&
    "body" in error
  ) {
    return res.status(400).json({
      success: false,
      message: "El JSON enviado no tiene un formato válido."
    });
  }

  return res.status(500).json({
    success: false,
    message: "Error interno del servidor."
  });
});

export default app;
