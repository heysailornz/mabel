import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/auth-context";
import { requestOTPSchema, verifyOTPSchema } from "@project/core/auth";

export default function AuthScreen() {
  const router = useRouter();
  const { requestOTP, verifyOTP } = useAuth();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestOTP = async () => {
    const validation = requestOTPSchema.safeParse({ email });
    if (!validation.success) {
      Alert.alert("Validation Error", validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    const result = await requestOTP(email);
    setLoading(false);

    if (result.error) {
      Alert.alert("Error", result.error);
    } else {
      setStep("otp");
      Alert.alert("Code Sent", "Check your email for the verification code.");
    }
  };

  const handleVerifyOTP = async () => {
    const validation = verifyOTPSchema.safeParse({ email, token });
    if (!validation.success) {
      Alert.alert("Validation Error", validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    const result = await verifyOTP(email, token);
    setLoading(false);

    if (result.error) {
      Alert.alert("Error", result.error);
    } else {
      router.replace("/(app)");
    }
  };

  if (step === "otp") {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Enter Code</Text>
          <Text style={styles.subtitle}>We sent a code to {email}</Text>

          <TextInput
            placeholder="123456"
            value={token}
            onChangeText={setToken}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
            placeholderTextColor="#999"
            autoFocus
          />

          <TouchableOpacity
            onPress={handleVerifyOTP}
            disabled={loading}
            style={[styles.button, loading && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {loading ? "Verifying..." : "Continue"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => {
              setStep("email");
              setToken("");
            }}
          >
            <Text style={styles.linkText}>Use a different email</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>
          Enter your email to sign in or create an account
        </Text>

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          onPress={handleRequestOTP}
          disabled={loading}
          style={[styles.button, loading && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {loading ? "Sending code..." : "Continue"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#000",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  button: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: "#666",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  linkButton: {
    marginTop: 16,
    alignItems: "center",
  },
  linkText: {
    color: "#666",
    fontSize: 14,
  },
});
