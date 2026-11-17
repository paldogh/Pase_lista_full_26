import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function AttendanceMethodScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>PASELISTA SMART</Text>
          <Text style={styles.title}>Control de asistencia</Text>
          <Text style={styles.subtitle}>
            Selecciona el método de identificación para comenzar a registrar.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/scanner")}
          style={({ pressed }) => [styles.option, styles.qr, pressed && styles.pressed]}
        >
          <View style={[styles.iconBox, { backgroundColor: "#DBEAFE" }]}>
            <Text style={styles.icon}>▦</Text>
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Lector QR</Text>
            <Text style={styles.description}>
              Escanea la credencial del alumno con la cámara.
            </Text>
            <Text style={styles.action}>INICIAR LECTOR  →</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/facial-scanner")}
          style={({ pressed }) => [styles.option, styles.face, pressed && styles.pressed]}
        >
          <View style={[styles.iconBox, { backgroundColor: "#D1FAE5" }]}>
            <Text style={[styles.icon, { color: "#047857" }]}>◎</Text>
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Reconocimiento facial</Text>
            <Text style={styles.description}>
              Identifica al alumno mediante la cámara frontal, sin mostrar una credencial.
            </Text>
            <Text style={[styles.action, { color: "#047857" }]}>INICIAR RECONOCIMIENTO  →</Text>
          </View>
        </Pressable>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>Asistencia segura</Text>
          <Text style={styles.noteText}>
            Cada registro se valida en el servidor. Si el rostro no puede identificarse,
            el docente puede volver a intentar o utilizar el lector QR.
          </Text>
        </View>

        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>Volver al panel</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F1F5F9" },
  page: { flexGrow: 1, padding: 20, justifyContent: "center" },
  header: { marginBottom: 26 },
  brand: { color: "#2563EB", fontSize: 12, fontWeight: "900", letterSpacing: 2 },
  title: { color: "#0F172A", fontSize: 29, fontWeight: "900", marginTop: 10 },
  subtitle: { color: "#64748B", fontSize: 14, lineHeight: 21, marginTop: 8 },
  option: { flexDirection: "row", alignItems: "center", borderRadius: 22, padding: 18,
    marginBottom: 15, borderWidth: 1, backgroundColor: "#FFFFFF", gap: 15 },
  qr: { borderColor: "#BFDBFE" },
  face: { borderColor: "#A7F3D0" },
  iconBox: { width: 62, height: 62, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  icon: { fontSize: 37, fontWeight: "700", color: "#1D4ED8" },
  optionText: { flex: 1 },
  optionTitle: { color: "#0F172A", fontSize: 18, fontWeight: "800" },
  description: { color: "#64748B", fontSize: 12, lineHeight: 18, marginTop: 5 },
  action: { color: "#1D4ED8", fontSize: 11, fontWeight: "900", marginTop: 13, letterSpacing: 0.4 },
  note: { backgroundColor: "#E2E8F0", borderRadius: 16, padding: 16, marginTop: 8 },
  noteTitle: { color: "#334155", fontWeight: "800", fontSize: 13 },
  noteText: { color: "#475569", fontSize: 12, lineHeight: 19, marginTop: 5 },
  back: { alignItems: "center", padding: 16, marginTop: 8 },
  backText: { color: "#2563EB", fontWeight: "700" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
