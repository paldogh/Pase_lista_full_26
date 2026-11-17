
const FACIAL_SERVICE_URL = (process.env.FACIAL_SERVICE_URL || "")
  .replace(/\/+$/, "");

const FACIAL_SERVICE_TOKEN = process.env.FACIAL_SERVICE_TOKEN;

function validarConfiguracion() {
  if (!FACIAL_SERVICE_URL || !FACIAL_SERVICE_TOKEN) {
    const error = new Error(
      "El servicio facial no está configurado."
    );
    error.status = 503;
    throw error;
  }
}

async function solicitarMotor(path, body, timeoutMs = 120000) {
  validarConfiguracion();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const url = `${FACIAL_SERVICE_URL}${path}`;
  const inicio = Date.now();

  try {
    console.log("----------------------------------------");
    console.log("[FACIAL] SOLICITUD AL MOTOR PYTHON");
    console.log("[FACIAL] URL:", url);
    console.log("[FACIAL] Tiempo límite:", timeoutMs, "ms");
    console.log("[FACIAL] Enviando solicitud...");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": FACIAL_SERVICE_TOKEN
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const duracion = Date.now() - inicio;

    console.log("[FACIAL] Respuesta recibida");
    console.log("[FACIAL] HTTP Status:", response.status);
    console.log("[FACIAL] Content-Type:", response.headers.get("content-type"));
    console.log("[FACIAL] Duración:", duracion, "ms");

    // Leer la respuesta una sola vez
    const responseText = await response.text();

    // Mostrar solamente una parte de la respuesta
    console.log(
      "[FACIAL] Respuesta del motor:",
      responseText.substring(0, 1000)
    );

    if (!responseText.trim()) {
      console.error("[FACIAL] ERROR: Respuesta vacía del motor");

      const error = new Error(
        "El motor facial devolvió una respuesta vacía."
      );
      error.status = 502;
      throw error;
    }

    let payload;

    try {
      payload = JSON.parse(responseText);
    } catch (parseError) {
      console.error("[FACIAL] ERROR: La respuesta no es JSON válido");
      console.error("[FACIAL] HTTP Status:", response.status);
      console.error("[FACIAL] Content-Type:", response.headers.get("content-type"));
      console.error("[FACIAL] Contenido recibido:", responseText.substring(0, 1000));

      const error = new Error(
        "El motor facial devolvió una respuesta inválida. HTTP " +
        response.status
      );

      error.status = 502;
      throw error;
    }

    if (!response.ok) {
      console.error("[FACIAL] ERROR HTTP DEL MOTOR");
      console.error("[FACIAL] Status:", response.status);
      console.error("[FACIAL] Detalle:", payload);

      const error = new Error(
        payload?.detail ||
        payload?.message ||
        "El motor facial no pudo procesar la solicitud."
      );

      error.status = response.status >= 500 ? 502 : response.status;
      throw error;
    }

    console.log("[FACIAL] Motor respondió correctamente");
    console.log("[FACIAL] Duración total:", Date.now() - inicio, "ms");
    console.log("----------------------------------------");

    return payload;

  } catch (error) {
    console.error("[FACIAL] ERROR EN SOLICITUD AL MOTOR");
    console.error("[FACIAL] Mensaje:", error.message);

    if (error.name === "AbortError") {
      const timeoutError = new Error(
        "El motor facial tardó demasiado en responder."
      );

      timeoutError.status = 504;
      throw timeoutError;
    }

    if (!error.status) {
      const connectionError = new Error(
        "No fue posible conectar con el motor facial: " + error.message
      );

      connectionError.status = 502;
      throw connectionError;
    }

    throw error;

  } finally {
    clearTimeout(timeout);
  }
}

export async function identifyFace(imageBase64) {
  console.log("[FACIAL] Iniciando reconocimiento facial");

  if (
    typeof imageBase64 !== "string" ||
    imageBase64.length < 100
  ) {
    const error = new Error("La imagen facial no es válida.");
    error.status = 400;
    throw error;
  }

  console.log("[FACIAL] Tamaño de imagen:", imageBase64.length);

  const payload = await solicitarMotor(
    "/v1/faces/recognize",
    {
      image_base64: imageBase64
    },
    180000
  );

  console.log("[FACIAL] Resultado del reconocimiento:");
  console.log("[FACIAL] Coincidencia:", payload.matched);
  console.log("[FACIAL] Alumno encontrado:", payload.alumno_id || "Ninguno");
  console.log("[FACIAL] Distancia:", payload.distance);
  console.log("[FACIAL] Modelo:", payload.model);

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
  console.log("[FACIAL] Iniciando enrolamiento");
  console.log("[FACIAL] Alumno ID:", alumnoId);

  const payload = await solicitarMotor(
    "/v1/faces/enroll",
    {
      alumno_id: alumnoId,
      image_base64: imageBase64
    },
    180000
  );

  if (
    payload.enrolled !== true ||
    payload.alumno_id !== alumnoId
  ) {
    const error = new Error(
      "El motor facial no confirmó el enrolamiento."
    );

    error.status = 502;
    throw error;
  }

  console.log("[FACIAL] Enrolamiento confirmado");

  return {
    enrolled: true,
    alumnoId: payload.alumno_id,
    model: payload.model
  };
}
