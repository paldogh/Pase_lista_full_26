import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, AppState, Linking, Pressable, StyleSheet, Text, View, Vibration
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAttendance } from "../context/AttendanceContext";
import { registerFacialAttendance, FacialApiError } from "../services/facial.service";

type ResultState = "success" | "duplicate" | "not-found" | "error";

export default function FacialScannerScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const { addRecord } = useAttendance();

  const [permission, requestPermission] = useCameraPermissions();
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ state: ResultState; message: string; name?: string; group?: string } | null>(null);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener("change", (state) => {
      const active = state === "active";
      setAppActive(active);
      if (!active) setCameraReady(false);
    });
    return () => {
      mounted.current = false;
      abortRef.current?.abort();
      subscription.remove();
    };
  }, []);

  const identify = async () => {
    if (busy.current || !cameraReady || !cameraRef.current) return;
    busy.current = true;
    setLoading(true);
    setResult(null);
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.55,
        base64: true,
        skipProcessing: true,
      });
      if (!photo?.base64) throw new Error("No se pudo capturar la imagen. Intenta nuevamente.");

      const payload = await registerFacialAttendance(photo.base64, controller.signal);
      if (!mounted.current) return;
      const student = payload.alumno;
      const name = [student?.nombre, student?.apellidoPaterno, student?.apellidoMaterno]
        .filter(Boolean).join(" ");
      setResult({
        state: "success",
        message: payload.message || "Identidad confirmada y asistencia registrada.",
        name: name || student?.matricula,
        group: student?.grupo || undefined,
      });
      addRecord();
      Vibration.vibrate(180);
    } catch (error) {
      if (!mounted.current) return;
      if (error instanceof FacialApiError && error.status === 409) {
        setResult({ state: "duplicate", message: error.message });
      } else if (error instanceof FacialApiError && [404, 422].includes(error.status)) {
        setResult({ state: "not-found", message: error.message || "No se encontró una coincidencia suficiente." });
      } else {
        const message = controller.signal.aborted
          ? "La solicitud tardó demasiado. Verifica el historial antes de volver a intentar."
          : error instanceof Error ? error.message : "No fue posible completar el reconocimiento.";
        setResult({ state: "error", message });
      }
    } finally {
      clearTimeout(timeout);
      abortRef.current = null;
      busy.current = false;
      if (mounted.current) setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setCameraReady(false);
  };

  const statusColor = result?.state === "success" ? "#15803D"
    : result?.state === "duplicate" ? "#B45309" : "#B91C1C";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.page}>
        <Pressable onPress={() => router.replace("/attendance-method")} style={styles.back}>
          <Text style={styles.backText}>‹  Cambiar método</Text>
        </Pressable>
        <Text style={styles.brand}>PASELISTA SMART · FACIAL</Text>
        <Text style={styles.title}>Reconocimiento facial</Text>
        <Text style={styles.subtitle}>Coloca el rostro del alumno frente a la cámara y pulsa identificar.</Text>

        <View style={styles.camera}>
          {!permission ? (
            <View style={styles.center}><ActivityIndicator color="#fff" /><Text style={styles.cameraText}>Consultando permisos…</Text></View>
          ) : !permission.granted ? (
            <View style={styles.center}>
              <Text style={styles.cameraTitle}>Permiso de cámara requerido</Text>
              <Text style={styles.cameraText}>La cámara frontal se utiliza para identificar al alumno.</Text>
              <Pressable style={styles.button} onPress={() => permission.canAskAgain ? requestPermission() : Linking.openSettings()}>
                <Text style={styles.buttonText}>{permission.canAskAgain ? "Permitir cámara" : "Abrir ajustes"}</Text>
              </Pressable>
            </View>
          ) : cameraError ? (
            <View style={styles.center}>
              <Text style={styles.cameraTitle}>Cámara no disponible</Text>
              <Text style={styles.cameraText}>{cameraError}</Text>
              <Pressable style={styles.button} onPress={() => { setCameraError(""); setCameraReady(false); }}>
                <Text style={styles.buttonText}>Reintentar</Text>
              </Pressable>
            </View>
          ) : appActive ? (
            <>
              <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing="front"
                mode="picture"
                onCameraReady={() => setCameraReady(true)}
                onMountError={(event) => { setCameraError(event.message || "No se pudo iniciar la cámara."); setCameraReady(false); }}
              />
              <View pointerEvents="none" style={styles.faceGuide}>
                <View style={styles.oval} />
                <Text style={styles.guideText}>Centra el rostro dentro del óvalo</Text>
              </View>
            </>
          ) : <View style={styles.center}><Text style={styles.cameraText}>La cámara está pausada.</Text></View>}
        </View>

        {loading ? (
          <View style={styles.feedback}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.feedbackTitle}>Verificando identidad…</Text>
            <Text style={styles.feedbackText}>El servidor está comparando el rostro y validando la asistencia.</Text>
          </View>
        ) : result ? (
          <View style={styles.feedback}>
            <Text style={[styles.resultTitle, { color: statusColor }]}>
              {result.state === "success" ? "✓  Asistencia registrada"
                : result.state === "duplicate" ? "¡  Ya registrada"
                : result.state === "not-found" ? "Rostro no identificado" : "No se pudo completar"}
            </Text>
            {!!result.name && <Text style={styles.student}>{result.name}</Text>}
            {!!result.group && <Text style={styles.feedbackText}>Grupo: {result.group}</Text>}
            <Text style={styles.feedbackText}>{result.message}</Text>
            <Pressable style={styles.button} onPress={reset}>
              <Text style={styles.buttonText}>Identificar siguiente alumno</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.feedback}>
            <Text style={styles.feedbackTitle}>Listo para identificar</Text>
            <Text style={styles.feedbackText}>Buena iluminación, rostro visible y sin objetos que lo cubran.</Text>
            <Pressable disabled={!cameraReady || loading} style={[styles.button, (!cameraReady || loading) && styles.disabled]} onPress={identify}>
              <Text style={styles.buttonText}>{cameraReady ? "Identificar y registrar asistencia" : "Preparando cámara…"}</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.footer}>Si no se logra identificar al alumno, utiliza el lector QR como alternativa.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F1F5F9" },
  page: { flex: 1, padding: 18 },
  back: { minHeight: 38, justifyContent: "center", marginBottom: 10 },
  backText: { color: "#2563EB", fontWeight: "800" },
  brand: { color: "#047857", fontSize: 11, fontWeight: "900", letterSpacing: 1.6 },
  title: { color: "#0F172A", fontSize: 26, fontWeight: "900", marginTop: 7 },
  subtitle: { color: "#64748B", fontSize: 13, lineHeight: 20, marginTop: 6 },
  camera: { height: 350, backgroundColor: "#0F172A", borderRadius: 22, overflow: "hidden", marginTop: 18 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  cameraTitle: { color: "#fff", fontSize: 17, fontWeight: "800", textAlign: "center" },
  cameraText: { color: "#CBD5E1", textAlign: "center", lineHeight: 20, marginTop: 10, fontSize: 12 },
  faceGuide: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  oval: { width: 205, height: 260, borderWidth: 3, borderColor: "#34D399", borderRadius: 110 },
  guideText: { color: "#fff", backgroundColor: "#0F172ACC", overflow: "hidden", borderRadius: 9, padding: 9, marginTop: 18, fontSize: 12 },
  feedback: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 18, padding: 18, marginTop: 16, alignItems: "center" },
  feedbackTitle: { color: "#0F172A", fontWeight: "800", fontSize: 17 },
  feedbackText: { color: "#64748B", textAlign: "center", lineHeight: 19, fontSize: 12, marginTop: 7 },
  resultTitle: { fontSize: 17, fontWeight: "900", textAlign: "center" },
  student: { color: "#0F172A", fontWeight: "800", fontSize: 16, marginTop: 10 },
  button: { backgroundColor: "#047857", paddingVertical: 15, paddingHorizontal: 18, borderRadius: 12, marginTop: 16, width: "100%", alignItems: "center", minHeight: 50, justifyContent: "center" },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 13, textAlign: "center" },
  disabled: { opacity: 0.5 },
  footer: { color: "#64748B", fontSize: 11, textAlign: "center", lineHeight: 17, marginTop: 14 },
});
