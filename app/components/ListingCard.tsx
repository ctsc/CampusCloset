import { useState } from "react";
import { View, Text, Image, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ListingImage, ListingSeller } from "../api/listings";

export interface ListingCardData {
  id: string;
  title: string;
  price: number;
  condition: string;
  listing_images: ListingImage[];
  seller: ListingSeller;
}

interface ListingCardProps {
  listing: ListingCardData;
  onPress: (listingId: string) => void;
  isFavorited?: boolean;
  onToggleFavorite?: (listingId: string) => void;
}

const CONDITION_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: "bg-green-100", text: "text-green-800" },
  like_new: { bg: "bg-blue-100", text: "text-blue-800" },
  good: { bg: "bg-yellow-100", text: "text-yellow-800" },
  fair: { bg: "bg-orange-100", text: "text-orange-800" },
};

const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
};

export default function ListingCard({
  listing,
  onPress,
  isFavorited = false,
  onToggleFavorite,
}: ListingCardProps) {
  const [imageLoading, setImageLoading] = useState(true);

  const coverImage = listing.listing_images?.[0]?.image_url;
  const conditionStyle = CONDITION_COLORS[listing.condition] ?? {
    bg: "bg-gray-100",
    text: "text-gray-800",
  };
  const conditionLabel =
    CONDITION_LABELS[listing.condition] ?? listing.condition;

  return (
    <Pressable
      className="mb-3 flex-1 overflow-hidden rounded-xl bg-white shadow-sm"
      onPress={() => onPress(listing.id)}
    >
      {/* Cover image */}
      <View className="relative aspect-square w-full bg-gray-100">
        {coverImage ? (
          <>
            <Image
              source={{ uri: coverImage }}
              className="h-full w-full"
              resizeMode="cover"
              onLoadEnd={() => setImageLoading(false)}
            />
            {imageLoading && (
              <View className="absolute inset-0 items-center justify-center bg-gray-100">
                <ActivityIndicator size="small" color="#9CA3AF" />
              </View>
            )}
          </>
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons name="image-outline" size={32} color="#D1D5DB" />
          </View>
        )}

        {/* Favorite heart button */}
        {onToggleFavorite && (
          <Pressable
            className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-white/80"
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleFavorite(listing.id);
            }}
            hitSlop={8}
          >
            <Ionicons
              name={isFavorited ? "heart" : "heart-outline"}
              size={18}
              color={isFavorited ? "#EF4444" : "#6B7280"}
            />
          </Pressable>
        )}
      </View>

      {/* Info */}
      <View className="p-2">
        <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
          {listing.title}
        </Text>

        <Text className="mt-0.5 text-base font-bold text-gray-900">
          ${listing.price.toFixed(2)}
        </Text>

        <View className="mt-1 flex-row items-center justify-between">
          {/* Condition badge */}
          <View className={`rounded-full px-2 py-0.5 ${conditionStyle.bg}`}>
            <Text className={`text-xs font-medium ${conditionStyle.text}`}>
              {conditionLabel}
            </Text>
          </View>

          {/* Seller */}
          {listing.seller?.username && (
            <Text className="text-xs text-gray-500" numberOfLines={1}>
              @{listing.seller.username}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
