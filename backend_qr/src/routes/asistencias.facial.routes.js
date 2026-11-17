import { Router } from "express";
import { registrarAsistenciaFacial } from "../controllers/asistencias.facial.controller.js";

const router = Router();

// POST /api/asistencias/facial
router.post("/facial", registrarAsistenciaFacial);

export default router;
