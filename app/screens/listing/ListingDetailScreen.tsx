import { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { HomeStackParamList } from "../../navigation/types";
import { getListing, archiveListing } from "../../api/listings";
import { addFavorite, removeFavorite, checkFavorites } from "../../api/favorites";
import { useAuthStore } from "../../store/useAuthStore";
import { useCartStore } from "../../store/useCartStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
};

const CONDITION_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: "bg-green-100", text: "text-green-800" },
  like_new: { bg: "bg-blue-100", text: "text-blue-800" },
  good: { bg: "bg-yellow-100", text: "text-yellow-800" },
  fair: { bg: "bg-orange-100", text: "text-orange-800" },
};

type NavProp = NativeStackNavigationProp<HomeStackParamList, "ListingDetail">;
type DetailRoute = RouteProp<HomeStackParamList, "ListingDetail">;

export default function ListingDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<DetailRoute>();
  const { listingId } = route.params;
  const userId = useAuthStore((s) => s.session?.user?.id);
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const cartItems = useCartStore((s) => s.items);
  const addToCart = useCartStore((s) => s.addItem);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", listingId],
    queryFn: () => getListing(listingId),
  });

  const { data: favoritedSet } = useQuery({
    queryKey: ["favorites", "check", userId, listingId],
    queryFn: () =>
      userId ? checkFavorites(userId, [listingId]) : Promise.resolve(new Set<string>()),
    enabled: !!userId,
  });

  const isFavorited = favoritedSet?.has(listingId) ?? false;
  const isOwnListing = listing?.seller_id === userId;
  const isInCart = cartItems.some((i) => i.listingId === listingId);

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      if (isFavorited) {
        await removeFavorite(userId, listingId);
      } else {
        await addFavorite(userId, listingId);
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ["favorites", "check", userId, listingId],
      });
      const previous = queryClient.getQueryData<Set<string>>([
        "favorites",
        "check",
        userId,
        listingId,
      ]);
      queryClient.setQueryData<Set<string>>(
        ["favorites", "check", userId, listingId],
        () => {
          const newSet = new Set(previous);
          if (isFavorited) {
            newSet.delete(listingId);
          } else {
            newSet.add(listingId);
          }
          return newSet;
        }
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["favorites", "check", userId, listingId],
          context.previous
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveListing(listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["profileListings"] });
      Alert.alert("Deleted", "Your listing has been removed.");
      navigation.goBack();
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to delete listing.");
    },
  });

  const handleDelete = () => {
    Alert.alert(
      "Delete Listing",
      "Are you sure you want to delete this listing?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => archiveMutation.mutate(),
        },
      ]
    );
  };

  const handleAddToCart = useCallback(() => {
    if (!listing) return;

    const existingItems = useCartStore.getState().items;
    if (
      existingItems.length > 0 &&
      existingItems[0].sellerId !== listing.seller_id
    ) {
      Alert.alert(
        "Different Seller",
        "Your cart has items from another seller. Clear it first to add this item.",
        [{ text: "OK" }]
      );
      return;
    }

    addToCart({
      listingId: listing.id,
      sellerId: listing.seller_id,
      title: listing.title,
      price: listing.price,
      imageUrl: listing.listing_images?.[0]?.image_url ?? "",
    });
  }, [listing, addToCart]);

  const handleShare = async () => {
    if (!listing) return;
    try {
      await Share.share({
        message: `Check out "${listing.title}" on CampusCloset for $${listing.price.toFixed(2)}!`,
      });
    } catch {
      // User cancelled or error
    }
  };

  const handleSellerPress = () => {
    if (!listing) return;
    navigation.navigate("SellerProfile", { userId: listing.seller_id });
  };

  const handleImageScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      const index = Math.round(
        event.nativeEvent.contentOffset.x / SCREEN_WIDTH
      );
      setActiveImageIndex(index);
    },
    []
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-lg font-semibold text-gray-900">
          Listing not found
        </Text>
        <TouchableOpacity
          className="mt-4 rounded-lg bg-blue-600 px-6 py-3"
          onPress={() => navigation.goBack()}
        >
          <Text className="font-semibold text-white">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const images = listing.listing_images ?? [];
  const conditionStyle = CONDITION_COLORS[listing.condition] ?? {
    bg: "bg-gray-100",
    text: "text-gray-800",
  };
  const conditionLabel =
    CONDITION_LABELS[listing.condition] ?? listing.condition;

  return (
    <View className="flex-1 bg-white">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <View className="relative">
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleImageScroll}
          >
            {images.length > 0 ? (
              images.map((img) => (
                <Image
                  key={img.id}
                  source={{ uri: img.image_url }}
                  style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
                  resizeMode="cover"
                />
              ))
            ) : (
              <View
                style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
                className="items-center justify-center bg-gray-100"
              >
                <Ionicons name="image-outline" size={64} color="#D1D5DB" />
              </View>
            )}
          </ScrollView>

          {/* Page dots */}
          {images.length > 1 && (
            <View className="absolute bottom-3 w-full flex-row items-center justify-center gap-1.5">
              {images.map((img, index) => (
                <View
                  key={img.id}
                  className={`h-2 w-2 rounded-full ${
                    index === activeImageIndex ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
            </View>
          )}

          {/* Favorite button */}
          {!isOwnListing && (
            <TouchableOpacity
              className="absolute right-3 top-3 h-10 w-10 items-center justify-center rounded-full bg-white/90"
              onPress={() => favoriteMutation.mutate()}
            >
              <Ionicons
                name={isFavorited ? "heart" : "heart-outline"}
                size={22}
                color={isFavorited ? "#EF4444" : "#6B7280"}
              />
            </TouchableOpacity>
          )}

          {/* Share button */}
          <TouchableOpacity
            className="absolute left-3 top-3 h-10 w-10 items-center justify-center rounded-full bg-white/90"
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={22} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Listing Info */}
        <View className="px-4 pt-4">
          {/* Price + Title */}
          <Text className="text-2xl font-bold text-gray-900">
            ${listing.price.toFixed(2)}
          </Text>
          <Text className="mt-1 text-lg font-semibold text-gray-900">
            {listing.title}
          </Text>

          {/* Badges: condition, category, size */}
          <View className="mt-3 flex-row flex-wrap gap-2">
            <View
              className={`rounded-full px-3 py-1 ${conditionStyle.bg}`}
            >
              <Text
                className={`text-xs font-medium ${conditionStyle.text}`}
              >
                {conditionLabel}
              </Text>
            </View>
            <View className="rounded-full bg-gray-100 px-3 py-1">
              <Text className="text-xs font-medium text-gray-700">
                {listing.category}
              </Text>
            </View>
            {listing.size && (
              <View className="rounded-full bg-gray-100 px-3 py-1">
                <Text className="text-xs font-medium text-gray-700">
                  {listing.size}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          {listing.description ? (
            <Text className="mt-4 text-base leading-6 text-gray-700">
              {listing.description}
            </Text>
          ) : null}

          {/* Divider */}
          <View className="my-4 border-t border-gray-200" />

          {/* Seller Info */}
          <TouchableOpacity
            className="flex-row items-center"
            onPress={handleSellerPress}
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              {listing.seller?.avatar_url ? (
                <Image
                  source={{ uri: listing.seller.avatar_url }}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <Ionicons name="person" size={20} color="#2563EB" />
              )}
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-sm font-semibold text-gray-900">
                {listing.seller?.username
                  ? `@${listing.seller.username}`
                  : "Seller"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Divider */}
          <View className="my-4 border-t border-gray-200" />

          {/* Posted date */}
          <Text className="mb-4 text-xs text-gray-400">
            Listed{" "}
            {new Date(listing.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
        </View>

        {/* Owner actions */}
        {isOwnListing && (
          <View className="flex-row gap-3 px-4 pb-6">
            <TouchableOpacity
              className="flex-1 rounded-lg border border-blue-600 py-3"
              onPress={() => {
                const parent = navigation.getParent();
                if (parent) {
                  parent.navigate("SellTab", {
                    screen: "EditListing",
                    params: { listingId },
                  });
                }
              }}
            >
              <Text className="text-center text-sm font-semibold text-blue-600">
                Edit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 rounded-lg border border-red-500 py-3"
              onPress={handleDelete}
              disabled={archiveMutation.isPending}
            >
              {archiveMutation.isPending ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Text className="text-center text-sm font-semibold text-red-500">
                  Delete
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Spacer for bottom button */}
        {!isOwnListing && <View className="h-24" />}
      </ScrollView>

      {/* Add to Cart button - fixed at bottom for non-owners */}
      {!isOwnListing && (
        <View className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-4 pb-6 pt-3">
          <TouchableOpacity
            className={`rounded-lg py-4 ${
              isInCart ? "bg-gray-300" : "bg-blue-600"
            }`}
            onPress={handleAddToCart}
            disabled={isInCart}
          >
            <Text
              className={`text-center text-base font-semibold ${
                isInCart ? "text-gray-500" : "text-white"
              }`}
            >
              {isInCart ? "In Cart" : "Add to Cart"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
