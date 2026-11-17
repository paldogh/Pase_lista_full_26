import { API, DOCENTE_ID } from "../config/api.config";
import type { FacialAttendanceResponse } from "../types/attendance.types";

export class FacialApiError extends Error {
  status: number;
  payload?: FacialAttendanceResponse;

  constructor(message: string, status: number, payload?: FacialAttendanceResponse) {
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
  if (!imageBase64?.trim()) throw new Error("La cámara no generó una imagen válida.");

  const response = await fetch(API.facialAttendance, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: imageBase64,
      docente_id: DOCENTE_ID,
    }),
    signal,
  });

  let payload: FacialAttendanceResponse;
  try {
    payload = await response.json();
  } catch {
    throw new Error("El servidor devolvió una respuesta que no es JSON.");
  }

  if (!response.ok || payload?.success !== true) {
    throw new FacialApiError(
      payload?.message || `No se pudo registrar la asistencia (HTTP ${response.status}).`,
      response.status,
      payload
    );
  }

  return payload;
}
