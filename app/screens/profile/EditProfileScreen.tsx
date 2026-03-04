import { useEffect, useState } from "react";
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
  Image,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../store/useAuthStore";
import { getProfile, updateProfile, isUsernameTaken } from "../../api/profiles";
import { pickAndUploadImage } from "../../utils/imageUpload";
import type { ProfileScreenProps } from "../../navigation/types";

const profileSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be 30 characters or less")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    )
    .optional()
    .or(z.literal("")),
  bio: z
    .string()
    .max(200, "Bio must be 200 characters or less")
    .optional()
    .or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function EditProfileScreen({
  navigation,
}: ProfileScreenProps<"EditProfile">) {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;
  const queryClient = useQueryClient();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => (userId ? getProfile(userId) : Promise.reject("No user")),
    enabled: !!userId,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      username: "",
      bio: "",
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name ?? "",
        username: profile.username ?? "",
        bio: profile.bio ?? "",
      });
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile, reset]);

  const handleAvatarPick = async () => {
    if (!userId) return;
    setUploadingAvatar(true);
    try {
      const url = await pickAndUploadImage(
        "avatars",
        `${userId}/avatar.jpg`
      );
      if (url) {
        setAvatarUrl(url);
      }
    } catch {
      Alert.alert("Error", "Failed to upload avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      if (!userId) throw new Error("Not authenticated");

      // Check username uniqueness
      if (data.username && data.username !== profile?.username) {
        const taken = await isUsernameTaken(data.username, userId);
        if (taken) {
          throw new Error("That username is already taken.");
        }
      }

      await updateProfile(userId, {
        full_name: data.full_name,
        username: data.username || undefined,
        bio: data.bio || undefined,
        avatar_url: avatarUrl ?? undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      Alert.alert("Saved", "Your profile has been updated.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to update profile.");
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    saveMutation.mutate(data);
  };

  const submitting = saveMutation.isPending;

  const getInitials = (name: string | null): string => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerClassName="px-6 py-6 pb-8"
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View className="mb-6 items-center">
          <TouchableOpacity onPress={handleAvatarPick} disabled={uploadingAvatar}>
            <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-blue-100">
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  className="h-24 w-24 rounded-full"
                />
              ) : (
                <Text className="text-2xl font-bold text-blue-600">
                  {getInitials(profile?.full_name ?? null)}
                </Text>
              )}
            </View>
          </TouchableOpacity>
          <Text className="mt-2 text-sm text-blue-600">Change Photo</Text>
        </View>

        {/* Full Name */}
        <Text className="mb-1 text-sm font-medium text-gray-700">
          Full Name
        </Text>
        <Controller
          control={control}
          name="full_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className={`mb-1 rounded-lg border px-4 py-3 text-base ${
                errors.full_name ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Your full name"
              autoCapitalize="words"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              editable={!submitting}
            />
          )}
        />
        {errors.full_name ? (
          <Text className="mb-3 text-sm text-red-500">
            {errors.full_name.message}
          </Text>
        ) : (
          <View className="mb-3" />
        )}

        {/* Username */}
        <Text className="mb-1 text-sm font-medium text-gray-700">
          Username
        </Text>
        <Controller
          control={control}
          name="username"
          render={({ field: { onChange, onBlur, value } }) => (
            <View className="relative mb-1">
              <Text className="absolute left-4 top-3 z-10 text-base text-gray-500">
                @
              </Text>
              <TextInput
                className={`rounded-lg border py-3 pl-8 pr-4 text-base ${
                  errors.username ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="username"
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                editable={!submitting}
              />
            </View>
          )}
        />
        {errors.username ? (
          <Text className="mb-3 text-sm text-red-500">
            {errors.username.message}
          </Text>
        ) : (
          <View className="mb-3" />
        )}

        {/* Bio */}
        <Text className="mb-1 text-sm font-medium text-gray-700">Bio</Text>
        <Controller
          control={control}
          name="bio"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className={`mb-1 rounded-lg border px-4 py-3 text-base ${
                errors.bio ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Tell people about yourself..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={200}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              editable={!submitting}
              style={{ minHeight: 80 }}
            />
          )}
        />
        {errors.bio ? (
          <Text className="mb-3 text-sm text-red-500">
            {errors.bio.message}
          </Text>
        ) : (
          <View className="mb-3" />
        )}

        {/* Save */}
        <TouchableOpacity
          className={`mt-4 rounded-lg py-4 ${
            submitting ? "bg-blue-400" : "bg-blue-600"
          }`}
          onPress={handleSubmit(onSubmit)}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-center text-base font-semibold text-white">
              Save Profile
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
