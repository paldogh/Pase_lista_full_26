
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
  }
}

export async function registerFacialAttendance(
  imageBase64: string,
  signal?: AbortSignal
): Promise<FacialAttendanceResponse> {

  console.log("[FACIAL] Iniciando solicitud de asistencia");

  // 1. Validar imagen
  if (!imageBase64?.trim()) {
    console.error("[FACIAL] ERROR: La imagen está vacía");
    throw new Error("La cámara no generó una imagen válida.");
  }

  // 2. Limpiar encabezado Base64 si existe
  const cleanBase64 = imageBase64.replace(
    /^data:image\/[a-zA-Z]+;base64,/,
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
    console.error("[FACIAL] ERROR DE CONEXIÓN:", error);

    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    throw new FacialApiError(
      "No fue posible conectar con el servidor. Verifica tu conexión y el backend.",
      0
    );
  }

  // 4. Mostrar estado HTTP
  console.log("[FACIAL] HTTP Status:", response.status);
  console.log("[FACIAL] HTTP OK:", response.ok);

  // 5. Leer respuesta como texto
  const responseText = await response.text();

  console.log("[FACIAL] Respuesta del servidor:", responseText);

  // 6. Convertir respuesta a JSON
  let payload: FacialAttendanceResponse;

  try {
    payload = JSON.parse(responseText) as FacialAttendanceResponse;
  } catch (error) {
    console.error("[FACIAL] ERROR: Respuesta no válida en JSON", error);

    throw new FacialApiError(
      `El servidor devolvió una respuesta no válida (HTTP ${response.status}).`,
      response.status
    );
  }

  // 7. Validar resultado
  console.log("[FACIAL] Resultado success:", payload?.success);
  console.log("[FACIAL] Mensaje del backend:", payload?.message);

  if (!response.ok || payload?.success !== true) {
    console.error("[FACIAL] ERROR EN EL RECONOCIMIENTO O REGISTRO");
    console.error("[FACIAL] Detalle:", payload);

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
