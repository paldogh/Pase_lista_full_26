
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  FaceCamera,
  useCameraPermissions,
  useFaceCamera,
  useFaceValidation,
  type FaceRequirements,
  type GuidanceStatus,
} from "@rbayuokt/expo-face-vision";
import * as ImageManipulator from "expo-image-manipulator";

import { useAttendance } from "../context/AttendanceContext";
import {
  registerFacialAttendance,
  FacialApiError,
} from "../services/facial.service";

// ------------------------------------------------------
// CONFIGURACIÓN DE DETECCIÓN FACIAL
// ------------------------------------------------------

const FACE_REQUIREMENTS: FaceRequirements = {
  singleFace: true,

  guide: {
    width: 0.90,
    height: 0.75,
    centerY: 0.50,
  },

  minGuideCoverage: 0.75,

  minFaceSize: 0.3,

  lookingForward: true,

  eyesOpen: true,

  stableFor: 700,
};

// Mensajes que verá el alumno.
const FACE_HINTS: Partial<Record<GuidanceStatus, string>> = {
  NO_FACE: "Coloca tu rostro frente a la cámara",
  MOVE_CLOSER: "Acércate un poco más",
  MOVE_FARTHER: "Aléjate un poco de la cámara",
  LOOK_FORWARD: "Mira directamente a la cámara",
  OPEN_EYES: "Mantén los ojos abiertos",
  HOLD_STILL: "Mantén la posición...",
  READY: "¡Perfecto! Capturando fotografía",
};

// ------------------------------------------------------
// TIPOS
// ------------------------------------------------------

type ResultState = "success" | "duplicate" | "not-found" | "error";

type Student = {
  nombre?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  matricula?: string;
  grupo?: string | null;
};

type AttendanceResult = {
  state: ResultState;
  message: string;
  name?: string;
  group?: string;
  time: string;
};

// ------------------------------------------------------
// PANTALLA PRINCIPAL
// ------------------------------------------------------

export default function FacialScannerScreen() {
  const router = useRouter();
  const camera = useFaceCamera();

  const { addRecord } = useAttendance();

  const [permission, requestPermission] = useCameraPermissions();

  const [appActive, setAppActive] = useState(
    AppState.currentState === "active"
  );

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [permissionError, setPermissionError] = useState("");
  const [cameraActive, setCameraActive] = useState(true);

  const busy = useRef(false);
  const mounted = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  // ----------------------------------------------------
  // VALIDACIÓN DEL ROSTRO EN TIEMPO REAL
  // ----------------------------------------------------

const { validation, guidance, status } = useFaceValidation(
  FACE_REQUIREMENTS,
  { camera }
);

const valid = validation?.valid ?? false;

  const faceHint =
    (status && FACE_HINTS[status]) ||
    "Buscando rostro...";

  // Diagnóstico temporal: evita imprimir un mensaje por cada fotograma.
  const lastFaceCount = useRef<number | null>(null);

  useEffect(() => {
 
    console.log("[FACIAL DEBUG] Validación detallada:", {
  valid: validation?.valid,
  status,
  guidance,
  issues: validation?.issues?.map((issue) => ({
    code: issue.code,
    message: issue.message,
  })),
});
  }, [status, valid]);

  // ----------------------------------------------------
  // ESTADO DE LA APLICACIÓN
  // ----------------------------------------------------

  useEffect(() => {
    mounted.current = true;

    const subscription = AppState.addEventListener(
      "change",
      (state) => {
        const active = state === "active";

        setAppActive(active);

        if (!active) {
          setCameraActive(false);
        } else {
          setCameraActive(true);
        }
      }
    );

    return () => {
      mounted.current = false;
      abortRef.current?.abort();
      subscription.remove();
    };
  }, []);

  // ----------------------------------------------------
  // FORMATO DE HORA
  // ----------------------------------------------------

  const getCurrentTime = () =>
    new Date().toLocaleTimeString("es-MX", {
      timeZone: "America/Mexico_City",
      hour: "2-digit",
      minute: "2-digit",
    });

  // ----------------------------------------------------
  // PROCESAR FOTOGRAFÍA Y REGISTRAR ASISTENCIA
  // ----------------------------------------------------

  const handleCapture = useCallback(
    async ({ photo }: { photo: { uri: string } }) => {
      if (busy.current || !photo?.uri) {
        return;
      }

      busy.current = true;
      setLoading(true);
      setResult(null);
      setCameraActive(false);

      const controller = new AbortController();
      abortRef.current = controller;

      // Timeout para el reconocimiento facial en el servidor.
      const timeout = setTimeout(() => {
        controller.abort();
      }, 210000);

      try {
        console.log("[FACIAL] Fotografía capturada automáticamente");

        // 1. Comprimir y redimensionar.
        const compressed = await ImageManipulator.manipulateAsync(
          photo.uri,
          [
            {
              resize: {
                width: 640,
              },
            },
          ],
          {
            compress: 0.45,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          }
        );

        if (!compressed.base64) {
          throw new Error("No se pudo procesar la fotografía.");
        }

        console.log(
          "[FACIAL] Imagen preparada:",
          compressed.width,
          "x",
          compressed.height
        );

        console.log(
          "[FACIAL] Tamaño aproximado:",
          Math.round(compressed.base64.length * 0.75 / 1024),
          "KB"
        );

        // 2. Enviar al backend existente.
        const payload = await registerFacialAttendance(
          compressed.base64,
          controller.signal
        );

        if (!mounted.current) return;

        const student: Student | undefined = payload.alumno;

        const name = [
          student?.nombre,
          student?.apellidoPaterno,
          student?.apellidoMaterno,
        ]
          .filter(
            (part): part is string =>
              typeof part === "string" && part.length > 0
          )
          .join(" ");

        // 3. Mostrar el resultado confirmado por el backend.
        setResult({
          state: "success",
          message:
            payload.message ||
            "Identidad confirmada y asistencia registrada.",
          name: name || student?.matricula,
          group: student?.grupo || undefined,
          time: getCurrentTime(),
        });

        // 4. Actualizar el resumen de asistencias.
        addRecord();

        Vibration.vibrate(180);

        console.log("[FACIAL] Asistencia registrada correctamente");

      } catch (error) {
        if (!mounted.current) return;

        console.error("[FACIAL] Error:", error);

        if (
          error instanceof FacialApiError &&
          error.status === 409
        ) {
          setResult({
            state: "duplicate",
            message: error.message,
            time: getCurrentTime(),
          });

        } else if (
          error instanceof FacialApiError &&
          [404, 422].includes(error.status)
        ) {
          setResult({
            state: "not-found",
            message:
              error.message ||
              "No se encontró una coincidencia suficiente.",
            time: getCurrentTime(),
          });

        } else {
          setResult({
            state: "error",
            message: controller.signal.aborted
              ? "El servidor tardó demasiado. Verifica si la asistencia se guardó antes de volver a intentar."
              : error instanceof Error
                ? error.message
                : "No fue posible completar el reconocimiento.",
            time: getCurrentTime(),
          });
        }

      } finally {
        clearTimeout(timeout);
        abortRef.current = null;
        busy.current = false;

        if (mounted.current) {
          setLoading(false);
        }
      }
    },
    [addRecord]
  );

  // ----------------------------------------------------
  // REINTENTAR CON EL SIGUIENTE ALUMNO
  // ----------------------------------------------------

  const identifyNext = () => {
    if (busy.current) return;

    setResult(null);
    setLoading(false);
    setCameraActive(true);
  };

  // ----------------------------------------------------
  // PERMISOS DE CÁMARA
  // ----------------------------------------------------

  const enableCamera = async () => {
    setPermissionError("");

    try {
      if (permission?.canAskAgain === false) {
        await Linking.openSettings();
      } else {
        await requestPermission();
      }
    } catch {
      setPermissionError(
        "No se pudieron abrir los permisos. Revisa los ajustes del teléfono."
      );
    }
  };

  // ----------------------------------------------------
  // PRESENTACIÓN DEL RESULTADO
  // ----------------------------------------------------

  const resultColor =
    result?.state === "success"
      ? "#059669"
      : result?.state === "duplicate"
        ? "#D97706"
        : "#DC2626";

  const resultTitle =
    result?.state === "success"
      ? "¡Asistencia registrada!"
      : result?.state === "duplicate"
        ? "Asistencia ya registrada"
        : result?.state === "not-found"
          ? "Rostro no identificado"
          : "No se pudo completar";

  // ----------------------------------------------------
  // INTERFAZ
  // ----------------------------------------------------

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.page}>

        {/* ENCABEZADO */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.replace("/attendance-method")}
            style={styles.back}
          >
            <Text style={styles.backText}>
              ‹  Cambiar método
            </Text>
          </Pressable>

          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Text style={styles.brandIconText}>◎</Text>
            </View>

            <View>
              <Text style={styles.brand}>
                PASELISTA SMART
              </Text>
              <Text style={styles.brandSub}>
                IDENTIFICACIÓN INTELIGENTE
              </Text>
            </View>

            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          <Text style={styles.title}>
            Reconocimiento facial
          </Text>

          <Text style={styles.subtitle}>
            Coloca tu rostro frente a la cámara. La fotografía
            y el registro se realizan automáticamente.
          </Text>
        </View>

        {/* CÁMARA */}
        <View style={styles.cameraCard}>
          <View style={styles.cameraHeader}>
            <View>
              <Text style={styles.cameraLabel}>
                ESCÁNER FACIAL
              </Text>
              <Text style={styles.cameraSub}>
                Detección en tiempo real
              </Text>
            </View>

            <View style={styles.secureBadge}>
              <Text style={styles.secureText}>
                ● PROTEGIDO
              </Text>
            </View>
          </View>

          <View style={styles.cameraWindow}>

            {!permission ? (
              <View style={styles.center}>
                <ActivityIndicator color="#34D399" size="large" />
                <Text style={styles.cameraMessage}>
                  Preparando cámara...
                </Text>
              </View>

            ) : !permission.granted ? (
              <View style={styles.center}>
                <Text style={styles.permissionIcon}>◎</Text>
                <Text style={styles.cameraHeading}>
                  Permiso de cámara
                </Text>
                <Text style={styles.cameraMessage}>
                  Necesitamos acceder a la cámara frontal para
                  detectar el rostro.
                </Text>

                <Pressable
                  style={styles.permissionButton}
                  onPress={enableCamera}
                >
                  <Text style={styles.permissionButtonText}>
                    {permission.canAskAgain
                      ? "Permitir cámara"
                      : "Abrir ajustes"}
                  </Text>
                </Pressable>

                {!!permissionError && (
                  <Text style={styles.errorText}>
                    {permissionError}
                  </Text>
                )}
              </View>

            ) : appActive && cameraActive && !result && !loading ? (
              <>
                <FaceCamera
                  camera={camera}
                  style={StyleSheet.absoluteFill}
                  facing="front"
                  active={true}
                  inferenceFps={12}
                  detection={{
                    performanceMode: "fast",
                    landmarks: true,
                  }}
                  autoCapture
                  continuous
                  requirements={FACE_REQUIREMENTS}
                  stableFor={700}
                  countdown={0}
                  cooldown={1200}
                  onCameraReady={(info) => {
                    console.log("[FACIAL DEBUG] Cámara lista:", info?.frame);
                  }}
                  onCameraError={(error) => {
                    console.error("[FACIAL DEBUG] Error de cámara:", error);
                  }}
                  onFrame={(frame) => {
                    const count = frame?.faces?.length ?? 0;

                    // Registrar solamente cuando cambia la cantidad de rostros.
                    if (lastFaceCount.current !== count) {
                      lastFaceCount.current = count;
                      console.log(
                        "[FACIAL DEBUG] Fotogramas recibidos. Rostros:",
                        count,
                        "Datos del frame:",
                        frame
                      );
                    }
                  }}
                  onAutoCaptureStateChange={(state) => {
                    console.log("[FACIAL DEBUG] AutoCapture:", state);
                  }}
                  onCaptureError={(error) => {
                    console.error("[FACIAL DEBUG] Error de captura:", error);
                  }}
                  onCapture={handleCapture}
                />

                {/* GUÍA VISUAL */}
                <View
                  pointerEvents="none"
                  style={styles.guideLayer}
                >
                  <View
                    style={[
                      styles.faceOval,
                      {
                        borderColor: valid
                          ? "#34D399"
                          : "#FFFFFF",
                      },
                    ]}
                  />

                  <View style={styles.scanLine} />

                  <View style={styles.guideBottom}>
                    <Text style={styles.guideHint}>
                      {faceHint}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.center}>
                {loading ? (
                  <>
                    <ActivityIndicator
                      color="#34D399"
                      size="large"
                    />
                    <Text style={styles.cameraHeading}>
                      Procesando identidad
                    </Text>
                    <Text style={styles.cameraMessage}>
                      Enviando fotografía y verificando asistencia...
                    </Text>
                  </>
                ) : result ? (
                  <>
                    <Text style={styles.cameraHeading}>
                      Proceso finalizado
                    </Text>
                    <Text style={styles.cameraMessage}>
                      Consulta el resultado de tu registro abajo.
                    </Text>
                  </>
                ) : (
                  <Text style={styles.cameraMessage}>
                    La cámara está pausada.
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* ESTADO DE DETECCIÓN */}
          <View style={styles.cameraFooter}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: loading
                    ? "#F59E0B"
                    : result?.state === "success"
                      ? "#10B981"
                      : "#34D399",
                },
              ]}
            />

            <Text style={styles.cameraFooterText}>
              {loading
                ? "Verificando con el servidor..."
                : result
                  ? "Detección pausada"
                  : permission?.granted
                    ? faceHint
                    : "Esperando permiso de cámara"}
            </Text>
          </View>
        </View>

        {/* RESULTADO */}
        {result ? (
          <View style={styles.resultCard}>
            <View
              style={[
                styles.resultIcon,
                {
                  backgroundColor:
                    result.state === "success"
                      ? "#D1FAE5"
                      : result.state === "duplicate"
                        ? "#FEF3C7"
                        : "#FEE2E2",
                },
              ]}
            >
              <Text
                style={[
                  styles.resultSymbol,
                  { color: resultColor },
                ]}
              >
                {result.state === "success"
                  ? "✓"
                  : result.state === "duplicate"
                    ? "!"
                    : "×"}
              </Text>
            </View>

            <Text
              style={[
                styles.resultTitle,
                { color: resultColor },
              ]}
            >
              {resultTitle}
            </Text>

            {!!result.name && (
              <Text style={styles.studentName}>
                {result.name}
              </Text>
            )}

            {!!result.group && (
              <Text style={styles.studentGroup}>
                Grupo: {result.group}
              </Text>
            )}

            <Text style={styles.resultMessage}>
              {result.message}
            </Text>

            <Text style={styles.resultTime}>
              Hora de respuesta: {result.time}
            </Text>

            <Pressable
              style={styles.primaryButton}
              onPress={identifyNext}
            >
              <Text style={styles.primaryButtonText}>
                Identificar siguiente alumno →
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>
              ¿Cómo registrar tu asistencia?
            </Text>

            <View style={styles.instructionRow}>
              <Text style={styles.stepNumber}>01</Text>
              <Text style={styles.instructionText}>
                Coloca tu rostro dentro del óvalo.
              </Text>
            </View>

            <View style={styles.instructionRow}>
              <Text style={styles.stepNumber}>02</Text>
              <Text style={styles.instructionText}>
                Mira al frente y permanece quieto.
              </Text>
            </View>

            <View style={styles.instructionRow}>
              <Text style={styles.stepNumber}>03</Text>
              <Text style={styles.instructionText}>
                El sistema tomará la fotografía y registrará tu asistencia.
              </Text>
            </View>
          </View>
        )}

        {/* PIE */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            PASELISTA SMART · CONTROL DE ASISTENCIA
          </Text>
          <Text style={styles.footerSub}>
            Si no es posible identificarte, utiliza el lector QR.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ------------------------------------------------------
// DISEÑO
// ------------------------------------------------------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  page: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
  },

  header: {
    marginBottom: 15,
  },

  back: {
    minHeight: 34,
    justifyContent: "center",
    marginBottom: 10,
  },

  backText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "800",
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  brandIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },

  brandIconText: {
    color: "#047857",
    fontSize: 29,
    fontWeight: "800",
  },

  brand: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  brandSub: {
    color: "#64748B",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginTop: 3,
  },

  liveBadge: {
    marginLeft: "auto",
    backgroundColor: "#DCFCE7",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },

  liveText: {
    color: "#15803D",
    fontSize: 9,
    fontWeight: "900",
  },

  title: {
    color: "#0F172A",
    fontSize: 25,
    fontWeight: "900",
    marginTop: 16,
    letterSpacing: -0.6,
  },

  subtitle: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },

  cameraCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 23,
    padding: 12,
    borderWidth: 1,
    borderColor: "#DCE5EF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  cameraHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingBottom: 12,
  },

  cameraLabel: {
    color: "#0F172A",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  cameraSub: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 3,
  },

  secureBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },

  secureText: {
    color: "#047857",
    fontSize: 8,
    fontWeight: "900",
  },

  cameraWindow: {
    height: 335,
    backgroundColor: "#0F172A",
    borderRadius: 17,
    overflow: "hidden",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },

  permissionIcon: {
    color: "#34D399",
    fontSize: 52,
    marginBottom: 12,
  },

  cameraHeading: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 12,
  },

  cameraMessage: {
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 9,
  },

  permissionButton: {
    backgroundColor: "#059669",
    borderRadius: 11,
    paddingHorizontal: 20,
    paddingVertical: 13,
    marginTop: 20,
  },

  permissionButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
  },

  errorText: {
    color: "#FCA5A5",
    fontSize: 11,
    marginTop: 10,
    textAlign: "center",
  },

  guideLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },

  faceOval: {
    width: 218,
    height: 268,
    borderWidth: 3,
    borderRadius: 125,
    borderColor: "#FFFFFF",
    backgroundColor: "transparent",
  },

  scanLine: {
    position: "absolute",
    top: "49%",
    width: 180,
    height: 1,
    backgroundColor: "#34D399",
    opacity: 0.75,
  },

  guideBottom: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    backgroundColor: "rgba(15,23,42,0.82)",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },

  guideHint: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },

  cameraFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 6,
    paddingTop: 12,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34D399",
  },

  cameraFooterText: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "700",
    flex: 1,
  },

  instructionCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 15,
    marginTop: 13,
  },

  instructionTitle: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 11,
  },

  instructionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginTop: 7,
  },

  stepNumber: {
    color: "#059669",
    backgroundColor: "#D1FAE5",
    borderRadius: 8,
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: "900",
  },

  instructionText: {
    color: "#475569",
    fontSize: 11,
    lineHeight: 17,
    flex: 1,
  },

  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 17,
    marginTop: 13,
    alignItems: "center",
  },

  resultIcon: {
    width: 53,
    height: 53,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },

  resultSymbol: {
    fontSize: 30,
    fontWeight: "900",
  },

  resultTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginTop: 10,
    textAlign: "center",
  },

  studentName: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 9,
    textAlign: "center",
  },

  studentGroup: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 4,
  },

  resultMessage: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 9,
    textAlign: "center",
  },

  resultTime: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 9,
  },

  primaryButton: {
    width: "100%",
    backgroundColor: "#047857",
    borderRadius: 12,
    minHeight: 47,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  footer: {
    marginTop: "auto",
    alignItems: "center",
    paddingTop: 12,
  },

  footerText: {
    color: "#64748B",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  footerSub: {
    color: "#94A3B8",
    fontSize: 9,
    marginTop: 5,
    textAlign: "center",
  },
});
