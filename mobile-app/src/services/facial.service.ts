
import { API, DOCENTE_ID } from "../config/api.config";
import type { FacialAttendanceResponse } from "../types/attendance.types";

export class FacialApiError extends Error {
  status: number;
  payload?: FacialAttendanceResponse;

  constructor(
    message: string,
    status: number,
    payload?: FacialAttendanceResponse
  ) {
    super(message);
    this.name = "FacialApiError";
    this.status = status;
    this.payload = payload;

    Object.setPrototypeOf(this, FacialApiError.prototype);
  }
}

export async function registerFacialAttendance(
  imageBase64: string,
  signal?: AbortSignal
): Promise<FacialAttendanceResponse> {

  console.log("[FACIAL] Iniciando solicitud de asistencia");

  // 1. Validar imagen
  if (!imageBase64?.trim()) {
    console.log("[FACIAL] Imagen vacía o no válida");

    throw new FacialApiError(
      "La cámara no generó una imagen válida.",
      0
    );
  }

  // 2. Limpiar encabezado Base64 si existe
  const cleanBase64 = imageBase64.replace(
    /^data:image\/[a-zA-Z]+;base64,/i,
    ""
  );

  console.log("[FACIAL] Imagen recibida correctamente");
  console.log("[FACIAL] Tamaño Base64:", cleanBase64.length);
  console.log("[FACIAL] DOCENTE_ID:", DOCENTE_ID);
  console.log("[FACIAL] Endpoint:", API.facialAttendance);

  // 3. Preparar petición
  console.log("[FACIAL] Enviando fotografía al backend");

  let response: Response;

  try {
    response = await fetch(API.facialAttendance, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: cleanBase64,
        docente_id: DOCENTE_ID,
      }),
      signal,
    });

  } catch (error) {

    // Cancelación de la solicitud
    if (error instanceof Error && error.name === "AbortError") {
      console.log("[FACIAL] Solicitud cancelada");

      throw error;
    }

    // Error de conexión controlado
    console.log("[FACIAL] No fue posible conectar con el servidor");

    throw new FacialApiError(
      "No fue posible conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.",
      0
    );
  }

  // 4. Mostrar estado HTTP
  console.log("[FACIAL] HTTP Status:", response.status);
  console.log("[FACIAL] HTTP OK:", response.ok);

  // 5. Leer respuesta como texto
  let responseText: string;

  try {
    responseText = await response.text();

  } catch {
    console.log("[FACIAL] No fue posible leer la respuesta del servidor");

    throw new FacialApiError(
      "No fue posible interpretar la respuesta del servidor.",
      response.status
    );
  }

  console.log("[FACIAL] Respuesta del servidor:", responseText);

  // 6. Convertir respuesta a JSON
  let payload: FacialAttendanceResponse;

  try {
    payload = JSON.parse(responseText) as FacialAttendanceResponse;

  } catch {
    console.log("[FACIAL] Respuesta JSON no válida");

    throw new FacialApiError(
      `El servidor devolvió una respuesta no válida (HTTP ${response.status}).`,
      response.status
    );
  }

  // 7. Validar resultado
  console.log("[FACIAL] Resultado success:", payload?.success);
  console.log("[FACIAL] Mensaje del backend:", payload?.message);

  if (!response.ok || payload?.success !== true) {

    // Identificar asistencia duplicada
    if (
      response.status === 409 ||
      payload?.message?.toLowerCase().includes("ya fue registrada")
    ) {
      console.log("[FACIAL] ASISTENCIA YA REGISTRADA");

      throw new FacialApiError(
        "¡Ya registraste tu asistencia! Tu registro de hoy se encuentra confirmado.",
        409,
        payload
      );
    }

    // Error controlado de reconocimiento o registro
    console.log("[FACIAL] Registro no completado:", {
      status: response.status,
      message: payload?.message,
    });

    throw new FacialApiError(
      payload?.message ||
        `No se pudo registrar la asistencia (HTTP ${response.status}).`,
      response.status,
      payload
    );
  }

  // 8. Confirmación
  console.log("[FACIAL] ASISTENCIA REGISTRADA CORRECTAMENTE");

  return payload;
}
