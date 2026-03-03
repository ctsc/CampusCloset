import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "../../utils/validation";
import { supabase } from "../../api/supabase";
import type { AuthScreenProps } from "../../navigation/types";

export default function LoginScreen({ navigation }: AuthScreenProps<"Login">) {
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setShowResend(false);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        // Check if the error is about email not being confirmed
        if (error.message.toLowerCase().includes("email not confirmed")) {
          setShowResend(true);
          setResendEmail(data.email);
          Alert.alert(
            "Email Not Confirmed",
            "Please check your inbox and confirm your email address before logging in."
          );
        } else {
          Alert.alert("Login Failed", error.message);
        }
        return;
      }

      // Auth state change listener in App.tsx will handle navigation
    } catch {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!resendEmail) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: resendEmail,
      });

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Email Sent", "A new confirmation email has been sent.");
      }
    } catch {
      Alert.alert("Error", "Failed to resend confirmation email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="mb-2 text-center text-3xl font-bold text-gray-900">
          Welcome Back
        </Text>
        <Text className="mb-8 text-center text-base text-gray-500">
          Sign in to CampusCloset
        </Text>

        {/* Email */}
        <Text className="mb-1 text-sm font-medium text-gray-700">Email</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className={`mb-1 rounded-lg border px-4 py-3 text-base ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="you@student.gsu.edu"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              editable={!loading}
            />
          )}
        />
        {errors.email && (
          <Text className="mb-3 text-sm text-red-500">
            {errors.email.message}
          </Text>
        )}
        {!errors.email && <View className="mb-3" />}

        {/* Password */}
        <Text className="mb-1 text-sm font-medium text-gray-700">
          Password
        </Text>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className={`mb-1 rounded-lg border px-4 py-3 text-base ${
                errors.password ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter your password"
              secureTextEntry
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              editable={!loading}
            />
          )}
        />
        {errors.password && (
          <Text className="mb-3 text-sm text-red-500">
            {errors.password.message}
          </Text>
        )}
        {!errors.password && <View className="mb-3" />}

        {/* Forgot Password */}
        <TouchableOpacity
          className="mb-4 self-end"
          onPress={() => navigation.navigate("ForgotPassword")}
        >
          <Text className="text-sm font-medium text-blue-600">
            Forgot Password?
          </Text>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity
          className={`rounded-lg py-4 ${
            loading ? "bg-blue-400" : "bg-blue-600"
          }`}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-center text-base font-semibold text-white">
              Log In
            </Text>
          )}
        </TouchableOpacity>

        {/* Resend confirmation */}
        {showResend && (
          <TouchableOpacity
            className="mt-4 rounded-lg border border-blue-600 py-3"
            onPress={handleResendConfirmation}
            disabled={resending}
          >
            {resending ? (
              <ActivityIndicator color="#2563EB" />
            ) : (
              <Text className="text-center text-sm font-semibold text-blue-600">
                Resend Confirmation Email
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Sign Up link */}
        <TouchableOpacity
          className="mt-6"
          onPress={() => navigation.navigate("SignUp")}
        >
          <Text className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Text className="font-semibold text-blue-600">Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
