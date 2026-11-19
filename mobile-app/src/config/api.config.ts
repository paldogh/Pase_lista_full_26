const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "") ||
  "https://pase-lista-full-26.onrender.com/api";

export const API = {
  baseUrl: API_BASE_URL,
  attendance: `${API_BASE_URL}/asistencias`,
  facialAttendance: `${API_BASE_URL}/asistencias/facial`,
};

/**
 * Temporal: conserva el identificador que ya utiliza el proyecto.
 * Antes de producción, reemplázalo por el ID del docente autenticado
 * obtenido de la sesión/token. No uses un ID fijo para todos los docentes.
 */
export const DOCENTE_ID =
  process.env.EXPO_PUBLIC_DOCENTE_ID?.trim() || "maestro-001";
