
import { Router } from "express";
import jwt from "jsonwebtoken";
import multer from "multer";

import {
    subirFotoAlumno,
    consultarFotoAlumno
} from "../controllers/fotos.controllers.js";

const router = Router();

// ==========================================
// CONFIGURACIÓN DE MULTER
// ==========================================

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: (req, file, callback) => {

        const formatosPermitidos = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!formatosPermitidos.includes(file.mimetype)) {
            return callback(
                new Error("Formato de imagen no permitido.")
            );
        }

        callback(null, true);
    }
});

// Manejar errores de carga
const procesarFoto = (req, res, next) => {

    upload.single("foto")(req, res, (error) => {

        if (error) {

            const esLimite = error.code === "LIMIT_FILE_SIZE";

            return res.status(esLimite ? 413 : 400).json({
                success: false,
                message: esLimite
                    ? "La fotografía supera el límite de 5 MB."
                    : error.message
            });
        }

        next();
    });
};

// ==========================================
// VALIDAR TOKEN JWT
// ==========================================

const verificarToken = (req, res, next) => {

    try {

        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Token no proporcionado."
            });
        }

        const usuario = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        if (!["ADMIN", "MAESTRO"].includes(usuario.rol)) {
            return res.status(403).json({
                success: false,
                message: "No tienes permisos para gestionar fotografías."
            });
        }

        req.usuario = usuario;

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            message: "Token inválido o expirado."
        });
    }
};

// ==========================================
// ENDPOINTS
// ==========================================

// Subir fotografía
router.post(
    "/:matricula/foto",
    verificarToken,
    procesarFoto,
    subirFotoAlumno
);

// Consultar fotografía
router.get(
    "/:matricula/foto",
    verificarToken,
    consultarFotoAlumno
);

export default router;
