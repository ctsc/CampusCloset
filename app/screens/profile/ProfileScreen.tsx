import { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../../navigation/types";
import { supabase } from "../../api/supabase";
import { getProfile } from "../../api/profiles";
import { getProfileListings } from "../../api/profiles";
import { useAuthStore } from "../../store/useAuthStore";
import { useCartStore } from "../../store/useCartStore";
import ListingCard from "../../components/ListingCard";
import type { ListingCardData } from "../../components/ListingCard";

type NavProp = NativeStackNavigationProp<ProfileStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<NavProp>();
  const session = useAuthStore((s) => s.session);
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearCart = useCartStore((s) => s.clear);
  const userId = session?.user?.id;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => (userId ? getProfile(userId) : Promise.reject("No user")),
    enabled: !!userId,
  });

  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ["profileListings", userId],
    queryFn: () =>
      userId ? getProfileListings(userId) : Promise.resolve([]),
    enabled: !!userId,
  });

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

  const handleListingPress = useCallback(
    (listingId: string) => {
      // Navigate to listing detail via the parent tab navigator
      const parent = navigation.getParent();
      if (parent) {
        parent.navigate("HomeTab", {
          screen: "ListingDetail",
          params: { listingId },
        });
      }
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ListingCardData; index: number }) => (
      <View className={`w-1/2 ${index % 2 === 0 ? "pr-1.5" : "pl-1.5"}`}>
        <ListingCard listing={item} onPress={handleListingPress} />
      </View>
    ),
    [handleListingPress]
  );

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

  const isLoading = profileLoading || listingsLoading;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const fullName =
    profile?.full_name ??
    session?.user?.user_metadata?.full_name ??
    "Unknown User";

  return (
    <FlatList
      data={listings ?? []}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerClassName="pb-6"
      className="flex-1 bg-white"
      ListHeaderComponent={
        <View>
          {/* Profile Info */}
          <View className="items-center px-6 pt-8">
            {/* Avatar */}
            <View className="mb-4 h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-blue-100">
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  className="h-24 w-24 rounded-full"
                />
              ) : (
                <Text className="text-2xl font-bold text-blue-600">
                  {getInitials(fullName)}
                </Text>
              )}
            </View>

            {/* Full Name */}
            <Text className="mb-1 text-2xl font-bold text-gray-900">
              {fullName}
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
            <Text className="mb-4 text-xs text-gray-400">
              Member since{" "}
              {profile?.created_at
                ? formatDate(profile.created_at)
                : "recently"}
            </Text>

            {/* Edit Profile Button */}
            <TouchableOpacity
              className="mb-4 w-full rounded-lg border border-blue-600 py-3"
              onPress={() => navigation.navigate("EditProfile")}
            >
              <Text className="text-center text-sm font-semibold text-blue-600">
                Edit Profile
              </Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View className="mx-6 border-t border-gray-200" />

          {/* My Listings Header */}
          <View className="px-4 pb-2 pt-4">
            <Text className="text-lg font-bold text-gray-900">
              My Listings
            </Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View className="items-center px-6 pt-8">
          <Text className="mb-2 text-base text-gray-500">
            No listings yet
          </Text>
          <Text className="text-sm text-gray-400">
            Tap the Sell tab to list your first item!
          </Text>
        </View>
      }
      columnWrapperClassName="px-2.5"
      ListFooterComponent={
        <View className="px-6 pt-6">
          <TouchableOpacity
            className="rounded-lg border border-red-300 bg-red-50 py-4"
            onPress={handleLogout}
          >
            <Text className="text-center text-base font-semibold text-red-600">
              Log Out
            </Text>
          </TouchableOpacity>
        </View>
      }
    />
  );
}
