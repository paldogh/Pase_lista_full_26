
import prisma from "../config/prisma.js";
import { notificarAsistenciaWhatsApp } from "./whatsapp.service.js";

const relacionesAsistencia = {
    alumno: {
        select: {
            matricula: true,
            nombre: true,
            apellidoPaterno: true,
            apellidoMaterno: true,
            grupoId: true
        }
    },
    SesionQR: {
        include: {
            MaestroMateriaGrupo: {
                include: {
                    Maestro: {
                        select: {
                            nombre: true,
                            numeroEmpleado: true
                        }
                    },
                    Materia: {
                        select: {
                            nombre: true
                        }
                    }
                }
            }
        }
    }
};

// Mantener compatibilidad con Asistencia.jsx
const formatearAsistencia = (asistencia) => {
    const sesion = asistencia.SesionQR;
    const relacion = sesion?.MaestroMateriaGrupo;

    return {
        ...asistencia,
        sesionQR: sesion
            ? {
                  ...sesion,
                  mmg: relacion
                      ? {
                            ...relacion,
                            maestro: relacion.Maestro,
                            materia: relacion.Materia
                        }
                      : null
              }
            : null
    };
};

// API 1 — Registrar asistencia
export const registrarAsistencia = async (req, res) => {
    try {
        const { matricula, docente_id } = req.body;

        if (!matricula || !docente_id) {
            return res.status(400).json({
                success: false,
                message: "Matrícula y docente_id son obligatorios"
            });
        }

        // Buscar alumno
        const alumno = await prisma.alumno.findUnique({
            where: { matricula: matricula }
        });

        if (!alumno) {
            return res.status(404).json({
                success: false,
                message: "El alumno con esa matrícula no existe"
            });
        }

        // Buscar sesión QR activa del docente
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
            return res.status(404).json({
                success: false,
                message: "No hay ninguna sesión QR activa para este docente"
            });
        }

        // Obtener la fecha actual de Ciudad de México
        const ahora = new Date();

        const partes = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Mexico_City",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(ahora);

        const obtener = (tipo) =>
            partes.find((parte) => parte.type === tipo).value;

        const fechaHoy =
            `${obtener("year")}-${obtener("month")}-${obtener("day")}`;

        const inicioDia = new Date(`${fechaHoy}T00:00:00-06:00`);

        const inicioManana = new Date(inicioDia);
        inicioManana.setUTCDate(inicioManana.getUTCDate() + 1);

        // Verificar si ya existe asistencia hoy
        const asistenciaExistente = await prisma.asistencia.findFirst({
            where: {
                alumnoId: alumno.id,
                fechaHora: {
                    gte: inicioDia,
                    lt: inicioManana
                }
            }
        });

        if (asistenciaExistente) {
            return res.status(409).json({
                success: false,
                message: "Asistencia ya registrada hoy"
            });
        }

        // Registrar asistencia
        await prisma.asistencia.create({
            data: {
                alumnoId: alumno.id,
                sesionQRId: sesionActiva.id,
                estado: "PRESENTE",
                fechaHora: ahora
            }
        });

        // Obtener alumno, grupo y tutor
      const alumnoConGrupo = await prisma.alumno.findUnique({
    where: {
        id: alumno.id
    },
    include: {
        Grupo: true,
        Tutor: true
    }
});

if (!alumnoConGrupo) {
    console.error("No se encontró el alumno después de registrar asistencia");
} else {
    console.log("[WhatsApp] Destinatarios encontrados:", {
        alumno: alumnoConGrupo.nombre,
        telefonoAlumno: Boolean(alumnoConGrupo.telefono),
        tutor: Boolean(alumnoConGrupo.Tutor),
        telefonoTutor: Boolean(alumnoConGrupo.Tutor?.telefono)
    });

    void notificarAsistenciaWhatsApp({
        alumno: alumnoConGrupo,
        fechaHora: ahora,
        grupo: alumnoConGrupo.Grupo?.nombre || null
    }).catch((error) => {
        console.error("[WhatsApp] Error de notificación:", error.message);
    });
}

        // Notificar por WhatsApp de manera asíncrona.
        // La configuración sin parámetros debe realizarse
        // en whatsapp.service.js.
        void notificarAsistenciaWhatsApp({
            alumno: alumnoConGrupo,
            fechaHora: ahora,
            grupo: alumnoConGrupo.Grupo?.nombre || null
        }).catch((error) => {
            console.error(
                "Error al enviar notificación de asistencia por WhatsApp:",
                error.message
            );
        });

        // Respuesta exitosa
        return res.status(201).json({
            success: true,
            message: "Asistencia registrada",
            alumno: {
                nombre: alumnoConGrupo.nombre,
                apellidoPaterno: alumnoConGrupo.apellidoPaterno,
                apellidoMaterno: alumnoConGrupo.apellidoMaterno || "",
                grupo: alumnoConGrupo.Grupo?.nombre || null
            }
        });
    } catch (error) {
        console.error("DETALLE DEL ERROR EN ASISTENCIA:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno del servidor"
        });
    }
};

// API 2 — Consultar asistencias
export const consultarAsistencias = async (req, res) => {
    try {
        const asistencias = await prisma.asistencia.findMany({
            include: relacionesAsistencia,
            orderBy: {
                fechaHora: "desc"
            }
        });

        console.log(
            "TOTAL ASISTENCIAS ENCONTRADAS:",
            asistencias.length
        );

        return res.status(200).json({
            success: true,
            message: "Asistencias obtenidas correctamente",
            total: asistencias.length,
            data: asistencias.map(formatearAsistencia)
        });
    } catch (error) {
        console.error("ERROR CONSULTANDO ASISTENCIAS:", error);

        return res.status(500).json({
            success: false,
            message: "Error al consultar asistencias"
        });
    }
};

// API 3 — Consultar asistencias por alumno
export const asistenciasPorAlumno = async (req, res) => {
    try {
        const { matricula } = req.params;

        const alumno = await prisma.alumno.findUnique({
            where: {
                matricula: matricula.trim()
            }
        });

        if (!alumno) {
            return res.status(404).json({
                success: false,
                message: "Alumno no encontrado"
            });
        }

        const asistencias = await prisma.asistencia.findMany({
            where: {
                alumnoId: alumno.id
            },
            include: relacionesAsistencia,
            orderBy: {
                fechaHora: "desc"
            }
        });

        if (asistencias.length === 0) {
            return res.status(404).json({
                success: false,
                message: "El alumno no tiene asistencias registradas"
            });
        }

        return res.status(200).json({
            success: true,
            alumno: {
                matricula: alumno.matricula,
                nombre: alumno.nombre,
                apellidoPaterno: alumno.apellidoPaterno,
                apellidoMaterno: alumno.apellidoMaterno
            },
            total: asistencias.length,
            data: asistencias.map(formatearAsistencia)
        });
    } catch (error) {
        console.error("ERROR ASISTENCIAS POR ALUMNO:", error);

        return res.status(500).json({
            success: false,
            message: "Error al consultar asistencias del alumno"
        });
    }
};

// API 4 — Consultar asistencias por fecha
export const asistenciasPorFecha = async (req, res) => {
    try {
        const { fecha } = req.params;

        // Validar formato YYYY-MM-DD
        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
            Number.isNaN(Date.parse(fecha)) ||
            new Date(fecha).toISOString().slice(0, 10) !== fecha
        ) {
            return res.status(400).json({
                success: false,
                message: "Fecha no válida. Utiliza YYYY-MM-DD"
            });
        }

        // Zona horaria de Ciudad de México
        const inicioDia = new Date(`${fecha}T00:00:00-06:00`);

        const finDia = new Date(
            inicioDia.getTime() + 24 * 60 * 60 * 1000
        );

        const asistencias = await prisma.asistencia.findMany({
            where: {
                fechaHora: {
                    gte: inicioDia,
                    lt: finDia
                }
            },
            include: relacionesAsistencia,
            orderBy: {
                fechaHora: "desc"
            }
        });

        if (asistencias.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No hay asistencias registradas en esa fecha"
            });
        }

        return res.status(200).json({
            success: true,
            fecha,
            total: asistencias.length,
            data: asistencias.map(formatearAsistencia)
        });
    } catch (error) {
        console.error("ERROR ASISTENCIAS POR FECHA:", error);

        return res.status(500).json({
            success: false,
            message: "Error al consultar asistencias por fecha"
        });
    }
};
