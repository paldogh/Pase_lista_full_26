import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import FacialAttendanceScreen from "./FacialAttendanceScreen";

type Props = {
  qrScreen: ReactNode;
};

type Mode = "qr" | "facial";

/**
 * Envuelve la pantalla QR que ya existe.
 * Ejemplo: <AttendanceModeSwitcher qrScreen={<TuPantallaQR />} />
 */
export default function AttendanceModeSwitcher({ qrScreen }: Props) {
  const [mode, setMode] = useState<Mode>("qr");

  return (
    <View style={styles.container}>
      <View style={styles.switcher}>
        <Pressable
          onPress={() => setMode("qr")}
          style={[styles.option, mode === "qr" && styles.activeQR]}
        >
          <Text style={[styles.optionText, mode === "qr" && styles.activeText]}>▦  QR</Text>
        </Pressable>
        <Pressable
          onPress={() => setMode("facial")}
          style={[styles.option, mode === "facial" && styles.activeFacial]}
        >
          <Text style={[styles.optionText, mode === "facial" && styles.activeText]}>
            ◉  FACIAL
          </Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {mode === "qr" ? qrScreen : (
          <FacialAttendanceScreen onBackToQR={() => setMode("qr")} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FC" },
  switcher: {
    flexDirection: "row", margin: 14, padding: 4,
    borderRadius: 14, backgroundColor: "#E2E8F0",
  },
  option: { flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: "center" },
  activeQR: { backgroundColor: "#DBEAFE" },
  activeFacial: { backgroundColor: "#EDE9FE" },
  optionText: { color: "#64748B", fontWeight: "800", fontSize: 13 },
  activeText: { color: "#312E81" },
  content: { flex: 1 },
});
