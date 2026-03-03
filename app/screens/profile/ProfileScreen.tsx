import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "../../api/supabase";
import { useAuthStore } from "../../store/useAuthStore";
import { useCartStore } from "../../store/useCartStore";

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  university: string | null;
  created_at: string;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const session = useAuthStore((s) => s.session);
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearCart = useCartStore((s) => s.clear);

  useEffect(() => {
    fetchProfile();
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProfile = async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio, university, created_at")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error.message);
      } else {
        setProfile(data);
      }
    } catch {
      console.error("Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          clearCart();
          clearSession();
        },
      },
    ]);
  };

  const getInitials = (name: string | null): string => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="items-center px-6 pt-8">
        {/* Avatar placeholder */}
        <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-blue-100">
          <Text className="text-2xl font-bold text-blue-600">
            {getInitials(profile?.full_name ?? session?.user?.user_metadata?.full_name ?? null)}
          </Text>
        </View>

        {/* Full Name */}
        <Text className="mb-1 text-2xl font-bold text-gray-900">
          {profile?.full_name ??
            session?.user?.user_metadata?.full_name ??
            "Unknown User"}
        </Text>

        {/* Username */}
        {profile?.username && (
          <Text className="mb-1 text-base text-gray-500">
            @{profile.username}
          </Text>
        )}

        {/* University */}
        <Text className="mb-2 text-sm text-gray-500">
          {profile?.university ??
            session?.user?.user_metadata?.university ??
            "University not set"}
        </Text>

        {/* Bio */}
        {profile?.bio && (
          <Text className="mb-2 text-center text-base text-gray-700">
            {profile.bio}
          </Text>
        )}

        {/* Member since */}
        <Text className="mb-6 text-xs text-gray-400">
          Member since{" "}
          {profile?.created_at
            ? formatDate(profile.created_at)
            : "recently"}
        </Text>
      </View>

      {/* Divider */}
      <View className="mx-6 border-t border-gray-200" />

      {/* Actions */}
      <View className="px-6 pt-6">
        {/* Logout */}
        <TouchableOpacity
          className="rounded-lg border border-red-300 bg-red-50 py-4"
          onPress={handleLogout}
        >
          <Text className="text-center text-base font-semibold text-red-600">
            Log Out
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
