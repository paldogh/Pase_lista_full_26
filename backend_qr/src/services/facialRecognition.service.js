
const FACIAL_SERVICE_URL = (process.env.FACIAL_SERVICE_URL || "").replace(/\/+$/, "");
const FACIAL_SERVICE_TOKEN = process.env.FACIAL_SERVICE_TOKEN;

function validarConfiguracion() {
  if (!FACIAL_SERVICE_URL || !FACIAL_SERVICE_TOKEN) {
    const error = new Error("El servicio facial no está configurado.");
    error.status = 503;
    throw error;
  }
}

async function solicitarMotor(path, body, timeoutMs = 120000) {
  validarConfiguracion();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${FACIAL_SERVICE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": FACIAL_SERVICE_TOKEN
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    let payload;

    try {
      payload = await response.json();
    } catch {
      const error = new Error("El motor facial devolvió una respuesta inválida.");
      error.status = 502;
      throw error;
    }

    if (!response.ok) {
      const error = new Error(
        payload?.detail || "El motor facial no pudo procesar la solicitud."
      );

      error.status = response.status >= 500 ? 502 : response.status;
      throw error;
    }

    return payload;

  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("El motor facial tardó demasiado en responder.");
      timeoutError.status = 504;
      throw timeoutError;
    }

    throw error;

  } finally {
    clearTimeout(timeout);
  }
}

export async function identifyFace(imageBase64) {
  if (typeof imageBase64 !== "string" || imageBase64.length < 100) {
    const error = new Error("La imagen facial no es válida.");
    error.status = 400;
    throw error;
  }

  const payload = await solicitarMotor(
    "/v1/faces/recognize",
    { image_base64: imageBase64 }
  );

  return {
    matched: payload.matched === true,
    studentId: payload.alumno_id || null,
    distance: payload.distance ?? null,
    model: payload.model || null,
    message: payload.matched
      ? "Identidad reconocida."
      : "No se encontró una coincidencia facial."
  };
}

export async function enrollFace(alumnoId, imageBase64) {
  const payload = await solicitarMotor(
    "/v1/faces/enroll",
    {
      alumno_id: alumnoId,
      image_base64: imageBase64
    },
    180000
  );

  if (payload.enrolled !== true || payload.alumno_id !== alumnoId) {
    const error = new Error("El motor facial no confirmó el enrolamiento.");
    error.status = 502;
    throw error;
  }

  return {
    enrolled: true,
    alumnoId: payload.alumno_id,
    model: payload.model
  };
}
