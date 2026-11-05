/**
 * whatsapp.service.js
 *
 * Servicio central de notificaciones por WhatsApp Cloud API.
 * Compatible con el controlador actual de asistencias.
 *
 * MODO PRUEBA:
 * WHATSAPP_TEST_MODE=true
 * Envía exclusivamente a WHATSAPP_TEST_RECIPIENT.
 *
 * MODO REAL:
 * WHATSAPP_TEST_MODE=false
 * Envía al alumno y al tutor.
 */

const normalizarTelefono = (valor) => {
    let numero = String(valor ?? "")
        .trim()
        .replace(/\D/g, "");

    if (!numero) return null;

    // Normalización de números mexicanos.
    if (numero.startsWith("521") && numero.length === 13) {
        numero = `52${numero.slice(3)}`;
    } else if (numero.length === 10) {
        const codigoPais = String(
            process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "52"
        ).replace(/\D/g, "");

        numero = `${codigoPais}${numero}`;
    }

    return numero.length >= 10 && numero.length <= 15
        ? numero
        : null;
};

const enviarPlantillaWhatsApp = async ({ telefono }) => {
    const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
    const phoneNumberId =
        process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

    const nombrePlantilla =
        process.env.WHATSAPP_TEMPLATE_NAME?.trim();

    const idiomaPlantilla =
        process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "es_MX";

    const versionApi =
        process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || "v23.0";

    if (!token || !phoneNumberId || !nombrePlantilla) {
        return {
            enviado: false,
            motivo:
                "Falta configurar el token, el Phone Number ID " +
                "o el nombre de la plantilla."
        };
    }

    const destinatario = normalizarTelefono(telefono);

    if (!destinatario) {
        return {
            enviado: false,
            motivo: "El teléfono destinatario no es válido."
        };
    }

    const url =
        `https://graph.facebook.com/${versionApi}/` +
        `${phoneNumberId}/messages`;

    // Plantilla sin parámetros en el cuerpo.
    // Debe coincidir con una plantilla aprobada en Meta.
    const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: destinatario,
        type: "template",
        template: {
            name: nombrePlantilla,
            language: {
                code: idiomaPlantilla
            }
        }
    };

    let respuesta;

    try {
        respuesta = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15000)
        });
    } catch (error) {
        console.error(
            "[WhatsApp] Error de conexión:",
            error.message
        );

        return {
            enviado: false,
            motivo: error.message || "Error de conexión con Meta."
        };
    }

    const texto = await respuesta.text();
    let resultado = {};

    try {
        resultado = texto ? JSON.parse(texto) : {};
    } catch {
        resultado = { respuestaOriginal: texto };
    }

    if (!respuesta.ok) {
        const errorMeta = resultado?.error || {};

        console.error("[WhatsApp] Error de Meta:", {
            status: respuesta.status,
            codigo: errorMeta.code,
            subcodigo: errorMeta.error_subcode,
            mensaje: errorMeta.message,
            detalles: errorMeta.error_data?.details,
            plantilla: nombrePlantilla,
            idioma: idiomaPlantilla
        });

        return {
            enviado: false,
            motivo:
                errorMeta.message ||
                `Error HTTP ${respuesta.status}`,
            codigo: errorMeta.code ?? null,
            detalles: errorMeta.error_data?.details ?? null
        };
    }

    console.info("[WhatsApp] Solicitud aceptada por Meta:", {
        messageId: resultado?.messages?.[0]?.id || null,
        destinatario:
            destinatario.slice(0, 3) +
            "******" +
            destinatario.slice(-2)
    });

    return {
        enviado: true,
        messageId: resultado?.messages?.[0]?.id || null
    };
};

/**
 * Notifica la asistencia al alumno y a su tutor.
 * En modo prueba, todos los mensajes se redirigen
 * exclusivamente al teléfono de prueba configurado.
 */
export const notificarAsistenciaWhatsApp = async ({
    alumno,
    fechaHora,
    grupo
}) => {
    try {
        const token =
            process.env.WHATSAPP_ACCESS_TOKEN?.trim();

        const phoneNumberId =
            process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

        if (!token || !phoneNumberId) {
            console.warn(
                "[WhatsApp] No configurado. " +
                "La asistencia se conserva en la base de datos."
            );

            return {
                configurado: false,
                enviados: 0
            };
        }

        const modoPrueba =
            String(process.env.WHATSAPP_TEST_MODE ?? "true")
                .toLowerCase() === "true";

        let destinatarios = [];

        if (modoPrueba) {
            const telefonoPrueba = normalizarTelefono(
                process.env.WHATSAPP_TEST_RECIPIENT
            );

            if (!telefonoPrueba) {
                console.warn(
                    "[WhatsApp] Modo prueba activo, pero " +
                    "WHATSAPP_TEST_RECIPIENT no es válido."
                );

                return {
                    configurado: true,
                    modoPrueba: true,
                    enviados: 0,
                    motivo:
                        "Configura WHATSAPP_TEST_RECIPIENT " +
                        "con tu teléfono."
                };
            }

            // Nunca se utilizan los teléfonos de las familias
            // mientras el modo de prueba esté activo.
            destinatarios = [
                {
                    tipo: "prueba",
                    telefono: telefonoPrueba
                }
            ];
        } else {
            destinatarios = [
                {
                    tipo: "alumno",
                    telefono: normalizarTelefono(alumno?.telefono)
                },
                {
                    tipo: "tutor",
                    telefono: normalizarTelefono(
                        alumno?.Tutor?.telefono
                    )
                }
            ].filter((d) => d.telefono);

            // Evitar dos mensajes si comparten el mismo teléfono.
            const telefonosUnicos = new Map();

            for (const destinatario of destinatarios) {
                if (!telefonosUnicos.has(destinatario.telefono)) {
                    telefonosUnicos.set(
                        destinatario.telefono,
                        destinatario
                    );
                }
            }

            destinatarios = [...telefonosUnicos.values()];
        }

        if (destinatarios.length === 0) {
            console.warn(
                "[WhatsApp] No hay teléfonos válidos."
            );

            return {
                configurado: true,
                modoPrueba,
                enviados: 0,
                resultados: []
            };
        }

        console.info(
            `[WhatsApp] Modo ${modoPrueba ? "PRUEBA" : "REAL"}.`,
            `Destinatarios: ${destinatarios.length}`
        );

        const resultados = await Promise.all(
            destinatarios.map(async (destinatario) => {
                try {
                    const resultado =
                        await enviarPlantillaWhatsApp({
                            telefono: destinatario.telefono
                        });

                    return {
                        tipo: destinatario.tipo,
                        ...resultado
                    };
                } catch (error) {
                    console.error(
                        "[WhatsApp] Error con destinatario:",
                        error.message
                    );

                    return {
                        tipo: destinatario.tipo,
                        enviado: false,
                        motivo: error.message
                    };
                }
            })
        );

        const enviados = resultados.filter(
            (resultado) => resultado.enviado
        ).length;

        console.info("[WhatsApp] Resumen:", {
            modo: modoPrueba ? "PRUEBA" : "REAL",
            total: resultados.length,
            enviados,
            fallidos: resultados.length - enviados
        });

        return {
            configurado: true,
            modoPrueba,
            enviados,
            resultados
        };
    } catch (error) {
        console.error(
            "[WhatsApp] Error general:",
            error.message
        );

        // No propagamos el error para no afectar la asistencia.
        return {
            configurado: false,
            enviados: 0,
            error: true,
            motivo: error.message
        };
    }
};