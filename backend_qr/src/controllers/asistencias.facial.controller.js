
import prisma from "../config/prisma.js";
import { identifyFace } from "../services/facialRecognition.service.js";
import { notificarAsistenciaWhatsApp } from "./whatsapp.service.js";

// Obtiene el rango del día actual en horario de México.
function todayRangeMexico() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);

  const get = (type) =>
    parts.find((part) => part.type === type)?.value;

  const day = `${get("year")}-${get("month")}-${get("day")}`;

  const start = new Date(`${day}T00:00:00-06:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { now, start, end };
}

export async function registrarAsistenciaFacial(req, res) {
  try {
    const { image, docente_id } = req.body || {};

    // 1. Validar imagen recibida desde la aplicación móvil.
    if (typeof image !== "string" || image.length < 100) {
      return res.status(400).json({
        success: false,
        message: "No se recibió una imagen facial válida."
      });
    }

    if (image.length > 7_000_000) {
      return res.status(413).json({
        success: false,
        message: "La imagen es demasiado grande. Intenta nuevamente."
      });
    }

    // 2. Validar docente.
    if (!docente_id) {
      return res.status(400).json({
        success: false,
        message: "docente_id es obligatorio."
      });
    }

    // 3. Enviar imagen al motor Python.
    // Python realiza la comparación y aplica su umbral de distancia.
    const match = await identifyFace(image);

    if (!match.matched || !match.studentId) {
      return res.status(404).json({
        success: false,
        message:
          match.message ||
          "No se encontró una coincidencia facial. Intenta de nuevo o utiliza QR.",
        distance: match.distance ?? null
      });
    }

    // 4. Buscar al alumno utilizando el UUID devuelto por Python.
    const alumno = await prisma.alumno.findUnique({
      where: {
        id: match.studentId
      },
      include: {
        Grupo: true
      }
    });

    if (!alumno) {
      return res.status(404).json({
        success: false,
        message: "El rostro fue reconocido, pero el alumno no existe en el sistema escolar."
      });
    }

    // 5. Comprobar que el docente tenga una sesión activa.
    const sesionActiva = await prisma.sesionQR.findFirst({
      where: {
        activa: true,
        expiracion: {
          gt: new Date()
        },
        MaestroMateriaGrupo: {
          is: {
            maestroId: String(docente_id)
          }
        }
      }
    });

    if (!sesionActiva) {
      return res.status(409).json({
        success: false,
        message: "No hay una sesión activa para este docente. Activa la sesión desde el sistema antes de tomar asistencia."
      });
    }

    // 6. Evitar registrar dos asistencias al mismo alumno el mismo día.
    const { now, start, end } = todayRangeMexico();

    const existing = await prisma.asistencia.findFirst({
      where: {
        alumnoId: alumno.id,
        fechaHora: {
          gte: start,
          lt: end
        }
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "La asistencia de este alumno ya fue registrada hoy."
      });
    }

    // 7. Registrar asistencia.
    const attendance = await prisma.asistencia.create({
      data: {
        alumnoId: alumno.id,
        sesionQRId: sesionActiva.id,
        estado: "PRESENTE",
        fechaHora: now
      }
    });

    // 8. Recuperar información del tutor para notificación.
    const alumnoConTutor = await prisma.alumno.findUnique({
      where: {
        id: alumno.id
      },
      include: {
        Grupo: true,
        Tutor: true
      }
    });

    // 9. Notificar al tutor sin bloquear la respuesta.
    void notificarAsistenciaWhatsApp({
      alumno: alumnoConTutor,
      fechaHora: now,
      grupo: alumnoConTutor?.Grupo?.nombre || null
    }).catch((error) => {
      console.error("[FACIAL] Error WhatsApp:", error.message);
    });

    // 10. Responder a la aplicación móvil.
    return res.status(201).json({
      success: true,
      message: "Identidad confirmada. Asistencia registrada.",
      distance: match.distance,
      model: match.model,
      attendance: {
        id: attendance.id,
        estado: attendance.estado,
        fechaHora: attendance.fechaHora
      },
      alumno: {
        id: alumno.id,
        matricula: alumno.matricula,
        nombre: alumno.nombre,
        apellidoPaterno: alumno.apellidoPaterno,
        apellidoMaterno: alumno.apellidoMaterno || "",
        grupo: alumnoConTutor?.Grupo?.nombre || null
      }
    });

  } catch (error) {
    console.error("[FACIAL] Error al registrar asistencia:", error);

    const status =
      Number(error.status) >= 400 && Number(error.status) < 600
        ? Number(error.status)
        : 500;

    return res.status(status).json({
      success: false,
      message:
        status === 500
          ? "Error interno al procesar la asistencia facial."
          : error.message
    });
  }
}
