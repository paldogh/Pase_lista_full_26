import api from "../api";
import { useState, useEffect } from "react";

import RegistrarAsistencia from "./RegistrarAsistencia"; 


const ESTILOS_ESTADO = {
    PRESENTE: { dot: "bg-emerald-500", text: "text-emerald-700 bg-emerald-50" },
};

const COLORES_AVATAR = [
    "bg-indigo-100 text-indigo-700 border-indigo-200",
    "bg-sky-100 text-sky-700 border-sky-200",
    "bg-teal-100 text-teal-700 border-teal-200",
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-rose-100 text-rose-700 border-rose-200",
    "bg-violet-100 text-violet-700 border-violet-200",
];

function obtenerIniciales(nombre, apellido) {
    const n = nombre?.charAt(0) || "";
    const a = apellido?.charAt(0) || "";
    return (n + a).toUpperCase() || "?";
}

function Asistencia() {
    const [vista, setVista] = useState("consultar");
    const [modo, setModo] = useState("todos");
    const [matricula, setMatricula] = useState("");
    const [fecha, setFecha] = useState("");
    const [asistencias, setAsistencias] = useState([]);
    const [alumnoInfo, setAlumnoInfo] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [mensaje, setMensaje] = useState("");

    const buscarTodos = async () => {
        setCargando(true);
        setMensaje("");
        setAlumnoInfo(null);
        try {
            const respuesta = await api.get(`/asistencias`);
            const datos = respuesta.data.data || [];
            setAsistencias(datos);
            if (datos.length === 0) setMensaje("No hay asistencias registradas todavía.");
        } catch (error) {
            console.error("Error al buscar todos:", error);
            setAsistencias([]);
            setMensaje("Error al consultar las asistencias.");
        } finally {
            setCargando(false);
        }
    };

    const buscarPorMatricula = async () => {
        if (!matricula.trim()) {
            setMensaje("Escribe una matrícula para buscar.");
            return;
        }
        setCargando(true);
        setMensaje("");
        try {
            const respuesta = await api.get(`/asistencias/alumno/${matricula.trim()}`);
            setAsistencias(respuesta.data.data || []);
            setAlumnoInfo(respuesta.data.alumno || null);
        } catch (error) {
            console.error("Error por matrícula:", error);
            setAsistencias([]);
            setAlumnoInfo(null);
            if (error.response?.status === 404) {
                setMensaje(error.response.data.message || "Alumno no encontrado.");
            } else {
                setMensaje("Error al consultar las asistencias.");
            }
        } finally {
            setCargando(false);
        }
    };

    const buscarPorFecha = async () => {
        if (!fecha) {
            setMensaje("Selecciona una fecha para buscar.");
            return;
        }
        setCargando(true);
        setMensaje("");
        setAlumnoInfo(null);
        try {
            const respuesta = await api.get(`/asistencias/fecha/${fecha}`);
            setAsistencias(respuesta.data.data || []);
        } catch (error) {
            console.error("Error por fecha:", error);
            setAsistencias([]);
            if (error.response?.status === 404) {
                setMensaje(error.response.data.message || "No hay asistencias en esa fecha.");
            } else {
                setMensaje("Error al consultar las asistencias.");