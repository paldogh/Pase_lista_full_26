
import { randomUUID } from "node:crypto";

import prisma from "../config/prisma.js";
import { enrollFace } from "../services/facialRecognition.service.js";
import {
    r2,
    BUCKET_NAME,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    getSignedUrl
} from "../config/r2.js";

// ==========================================
// CONFIGURACIÓN
// ==========================================

const TIPOS_PERMITIDOS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
};

const generarUrlTemporal = async (fotoKey) => {
    return await getSignedUrl(
        r2,
        new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fotoKey
        }),
        {
            expiresIn: 600
        }
    );
};

// ==========================================
// SUBIR FOTOGRAFÍA DE PERFIL
// ==========================================

export const subirFotoAlumno = async (req, res) => {

    let nuevaKey = null;

    try {

        const matricula = String(
            req.params.matricula || ""
        ).trim();

        const archivo = req.file;

        if (!matricula) {
            return res.status(400).json({
                success: false,
                message: "La matrícula es obligatoria."
            });
        }

        if (!archivo) {
            return res.status(400).json({
                success: false,
                message: "Debes seleccionar una fotografía."
            });
        }

        const extension = TIPOS_PERMITIDOS[archivo.mimetype];

        if (!extension) {
            return res.status(400).json({
                success: false,
                message: "Formato no permitido. Utiliza JPG, PNG o WEBP."
            });
        }

        // Buscar alumno por matrícula
        const alumno = await prisma.alumno.findUnique({
            where: {
                matricula
            }
        });

        if (!alumno) {
            return res.status(404).json({
                success: false,
                message: "No se encontró el alumno."
            });
        }

        // Nombre único del archivo
        nuevaKey = `alumnos/${alumno.id}/perfil/${randomUUID()}.${extension}`;

        // Subir archivo a Backblaze B2
        await r2.send(
            new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: nuevaKey,
                Body: archivo.buffer,
                ContentType: archivo.mimetype,
                CacheControl: "private, no-store"
            })
        );

        // Actualizar referencia en Neon
        const actualizado = await prisma.alumno.update({
            where: {
                id: alumno.id
            },
            data: {
                fotoKey: nuevaKey,
                fotoUrl: `/api/alumnos/${encodeURIComponent(matricula)}/foto`
            }
        });

        // Eliminar foto anterior solamente después
        // de guardar correctamente la nueva referencia.
        if (alumno.fotoKey) {
            try {
                await r2.send(
                    new DeleteObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: alumno.fotoKey
                    })
                );
            } catch (error) {
                console.error(
                    "No se pudo eliminar la fotografía anterior:",
                    error
                );
            }
        }

        return res.status(200).json({
            success: true,
            message: "Fotografía almacenada correctamente.",
            data: {
                matricula: actualizado.matricula,
                fotoUrl: actualizado.fotoUrl,
                fotoKey: actualizado.fotoKey
            }
        });

    } catch (error) {

        // Limpiar el archivo nuevo si falla la actualización
        // de la base de datos.
        if (nuevaKey) {
            try {
                await r2.send(
                    new DeleteObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: nuevaKey
                    })
                );
            } catch (errorBorrado) {
                console.error(
                    "Error al limpiar archivo:",
                    errorBorrado
                );
            }
        }

        console.error("ERROR AL SUBIR FOTO:", error);

        return res.status(500).json({
            success: false,
            message: "Error al almacenar la fotografía."
        });
    }
};

// ==========================================
// CONSULTAR FOTOGRAFÍA DEL ALUMNO
// ==========================================

export const consultarFotoAlumno = async (req, res) => {

    try {

        const matricula = String(
            req.params.matricula || ""
        ).trim();

        const alumno = await prisma.alumno.findUnique({
            where: {
                matricula
            },
            select: {
                matricula: true,
                fotoKey: true
            }
        });

        if (!alumno || !alumno.fotoKey) {
            return res.status(404).json({
                success: false,
                message: "El alumno no tiene fotografía registrada."
            });
        }

        // Generar URL temporal de acceso privado
        const url = await generarUrlTemporal(alumno.fotoKey);

        return res.status(200).json({
            success: true,
            message: "Fotografía obtenida correctamente.",
            data: {
                matricula: alumno.matricula,
                url,
                expiresIn: 600
            }
        });

    } catch (error) {

        console.error("ERROR AL CONSULTAR FOTO:", error);

        return res.status(500).json({
            success: false,
            message: "Error al consultar la fotografía."
        });
    }
};


export const enrolarRostroAlumno = async (req, res) => {
  try {
    // El enrolamiento biométrico se reserva al administrador.
    if (req.usuario?.rol !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Solo un administrador puede registrar plantillas faciales."
      });
    }

    const matricula = String(req.params.matricula || "").trim();

    if (!matricula) {
      return res.status(400).json({
        success: false,
        message: "La matrícula es obligatoria."
      });
    }

    // Buscar alumno y referencia de su fotografía privada.
    const alumno = await prisma.alumno.findUnique({
      where: { matricula },
      select: {
        id: true,
        matricula: true,
        fotoKey: true
      }
    });

    if (!alumno) {
      return res.status(404).json({
        success: false,
        message: "No se encontró el alumno."
      });
    }

    if (!alumno.fotoKey) {
      return res.status(409).json({
        success: false,
        message: "El alumno todavía no tiene fotografía registrada."
      });
    }

    // Recuperar la imagen directamente desde Backblaze B2.
    const objeto = await r2.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: alumno.fotoKey
      })
    );

    if (!objeto.Body) {
      return res.status(502).json({
        success: false,
        message: "No se pudo recuperar la fotografía de Backblaze."
      });
    }

    // Convertir el contenido privado a Base64.
    const bytes = await objeto.Body.transformToByteArray();

    if (!bytes.length || bytes.length > 5 * 1024 * 1024) {
      return res.status(422).json({
        success: false,
        message: "La fotografía está vacía o supera los 5 MB."
      });
    }

    const imageBase64 = Buffer.from(bytes).toString("base64");

    // Enviar al motor Python el UUID real del alumno.
    const resultado = await enrollFace(alumno.id, imageBase64);

    return res.status(200).json({
      success: true,
      message: "Rostro registrado correctamente.",
      data: {
        matricula: alumno.matricula,
        alumnoId: resultado.alumnoId,
        model: resultado.model,
        enrolled: true
      }
    });

  } catch (error) {
    console.error("[FACIAL ENROLL] Error:", error);

    const status =
      Number(error.status) >= 400 && Number(error.status) < 600
        ? Number(error.status)
        : 500;

    return res.status(status).json({
      success: false,
      message:
        status === 500
          ? "Error interno al registrar el rostro."
          : error.message
    });
  }
};
