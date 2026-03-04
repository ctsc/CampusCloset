import { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Image,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { HomeStackParamList } from "../../navigation/types";
import { getProfile, getProfileListings } from "../../api/profiles";
import ListingCard from "../../components/ListingCard";
import type { ListingCardData } from "../../components/ListingCard";

type NavProp = NativeStackNavigationProp<HomeStackParamList, "SellerProfile">;
type ProfileRoute = RouteProp<HomeStackParamList, "SellerProfile">;

export default function UserProfileScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ProfileRoute>();
  const { userId } = route.params;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(userId),
  });

  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ["profileListings", userId],
    queryFn: () => getProfileListings(userId),
  });

  const handleListingPress = useCallback(
    (listingId: string) => {
      navigation.navigate("ListingDetail", { listingId });
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

  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-lg font-semibold text-gray-900">
          User not found
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={listings ?? []}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerClassName="pb-6"
      className="flex-1 bg-white"
      ListHeaderComponent={
        <View className="items-center px-6 pt-8 pb-4">
          {/* Avatar */}
          <View className="mb-4 h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-blue-100">
            {profile.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                className="h-24 w-24 rounded-full"
              />
            ) : (
              <Text className="text-2xl font-bold text-blue-600">
                {getInitials(profile.full_name)}
              </Text>
            )}
          </View>

          {/* Full Name */}
          <Text className="mb-1 text-2xl font-bold text-gray-900">
            {profile.full_name ?? "Unknown User"}
          </Text>

          {/* Username */}
          {profile.username && (
            <Text className="mb-1 text-base text-gray-500">
              @{profile.username}
            </Text>
          )}

          {/* University */}
          {profile.university && (
            <Text className="mb-2 text-sm text-gray-500">
              {profile.university}
            </Text>
          )}

          {/* Bio */}
          {profile.bio && (
            <Text className="mb-2 text-center text-base text-gray-700">
              {profile.bio}
            </Text>
          )}

          {/* Member since */}
          <Text className="mb-4 text-xs text-gray-400">
            Member since {formatDate(profile.created_at)}
          </Text>

          {/* Divider */}
          <View className="w-full border-t border-gray-200" />

          {/* Listings Header */}
          <View className="mt-4 w-full">
            <Text className="text-lg font-bold text-gray-900">Listings</Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View className="items-center px-6 pt-8">
          <Text className="text-base text-gray-500">
            No listings yet
          </Text>
        </View>
      }
      columnWrapperClassName="px-2.5"
    />
  );
}
