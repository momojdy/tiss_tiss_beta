import React from "react";
import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

const LOGO_URL =
  "https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/WantisslogoOuterless.PNG";

export default function App() {
  const [isRegister, setIsRegister] = React.useState(false);
  const [isBusiness, setIsBusiness] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View style={styles.topSection}>
          <Image
            source={{ uri: LOGO_URL }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.card}>
          <View style={styles.roleToggle}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                !isBusiness && styles.roleButtonActive,
              ]}
              onPress={() => setIsBusiness(false)}
            >
              <Text
                style={[styles.roleText, !isBusiness && styles.roleTextActive]}
              >
                Buyer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleButton, isBusiness && styles.roleButtonActive]}
              onPress={() => setIsBusiness(true)}
            >
              <Text
                style={[styles.roleText, isBusiness && styles.roleTextActive]}
              >
                B&P 2P
              </Text>
            </TouchableOpacity>
          </View>

          {isBusiness && (
            <Text style={styles.businessLabel}>Business Space</Text>
          )}

          {isRegister && isBusiness && (
            <>
              <TextInput
                placeholder="Full name"
                placeholderTextColor="#9A4B68"
                style={styles.input}
              />
              <TextInput
                placeholder="Business name"
                placeholderTextColor="#9A4B68"
                style={styles.input}
              />
            </>
          )}

          <TextInput
            placeholder="Email"
            placeholderTextColor="#9A4B68"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Password"
              placeholderTextColor="#9A4B68"
              secureTextEntry={!showPassword}
              style={styles.passwordInput}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((value) => !value)}
            >
              <Text style={styles.eye}>{showPassword ? "◉" : "○"}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotButton}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.submitButton}>
            <Text style={styles.submitText}>
              {isRegister ? "Sign Up" : "Sign In"}
            </Text>
          </TouchableOpacity>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialGoogle}>G</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialApple}>●</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>
            {isRegister ? "Already have an account?" : "Don't have an account?"}
          </Text>
          <TouchableOpacity onPress={() => setIsRegister((value) => !value)}>
            <Text style={styles.switchAction}>
              {isRegister ? " Sign in" : " Register"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F1F4F8",
  },
  container: {
    flex: 1,
  },
  topSection: {
    height: 356,
    width: "100%",
    paddingTop: 50,
    paddingLeft: 20,
    paddingRight: 30,
    paddingBottom: 25,
    backgroundColor: "#FBEAF3",
  },
  logo: {
    flex: 1,
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  card: {
    marginHorizontal: 15,
    marginTop: -56,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    minHeight: 485,
    paddingHorizontal: 15,
    paddingTop: 24,
  },
  roleToggle: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E3E7",
    padding: 2,
    flexDirection: "row",
  },
  roleButton: {
    flex: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  roleButtonActive: {
    backgroundColor: "#BF008E",
  },
  roleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#949090",
  },
  roleTextActive: {
    color: "#FFFFFF",
  },
  businessLabel: {
    color: "#D52F4F",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 7,
    marginBottom: 3,
    marginLeft: 160,
  },
  input: {
    height: 60,
    backgroundColor: "#FBE8EF",
    borderRadius: 15,
    paddingHorizontal: 18,
    marginTop: 10,
    fontSize: 18,
    color: "#9A4B68",
  },
  passwordContainer: {
    height: 60,
    backgroundColor: "#FBE8EF",
    borderRadius: 15,
    marginTop: 10,
    paddingLeft: 18,
    paddingRight: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    fontSize: 18,
    color: "#9A4B68",
  },
  eye: {
    fontSize: 22,
    color: "#9A4B68",
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginTop: 9,
  },
  forgotText: {
    color: "#9D315B",
    fontSize: 14,
    fontWeight: "600",
  },
  submitButton: {
    height: 60,
    borderRadius: 15,
    backgroundColor: "#BF008E",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginHorizontal: 15,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 90,
    marginTop: 30,
  },
  socialButton: {
    width: 100,
    height: 50,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "#9A4B68",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  socialGoogle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#4285F4",
  },
  socialApple: {
    fontSize: 24,
    color: "#000000",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    paddingBottom: 10,
  },
  switchText: {
    fontSize: 15,
    color: "#14181B",
  },
  switchAction: {
    fontSize: 14.5,
    fontWeight: "600",
    color: "#9D315B",
  },
});
