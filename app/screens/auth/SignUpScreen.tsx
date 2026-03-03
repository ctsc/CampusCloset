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
import { signUpSchema, type SignUpFormData } from "../../utils/validation";
import { supabase } from "../../api/supabase";
import type { AuthScreenProps } from "../../navigation/types";

export default function SignUpScreen({ navigation }: AuthScreenProps<"SignUp">) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
      university: "Georgia State University",
    },
  });

  const onSubmit = async (data: SignUpFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            university: data.university,
          },
        },
      });

      if (error) {
        Alert.alert("Sign Up Failed", error.message);
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
          We sent a confirmation link to your .edu email address. Please confirm
          your email to continue.
        </Text>
        <TouchableOpacity
          className="w-full rounded-lg bg-blue-600 py-4"
          onPress={() => navigation.navigate("Login")}
        >
          <Text className="text-center text-base font-semibold text-white">
            Go to Login
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
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="mb-2 text-center text-3xl font-bold text-gray-900">
          Create Account
        </Text>
        <Text className="mb-8 text-center text-base text-gray-500">
          Join CampusCloset with your .edu email
        </Text>

        {/* Full Name */}
        <Text className="mb-1 text-sm font-medium text-gray-700">
          Full Name
        </Text>
        <Controller
          control={control}
          name="fullName"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className={`mb-1 rounded-lg border px-4 py-3 text-base ${
                errors.fullName ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="John Doe"
              autoCapitalize="words"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              editable={!loading}
            />
          )}
        />
        {errors.fullName && (
          <Text className="mb-3 text-sm text-red-500">
            {errors.fullName.message}
          </Text>
        )}
        {!errors.fullName && <View className="mb-3" />}

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
              placeholder="Min 8 characters"
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

        {/* University */}
        <Text className="mb-1 text-sm font-medium text-gray-700">
          University
        </Text>
        <Controller
          control={control}
          name="university"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className={`mb-1 rounded-lg border px-4 py-3 text-base ${
                errors.university ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Georgia State University"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              editable={!loading}
            />
          )}
        />
        {errors.university && (
          <Text className="mb-3 text-sm text-red-500">
            {errors.university.message}
          </Text>
        )}
        {!errors.university && <View className="mb-3" />}

        {/* Submit */}
        <TouchableOpacity
          className={`mt-4 rounded-lg py-4 ${
            loading ? "bg-blue-400" : "bg-blue-600"
          }`}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-center text-base font-semibold text-white">
              Sign Up
            </Text>
          )}
        </TouchableOpacity>

        {/* Login link */}
        <TouchableOpacity
          className="mt-6"
          onPress={() => navigation.navigate("Login")}
        >
          <Text className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Text className="font-semibold text-blue-600">Log In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
