import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "../../api/supabase";
import type { AuthScreenProps } from "../../navigation/types";

export default function ForgotPasswordScreen({
  navigation,
}: AuthScreenProps<"ForgotPassword">) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed);

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      setSuccess(true);
    } catch {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="mb-4 text-center text-2xl font-bold text-gray-900">
          Check Your Email
        </Text>
        <Text className="mb-8 text-center text-base text-gray-600">
          If an account exists with that email, we sent a password reset link.
          Please check your inbox.
        </Text>
        <TouchableOpacity
          className="w-full rounded-lg bg-blue-600 py-4"
          onPress={() => navigation.navigate("Login")}
        >
          <Text className="text-center text-base font-semibold text-white">
            Back to Login
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-grow justify-center px-6">
        <Text className="mb-2 text-center text-3xl font-bold text-gray-900">
          Reset Password
        </Text>
        <Text className="mb-8 text-center text-base text-gray-500">
          Enter your email and we&apos;ll send you a reset link
        </Text>

        <Text className="mb-1 text-sm font-medium text-gray-700">Email</Text>
        <TextInput
          className="mb-4 rounded-lg border border-gray-300 px-4 py-3 text-base"
          placeholder="you@student.gsu.edu"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />

        <TouchableOpacity
          className={`rounded-lg py-4 ${
            loading ? "bg-blue-400" : "bg-blue-600"
          }`}
          onPress={handleReset}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-center text-base font-semibold text-white">
              Send Reset Link
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-6"
          onPress={() => navigation.navigate("Login")}
        >
          <Text className="text-center text-sm font-medium text-blue-600">
            Back to Login
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
