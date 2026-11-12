

import { useEffect, useState, useRef } from "react";
import api from "../api";
import { Plus, X, Edit, Trash2, Search, Filter, QrCode, Upload, CheckCircle, AlertTriangle, Camera, UserRound } from "lucide-react";
import * as XLSX from "xlsx";

function Alumnos() {
    const [alumnos, setAlumnos] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [mostrarModalQR, setMostrarModalQR] = useState(false);
    const [mostrarModalPreview, setMostrarModalPreview] = useState(false);
    const [alumnosPreview, setAlumnosPreview] = useState([]);
    const [alumnoSeleccionadoQR, setAlumnoSeleccionadoQR] = useState(null);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [alumnoActualId, setAlumnoActualId] = useState(null);
    const [busqueda, setBusqueda] = useState("");
    const [filtroGrupo, setFiltroGrupo] = useState("");
    const [importando, setImportando] = useState(false);

    const inputFileRef = useRef(null);
    const videoRef = useRef(null);
    const cameraStreamRef = useRef(null);
    const [camaraAlumno, setCamaraAlumno] = useState(null);
    const [errorCamara, setErrorCamara] = useState("");
    const [capturandoFoto, setCapturandoFoto] = useState(false);
    const [fotoModal, setFotoModal] = useState(null);
    const [fotoUrls, setFotoUrls] = useState({});
    const [cargandoFoto, setCargandoFoto] = useState({});
    const [subiendoFoto, setSubiendoFoto] = useState({});

    const [formulario, setFormulario] = useState({
        matricula: "",
        nombre: "",
        apellidoPaterno: "",
        apellidoMaterno: "",
        correoElectronico: "",
        telefono: "",
        grupoId: "",
        tutor: { nombre: "", telefono: "", correo: "" }
    });

    useEffect(() => {
        if (!camaraAlumno) return;

        let cancelado = false;

        const iniciarCamara = async () => {
            try {
                if (!navigator.mediaDevices?.getUserMedia) {
                    throw new Error("Este navegador no permite acceder a la cámara. Usa HTTPS o un navegador compatible.");
                }

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: "environment" },
                        width: { ideal: 1280 },
                        height: { ideal: 960 }
                    },
                    audio: false
                });

                if (cancelado) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                cameraStreamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play().catch(() => {});
                }
            } catch (error) {
                console.error("No se pudo iniciar la cámara:", error);
                if (!cancelado) {
                    const mensaje = error.name === "NotAllowedError"
                        ? "Permite el acceso a la cámara desde los permisos del navegador."
                        : error.name === "NotFoundError"
                            ? "No se encontró una cámara disponible en este dispositivo."
                            : error.message || "No fue posible iniciar la cámara.";
                    setErrorCamara(mensaje);
                }
            }
        };

        iniciarCamara();

        return () => {
            cancelado = true;
            if (cameraStreamRef.current) {
                cameraStreamRef.current.getTracks().forEach((track) => track.stop());
                cameraStreamRef.current = null;
            }
        };
    }, [camaraAlumno]);

    useEffect(() => {
        obtenerAlumnos();
        obtenerGrupos();
    }, []);

    const obtenerAlumnos = async () => {
        try {
            const respuesta = await api.get("/alumnos");
            setAlumnos(respuesta.data.data || []);
        } catch (error) {
            console.log("Error al cargar alumnos:", error);
        }
    };

    const obtenerGrupos = async () => {
        try {
            const respuesta = await api.get("/grupos");
            setGrupos(respuesta.data.data || []);
        } catch (error) {
            console.log("Error al cargar grupos:", error);
        }
    };

    const handleChange = (e) => {
        setFormulario({
            ...formulario,
            [e.target.name]: e.target.value
        });
    };

    const abrirModalCrear = () => {
        setModoEdicion(false);
        setAlumnoActualId(null);
        setFormulario({
            matricula: "",
            nombre: "",
            apellidoPaterno: "",
            apellidoMaterno: "",
            correoElectronico: "",
            telefono: "",
            grupoId: "",
            tutor: { nombre: "", telefono: "", correo: "" }
        });
        setMostrarModal(true);
    };

    const abrirModalEditar = (alumno) => {
        setModoEdicion(true);
        setAlumnoActualId(alumno.matricula || alumno.id);
        setFormulario({
            matricula: alumno.matricula || "",
            nombre: alumno.nombre || "",
            apellidoPaterno: alumno.apellidoPaterno || "",
            apellidoMaterno: alumno.apellidoMaterno || "",
            correoElectronico: alumno.correo || alumno.correoElectronico || "",
            telefono: alumno.telefono || "",
            grupoId: alumno.grupoId || "",
            tutor: {
                nombre: alumno.Tutor?.nombre || "",
                telefono: alumno.Tutor?.telefono || "",
                correo: alumno.Tutor?.correo || ""
            }
        });
        setMostrarModal(true);
    };

    const handleTutorChange = (e) => {
        const { name, value } = e.target;
        setFormulario((prev) => ({ ...prev, tutor: { ...prev.tutor, [name]: value } }));
    };

    const consultarFoto = async (alumno) => {
        const matricula = alumno.matricula;
        if (!alumno.fotoKey) {
            setFotoModal({ alumno, url: null, mensaje: "Este alumno todavía no tiene fotografía." });
            return;
        }
        const fotoEnCache = fotoUrls[matricula];
        if (fotoEnCache && Date.now() - fotoEnCache.guardadaEn < 9 * 60 * 1000) {
            setFotoModal({ alumno, url: fotoEnCache.url });
            return;
        }
        setCargandoFoto((prev) => ({ ...prev, [matricula]: true }));
        try {
            const { data } = await api.get(`/alumnos/${encodeURIComponent(matricula)}/foto`);
            const url = data?.data?.url;
            if (!url) throw new Error("El servidor no devolvió la URL de la fotografía.");
            setFotoUrls((prev) => ({ ...prev, [matricula]: { url, guardadaEn: Date.now() } }));
            setFotoModal({ alumno, url });
        } catch (error) {
            alert(error.response?.data?.message || "No se pudo consultar la fotografía.");
        } finally {
            setCargandoFoto((prev) => ({ ...prev, [matricula]: false }));
        }
    };

    const subirFoto = async (alumno, archivo) => {
        if (!archivo) return;
        const tipos = ["image/jpeg", "image/png", "image/webp"];
        if (!tipos.includes(archivo.type)) {
            alert("Selecciona una imagen JPG, PNG o WEBP.");
            return;
        }
        if (archivo.size > 5 * 1024 * 1024) {
            alert("La fotografía no debe superar 5 MB.");
            return;
        }
        const matricula = alumno.matricula;
        const formData = new FormData();
        formData.append("foto", archivo);
        setSubiendoFoto((prev) => ({ ...prev, [matricula]: true }));
        try {
            const respuesta = await api.post(`/alumnos/${encodeURIComponent(matricula)}/foto`, formData);
            setFotoUrls((prev) => { const next = { ...prev }; delete next[matricula]; return next; });
            await obtenerAlumnos();
            alert("Fotografía guardada correctamente.");
            if (respuesta.data?.data?.fotoKey) {
                await consultarFoto({ ...alumno, fotoKey: respuesta.data.data.fotoKey });
            }
        } catch (error) {
            alert(error.response?.data?.message || "No se pudo subir la fotografía.");
        } finally {
            setSubiendoFoto((prev) => ({ ...prev, [matricula]: false }));
        }
    };

    const abrirCamara = (alumno) => {
        setErrorCamara("");
        setCamaraAlumno(alumno);
    };

    const cerrarCamara = () => {
        if (cameraStreamRef.current) {
            cameraStreamRef.current.getTracks().forEach((track) => track.stop());
            cameraStreamRef.current = null;
        }
        setCamaraAlumno(null);
        setErrorCamara("");
        setCapturandoFoto(false);
    };

    const tomarFoto = async () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth || !video.videoHeight || !camaraAlumno) {
            setErrorCamara("La cámara todavía no está lista. Espera un momento e inténtalo de nuevo.");
            return;
        }

        setCapturandoFoto(true);
        try {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext("2d");
            if (!context) throw new Error("No fue posible procesar la imagen.");

            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(
                    (resultado) => resultado ? resolve(resultado) : reject(new Error("No se pudo generar la fotografía.")),
                    "image/jpeg",
                    0.88
                );
            });

            const nombreArchivo = `alumno-${camaraAlumno.matricula}-${Date.now()}.jpg`;
            const archivo = new File([blob], nombreArchivo, { type: "image/jpeg" });
            const alumno = camaraAlumno;

            cerrarCamara();
            await subirFoto(alumno, archivo);
        } catch (error) {
            console.error("Error al capturar fotografía:", error);
            setErrorCamara(error.message || "No fue posible capturar la fotografía.");
        } finally {
            setCapturandoFoto(false);
        }
    };

    const abrirModalQR = (alumno) => {
        setAlumnoSeleccionadoQR(alumno);
        setMostrarModalQR(true);
    };

    const guardarAlumno = async (e) => {
        e.preventDefault();
        try {
            if (modoEdicion) {
                await api.put(`/alumnos/${alumnoActualId}`, formulario);
                alert("Alumno actualizado correctamente");
            } else {
                await api.post("/alumnos", formulario);
                alert("Alumno creado correctamente");
            }

            setMostrarModal(false);
            obtenerAlumnos();
        } catch (error) {
            console.log("Error detallado:", error.response?.data || error);
            alert(error.response?.data?.msg || "Error al procesar la solicitud");
        }
    };

    const eliminarAlumno = async (id) => {
        if (!window.confirm("¿Estás seguro de que deseas eliminar este alumno?")) return;
        try {
            await api.delete(`/alumnos/${id}`);
            alert("Alumno eliminado correctamente");
            obtenerAlumnos();
        } catch (error) {
            console.log("Error al eliminar:", error);
            alert("Error al eliminar el alumno");
        }
    };

 
    const manejarSeleccionArchivo = (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;

        const lector = new FileReader();
        lector.onload = (evt) => {
            try {
                const datosBinarios = evt.target.result;
                const libro = XLSX.read(datosBinarios, { type: "binary" });
                const nombreHoja = libro.SheetNames[0];
                const hoja = libro.Sheets[nombreHoja];
                const listaRegistros = XLSX.utils.sheet_to_json(hoja);

                if (listaRegistros.length === 0) {
                    alert("El archivo está vacío o no tiene el formato correcto.");
                    return;
                }

                const datosFormateados = listaRegistros.map((fila, index) => {
                    // Mapeo flexible para capturar las cabeceras exactas de tu Excel
                    const matricula = String(fila.MATRÍCULA || fila.matricula || fila.Matricula || "").trim();
                    const nombre = String(fila.NOMBRE || fila.nombre || fila.Nombre || "").trim();
                    const apellidoPaterno = String(fila["AP. PATERNO"] || fila.apellidoPaterno || fila.ApellidoPaterno || fila.APELLIDO_PATERNO || fila.Apellidos || "").trim();
                    const apellidoMaterno = String(fila["AP. MATERNO"] || fila.apellidoMaterno || fila.ApellidoMaterno || fila.APELLIDO_MATERNO || "").trim();
                    const correoElectronico = String(fila.CORREO || fila.correo || fila.Correo || fila.correoElectronico || "").trim();
                    const telefono = String(fila.TELÉFONO || fila.TELEFONO || fila.telefono || fila.Telefono || "").trim();
                    const grupoId = String(fila["GRUPO ID"] || fila.grupoId || fila.GrupoId || fila.grupo || fila.GRUPO || "").trim();

                    const esValido = matricula !== "" && nombre !== "" && grupoId !== "";

                    return {
                        idTemp: index,
                        matricula,
                        nombre,
                        apellidoPaterno,
                        apellidoMaterno,
                        correoElectronico,
                        telefono,
                        grupoId,
                        esValido
                    };
                });

                setAlumnosPreview(datosFormateados);
                setMostrarModalPreview(true);
            } catch (error) {
                console.log("Error al leer archivo:", error);
                alert("Hubo un error al procesar el archivo Excel/CSV.");
            } finally {
                if (inputFileRef.current) inputFileRef.current.value = "";
            }
        };

        lector.readAsBinaryString(archivo);
    };

    const handlePreviewChange = (index, campo, valor) => {
        const nuevosDatos = [...alumnosPreview];
        nuevosDatos[index][campo] = valor;

        const item = nuevosDatos[index];
        item.esValido = item.matricula.trim() !== "" && item.nombre.trim() !== "" && item.grupoId.trim() !== "";

        setAlumnosPreview(nuevosDatos);
    };

 
    
const confirmarImportacionMasiva = async () => {
    const validos = alumnosPreview.filter(
        (a) => a.esValido
    );

    if (validos.length === 0) {
        alert("No hay registros válidos para importar.");
        return;
    }

    setImportando(true);

    try {
        const respuesta = await api.post(
            "/alumnos/carga-masiva",
            {
                alumnos: validos.map((alumno) => ({
                    matricula: alumno.matricula.trim(),
                    nombre: alumno.nombre.trim(),
                    apellidoPaterno: alumno.apellidoPaterno.trim(),
                    apellidoMaterno: alumno.apellidoMaterno.trim(),
                    correoElectronico: alumno.correoElectronico.trim(),
                    telefono: alumno.telefono.trim(),
                    grupoId: alumno.grupoId.trim()
                }))
            }
        );

        const datos = respuesta.data;

        // Mostrar resultados reales del backend.
        let mensaje =
            `${datos.message}\n\n` +
            `Registros recibidos: ${datos.recibidos}\n` +
            `Importados: ${datos.importados}\n` +
            `Omitidos: ${datos.omitidos}\n` +
            `Errores: ${datos.errores}`;

        const detalle = datos.detalle;

        if (detalle?.omitidos?.length) {
            mensaje += "\n\n--- OMITIDOS ---\n";

            mensaje += detalle.omitidos
                .map(
                    (item) =>
                        `Fila ${item.fila} (${item.matricula}): ${item.motivo}`
                )
                .join("\n");
        }

        if (detalle?.errores?.length) {
            mensaje += "\n\n--- ERRORES ---\n";

            mensaje += detalle.errores
                .map(
                    (item) =>
                        `Fila ${item.fila} (${item.matricula}): ${item.motivo}`
                )
                .join("\n");
        }

        alert(mensaje);

        // Cerrar la vista previa y actualizar la tabla.
        setMostrarModalPreview(false);
        await obtenerAlumnos();

    } catch (error) {
        console.error(
            "Error en la importación masiva:",
            error.response?.data || error
        );

        alert(
            error.response?.data?.message ||
            "Error al importar alumnos. Revisa la consola del backend."
        );
    } finally {
        setImportando(false);
    }
};



    const alumnosFiltrados = alumnos.filter((a) => {
        const textoBusqueda = busqueda.toLowerCase();
        const matricula = (a.matricula || "").toLowerCase();
        const nombre = (a.nombre || "").toLowerCase();
        const apellidoPaterno = (a.apellidoPaterno || "").toLowerCase();
        const apellidoMaterno = (a.apellidoMaterno || "").toLowerCase();
        const correo = (a.correo || a.correoElectronico || "").toLowerCase();

        const coincideTexto = (
            matricula.includes(textoBusqueda) ||
            nombre.includes(textoBusqueda) ||
            apellidoPaterno.includes(textoBusqueda) ||
            apellidoMaterno.includes(textoBusqueda) ||
            correo.includes(textoBusqueda)
        );

        const coincideGrupo = filtroGrupo === "" || a.grupoId === filtroGrupo;

        return coincideTexto && coincideGrupo;
    });

    return (
        <div className="w-full max-w-none px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold text-slate-800">
                    Gestión de Alumnos
                </h1>

                <div className="flex items-center gap-3">
                    <input
                        type="file"
                        ref={inputFileRef}
                        onChange={manejarSeleccionArchivo}
                        accept=".csv, .xlsx, .xls"
                        className="hidden"
                    />

                    <button
                        onClick={() => inputFileRef.current?.click()}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 shadow-sm transition cursor-pointer"
                    >
                        <Upload size={18} />
                        Importar Excel/CSV
                    </button>

                    <button
                        onClick={abrirModalCrear}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm transition cursor-pointer"
                    >
                        <Plus size={18} />
                        Agregar Alumno
                    </button>
                </div>
            </div>

            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center bg-white border border-gray-300 rounded-lg shadow-sm px-3 py-2 w-full max-w-md">
                    <Search size={20} className="text-gray-400 mr-2" />
                    <input
                        type="text"
                        placeholder="Buscar por matrícula, nombre o correo..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full outline-none text-sm text-slate-700 bg-transparent"
                    />
                </div>

                <div className="flex items-center bg-white border border-gray-300 rounded-lg shadow-sm px-3 py-2 w-full sm:w-72">
                    <Filter size={18} className="text-gray-400 mr-2" />
                    <select
                        value={filtroGrupo}
                        onChange={(e) => setFiltroGrupo(e.target.value)}
                        className="w-full outline-none text-sm text-slate-700 bg-transparent cursor-pointer"
                    >
                        <option value="">Todos los grupos</option>
                        {grupos.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.nombre} ({g.id})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-x-auto w-full">
                <table className="min-w-[900px] w-full">
                    <thead className="bg-slate-200">
                        <tr>
                            <th className="p-3 text-center">Foto</th>
                            <th className="p-3 text-left">Matrícula</th>
                            <th className="p-3 text-left">Nombre</th>
                            <th className="p-3 text-left">Apellidos</th>
                            <th className="p-3 text-left">Correo</th>
                            <th className="p-3 text-left">Teléfono</th>
                            <th className="p-3 text-left">Grupo</th>
                            <th className="p-3 text-center">QR</th>
                            <th className="p-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {alumnosFiltrados.length === 0 ? (
                            <tr>
                                <td colSpan="9" className="p-4 text-center text-gray-500">
                                    No se encontraron alumnos registrados con esos criterios.
                                </td>
                            </tr>
                        ) : (
                            alumnosFiltrados.map((a) => (
                                <tr key={a.matricula || a.id} className="border-b hover:bg-slate-50">
                                    <td className="p-2 text-center">
                                        <button type="button" onClick={() => consultarFoto(a)} title="Ver fotografía" className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-slate-500 hover:ring-2 hover:ring-blue-300">
                                            {fotoUrls[a.matricula]?.url ? <img src={fotoUrls[a.matricula].url} alt={`Foto ${a.nombre}`} className="h-full w-full object-cover" /> : cargandoFoto[a.matricula] ? <span className="text-[10px]">...</span> : <UserRound size={20} />}
                                        </button>
                                    </td>
                                    <td className="p-3 font-medium text-slate-700">{a.matricula}</td>
                                    <td className="p-3 text-slate-600">{a.nombre}</td>
                                    <td className="p-3 text-slate-600">{`${a.apellidoPaterno || ''} ${a.apellidoMaterno || ''}`}</td>
                                    <td className="p-3 text-slate-600">{a.correo || a.correoElectronico}</td>
                                    <td className="p-3 text-slate-600">{a.telefono}</td>
                                    <td className="p-3 text-slate-600">{a.Grupo?.nombre || a.grupoId}</td>
                                    
                                    <td className="p-3 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <button onClick={() => abrirModalQR(a)} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 text-xs font-medium" title="Ver Código QR"><QrCode size={14} /> QR</button>
                                            <div className="flex flex-wrap items-center justify-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => abrirCamara(a)}
                                                    disabled={!!subiendoFoto[a.matricula]}
                                                    className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                    title="Tomar fotografía con la cámara"
                                                >
                                                    <Camera size={14} /> Cámara
                                                </button>
                                                <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                                                    <Upload size={13} /> Archivo
                                                    <input
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/webp"
                                                        className="hidden"
                                                        disabled={!!subiendoFoto[a.matricula]}
                                                        onChange={(e) => { subirFoto(a, e.target.files?.[0]); e.target.value = ""; }}
                                                    />
                                                </label>
                                            </div>
                                            {subiendoFoto[a.matricula] && <span className="text-[10px] text-emerald-700">Guardando foto...</span>}
                                        </div>
                                    </td>

                                    <td className="p-3 text-center flex justify-center gap-2">
                                        <button
                                            onClick={() => abrirModalEditar(a)}
                                            className="p-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition cursor-pointer"
                                            title="Editar"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => eliminarAlumno(a.matricula || a.id)}
                                            className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition cursor-pointer"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal para Crear y Editar */}
            {mostrarModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
                        <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-slate-800">
                                {modoEdicion ? "Editar Alumno" : "Agregar Nuevo Alumno"}
                            </h2>
                            <button
                                onClick={() => setMostrarModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={guardarAlumno} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Matrícula</label>
                                <input
                                    type="text"
                                    name="matricula"
                                    placeholder="Ej. 20262589"
                                    value={formulario.matricula}
                                    onChange={handleChange}
                                    className="border border-gray-300 w-full p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                    disabled={modoEdicion}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Nombre</label>
                                <input
                                    type="text"
                                    name="nombre"
                                    placeholder="Ej. Arturo"
                                    value={formulario.nombre}
                                    onChange={handleChange}
                                    className="border border-gray-300 w-full p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Apellido Paterno</label>
                                    <input
                                        type="text"
                                        name="apellidoPaterno"
                                        placeholder="Apellido Paterno"
                                        value={formulario.apellidoPaterno}
                                        onChange={handleChange}
                                        className="border border-gray-300 w-full p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Apellido Materno</label>
                                    <input
                                        type="text"
                                        name="apellidoMaterno"
                                        placeholder="Apellido Materno"
                                        value={formulario.apellidoMaterno}
                                        onChange={handleChange}
                                        className="border border-gray-300 w-full p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Correo Electrónico</label>
                                <input
                                    type="email"
                                    name="correoElectronico"
                                    placeholder="ejemplo@correo.com"
                                    value={formulario.correoElectronico}
                                    onChange={handleChange}
                                    className="border border-gray-300 w-full p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Teléfono</label>
                                <input
                                    type="text"
                                    name="telefono"
                                    placeholder="773..."
                                    value={formulario.telefono}
                                    onChange={handleChange}
                                    className="border border-gray-300 w-full p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
                                <div className="flex items-center gap-2"><UserRound size={18} className="text-blue-700" /><h3 className="font-bold text-slate-800">Padre, madre o tutor responsable</h3></div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div><label className="mb-1 block text-xs font-semibold uppercase text-gray-600">Nombre completo</label><input name="nombre" value={formulario.tutor.nombre} onChange={handleTutorChange} placeholder="Nombre del responsable" className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm" /></div>
                                    <div><label className="mb-1 block text-xs font-semibold uppercase text-gray-600">Teléfono del responsable</label><input name="telefono" type="tel" value={formulario.tutor.telefono} onChange={handleTutorChange} placeholder="Teléfono de contacto" className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm" /></div>
                                    <div><label className="mb-1 block text-xs font-semibold uppercase text-gray-600">Correo del responsable</label><input name="correo" type="email" value={formulario.tutor.correo} onChange={handleTutorChange} placeholder="correo@ejemplo.com" className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm" /></div>
                                </div>
                                <p className="text-xs text-slate-500">Se registran los datos de contacto del padre, madre o tutor responsable. Los datos son opcionales y pueden completarse posteriormente.</p>
                            </section>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Grupo</label>
                                <select
                                    name="grupoId"
                                    value={formulario.grupoId}
                                    onChange={handleChange}
                                    className="border border-gray-300 w-full p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Selecciona un grupo</option>
                                    {grupos.map((g) => (
                                        <option key={g.id} value={g.id}>
                                            {g.nombre} ({g.id})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setMostrarModal(false)}
                                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-md cursor-pointer"
                                >
                                    {modoEdicion ? "Actualizar Alumno" : "Guardar Alumno"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Vista Previa Editable para Importación Masiva */}
            {mostrarModalPreview && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh]">
                        
                        <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-100">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">
                                    Vista Previa de Importación Masiva
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Revisa, edita celdas si es necesario y verifica que los campos obligatorios (Matrícula, Nombre y Grupo) sean válidos.
                                </p>
                            </div>
                            <button
                                onClick={() => setMostrarModalPreview(false)}
                                className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 border border-gray-200 rounded-xl mb-4">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-100 sticky top-0">
                                    <tr>
                                        <th className="p-3">Estado</th>
                                        <th className="p-3">Matrícula</th>
                                        <th className="p-3">Nombre</th>
                                        <th className="p-3">Apellido Paterno</th>
                                        <th className="p-3">Apellido Materno</th>
                                        <th className="p-3">Correo</th>
                                        <th className="p-3">Teléfono</th>
                                        <th className="p-3">Grupo ID</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {alumnosPreview.map((item, index) => (
                                        <tr key={item.idTemp} className={item.esValido ? "hover:bg-slate-50" : "bg-red-50 hover:bg-red-100/50"}>
                                            <td className="p-3 text-center">
                                                {item.esValido ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold" title="Registro válido">
                                                        <CheckCircle size={16} /> Válido
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-red-600 text-xs font-semibold" title="Faltan datos obligatorios (Matrícula, Nombre o Grupo)">
                                                        <AlertTriangle size={16} /> Error
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={item.matricula}
                                                    onChange={(e) => handlePreviewChange(index, "matricula", e.target.value)}
                                                    className="border border-gray-300 rounded px-2 py-1 w-full text-xs bg-white"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={item.nombre}
                                                    onChange={(e) => handlePreviewChange(index, "nombre", e.target.value)}
                                                    className="border border-gray-300 rounded px-2 py-1 w-full text-xs bg-white"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={item.apellidoPaterno}
                                                    onChange={(e) => handlePreviewChange(index, "apellidoPaterno", e.target.value)}
                                                    className="border border-gray-300 rounded px-2 py-1 w-full text-xs bg-white"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={item.apellidoMaterno}
                                                    onChange={(e) => handlePreviewChange(index, "apellidoMaterno", e.target.value)}
                                                    className="border border-gray-300 rounded px-2 py-1 w-full text-xs bg-white"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={item.correoElectronico}
                                                    onChange={(e) => handlePreviewChange(index, "correoElectronico", e.target.value)}
                                                    className="border border-gray-300 rounded px-2 py-1 w-full text-xs bg-white"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={item.telefono}
                                                    onChange={(e) => handlePreviewChange(index, "telefono", e.target.value)}
                                                    className="border border-gray-300 rounded px-2 py-1 w-full text-xs bg-white"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={item.grupoId}
                                                    onChange={(e) => handlePreviewChange(index, "grupoId", e.target.value)}
                                                    className="border border-gray-300 rounded px-2 py-1 w-full text-xs bg-white"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                            <p className="text-xs text-slate-500">
                                Total de registros: <span className="font-bold">{alumnosPreview.length}</span> | 
                                Válidos para importar: <span className="font-bold text-emerald-600">{alumnosPreview.filter(a => a.esValido).length}</span>
                            </p>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setMostrarModalPreview(false)}
                                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    disabled={importando || alumnosPreview.filter(a => a.esValido).length === 0}
                                    onClick={confirmarImportacionMasiva}
                                    className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 shadow-md cursor-pointer disabled:opacity-50"
                                >
                                    {importando ? "Importando..." : "Confirmar e Importar"}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {camaraAlumno && (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm"
                    onClick={cerrarCamara}
                >
                    <section
                        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-700">Expediente digital</p>
                                <h2 className="mt-1 text-lg font-bold text-slate-900">Fotografía del alumno</h2>
                                <p className="text-xs text-slate-500">{camaraAlumno.nombre} {camaraAlumno.apellidoPaterno} · {camaraAlumno.matricula}</p>
                            </div>
                            <button type="button" onClick={cerrarCamara} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar cámara">
                                <X size={20} />
                            </button>
                        </header>

                        <div className="space-y-3 p-4 sm:p-5">
                            {errorCamara ? (
                                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
                                    <div className="mb-1 flex items-center gap-2 font-semibold"><AlertTriangle size={17} /> No se pudo abrir la cámara</div>
                                    {errorCamara}
                                    <p className="mt-2 text-xs text-rose-700">Comprueba los permisos del navegador y vuelve a intentarlo.</p>
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-xl bg-slate-950">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="block max-h-[62vh] min-h-[240px] w-full object-contain"
                                    />
                                </div>
                            )}
                            <p className="text-xs leading-5 text-slate-500">
                                Coloca al alumno frente a la cámara, con el rostro iluminado y centrado. La imagen se enviará al almacenamiento privado del expediente.
                            </p>
                        </div>

                        <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-4 py-4 sm:flex-row sm:justify-end">
                            <button type="button" onClick={cerrarCamara} className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={tomarFoto}
                                disabled={!!errorCamara || capturandoFoto}
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#078566] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#066e55] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Camera size={17} /> {capturandoFoto ? "Procesando..." : "Capturar y guardar"}
                            </button>
                        </footer>
                    </section>
                </div>
            )}

            {fotoModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setFotoModal(null)}>
                    <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-slate-800">Fotografía del alumno</h2><p className="text-sm text-slate-500">{fotoModal.alumno.nombre} {fotoModal.alumno.apellidoPaterno} · {fotoModal.alumno.matricula}</p></div><button onClick={() => setFotoModal(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div>
                        {fotoModal.url ? <img src={fotoModal.url} alt={`Fotografía de ${fotoModal.alumno.nombre}`} className="mx-auto max-h-[65vh] w-auto max-w-full rounded-xl object-contain" /> : <div className="flex h-56 flex-col items-center justify-center rounded-xl bg-slate-50 text-slate-400"><UserRound size={54}/><p className="mt-2 text-sm">{fotoModal.mensaje}</p></div>}
                    </div>
                </div>
            )}

            {/* Modal para Visualizar el Código QR */}
            {mostrarModalQR && alumnoSeleccionadoQR && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
                        <div className="flex justify-between items-center pb-3 mb-3 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-slate-800">
                                Credencial QR
                            </h2>
                            <button
                                onClick={() => setMostrarModalQR(false)}
                                className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="my-4 flex flex-col items-center">
                            <p className="font-semibold text-slate-700 text-base">
                                {alumnoSeleccionadoQR.nombre} {alumnoSeleccionadoQR.apellidoPaterno} {alumnoSeleccionadoQR.apellidoMaterno || ""}
                            </p>
                            <p className="text-xs text-slate-500 mb-4">
                                Matrícula: <span className="font-mono font-bold text-slate-700">{alumnoSeleccionadoQR.matricula}</span>
                            </p>

                            <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-inner inline-block">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                                        `Matrícula: ${alumnoSeleccionadoQR.matricula} \vert{} Nombre:${alumnoSeleccionadoQR.nombre} ${alumnoSeleccionadoQR.apellidoPaterno}${alumnoSeleccionadoQR.apellidoMaterno || ""}`
                                    )}`}
                                    alt={`QR de ${alumnoSeleccionadoQR.nombre}`}
                                    className="w-44 h-44 object-contain"
                                />
                            </div>

                            <p className="text-[11px] text-gray-400 mt-4">
                                Al escanear este código se obtendrá la matrícula y los datos completos del alumno.
                            </p>
                        </div>

                        <button
                            onClick={() => setMostrarModalQR(false)}
                            className="w-full bg-slate-100 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition cursor-pointer"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Alumnos;