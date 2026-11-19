import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { registerFacialAttendance } from "../services/facial.service";
import type { FacialAttendanceResponse } from "../types/attendance.types";

type Props = {
  onBackToQR?: () => void;
};

function getStudentLabel(result: FacialAttendanceResponse) {
  const student = result.alumno ?? result.student;
  if (!student) return "Alumno identificado";
  const fullName = [student.nombre, student.apellidos].filter(Boolean).join(" ");
  return fullName || student.matricula || "Alumno identificado";
}

export default function FacialAttendanceScreen({ onBackToQR }: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("Coloca el rostro del alumno dentro del marco.");
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState<FacialAttendanceResponse | null>(null);

  const captureAndRegister = async () => {
    if (!cameraRef.current || processing) return;

    setProcessing(true);
    setError("");
    setLastResult(null);
    setMessage("Capturando fotografía...");

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.75,
        skipProcessing: true,
      });

      if (!photo?.base64) {
        throw new Error("No fue posible obtener la fotografía. Intenta nuevamente.");
      }

      setMessage("Analizando rostro y registrando asistencia...");
      const result = await registerFacialAttendance(photo.base64);
      setLastResult(result);
      setMessage(`Asistencia registrada: ${getStudentLabel(result)}`);
    } catch (err) {
      const text =
        err instanceof Error ? err.message : "Ocurrió un error al procesar el rostro.";
      setError(text);
      setMessage("No se pudo completar el reconocimiento.");
    } finally {
      setProcessing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6D28D9" />
        <Text style={styles.helper}>Comprobando permisos de cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Permiso de cámara</Text>
        <Text style={styles.helper}>
          PaseLista necesita utilizar la cámara para identificar al alumno y registrar su asistencia.
        </Text>
        <Pressable style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Permitir cámara</Text>
        </Pressable>
        {onBackToQR ? (
          <Pressable style={styles.secondaryButton} onPress={onBackToQR}>
            <Text style={styles.secondaryButtonText}>Volver a QR</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Asistencia facial</Text>
          <Text style={styles.helper}>Centra el rostro y toma la fotografía</Text>
        </View>
        {onBackToQR ? (
          <Pressable style={styles.modeButton} onPress={onBackToQR}>
            <Text style={styles.modeButtonText}>Cambiar a QR</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.cameraFrame}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          mode="picture"
        />
        <View pointerEvents="none" style={styles.faceGuide}>
          <View style={styles.faceOval} />
        </View>
      </View>

      <Text style={styles.instruction}>
        Asegúrate de que haya buena iluminación y que solo aparezca un rostro.
      </Text>

      <Pressable
        style={[styles.primaryButton, processing && styles.disabledButton]}
        onPress={captureAndRegister}
        disabled={processing}
      >
        {processing ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>Capturar y reconocer rostro</Text>
        )}
      </Pressable>

      <View style={[styles.resultBox, error ? styles.errorBox : lastResult ? styles.successBox : null]}>
        <Text style={styles.resultTitle}>
          {error ? "No se pudo registrar" : lastResult ? "Registro completado" : "Estado"}
        </Text>
        <Text style={styles.resultText}>{error || message}</Text>
        {lastResult?.asistencia?.hora ? (
          <Text style={styles.resultMeta}>Hora: {lastResult.asistencia.hora}</Text>
        ) : null}
        {lastResult?.distance !== undefined ? (
          <Text style={styles.resultMeta}>
            Distancia facial: {String(lastResult.distance)}
          </Text>
        ) : null}
      </View>

      <Text style={styles.disclaimer}>
        La fotografía se envía al servidor para el reconocimiento. No se registra asistencia
        hasta que el backend confirme la operación.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 14, backgroundColor: "#F7F8FC" },
  center: {
    flex: 1, alignItems: "center", justifyContent: "center",
    padding: 24, gap: 14, backgroundColor: "#F7F8FC",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  title: { fontSize: 23, fontWeight: "800", color: "#172033" },
  helper: { color: "#64748B", fontSize: 14, marginTop: 4, textAlign: "center" },
  cameraFrame: {
    width: "100%", height: 360, overflow: "hidden",
    borderRadius: 22, backgroundColor: "#111827",
  },
  faceGuide: {
    ...StyleSheet.absoluteFillObject, alignItems: "center",
    justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.25)",
  },
  faceOval: {
    width: 218, height: 280, borderRadius: 140,
    borderWidth: 3, borderColor: "#A78BFA", backgroundColor: "transparent",
  },
  instruction: { color: "#475569", textAlign: "center", fontSize: 13, lineHeight: 19 },
  primaryButton: {
    minHeight: 52, borderRadius: 14, backgroundColor: "#6D28D9",
    alignItems: "center", justifyContent: "center", paddingHorizontal: 18,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  disabledButton: { opacity: 0.65 },
  secondaryButton: {
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12,
    borderWidth: 1, borderColor: "#CBD5E1",
  },
  secondaryButtonText: { color: "#334155", fontWeight: "700" },
  modeButton: { backgroundColor: "#EDE9FE", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  modeButtonText: { color: "#5B21B6", fontWeight: "800", fontSize: 12 },
  resultBox: { padding: 14, borderRadius: 14, backgroundColor: "#E2E8F0", gap: 4 },
  successBox: { backgroundColor: "#DCFCE7" },
  errorBox: { backgroundColor: "#FEE2E2" },
  resultTitle: { color: "#172033", fontWeight: "800" },
  resultText: { color: "#334155", lineHeight: 20 },
  resultMeta: { color: "#475569", fontSize: 12 },
  disclaimer: { color: "#64748B", fontSize: 11, lineHeight: 16, textAlign: "center" },
});
