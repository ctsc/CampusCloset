import { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { FavoritesStackParamList } from "../../navigation/types";
import { getFavorites, removeFavorite } from "../../api/favorites";
import { useAuthStore } from "../../store/useAuthStore";
import ListingCard from "../../components/ListingCard";
import type { ListingCardData } from "../../components/ListingCard";
import type { Listing } from "../../api/listings";

type NavProp = NativeStackNavigationProp<FavoritesStackParamList>;

export default function FavoritesScreen() {
  const navigation = useNavigation<NavProp>();
  const userId = useAuthStore((s) => s.session?.user?.id);
  const queryClient = useQueryClient();

  const {
    data: favorites,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["favorites", "list", userId],
    queryFn: () => (userId ? getFavorites(userId) : Promise.resolve([])),
    enabled: !!userId,
  });

  // Unfavorite mutation with optimistic removal from list
  const unfavoriteMutation = useMutation({
    mutationFn: async (listingId: string) => {
      if (!userId) return;
      await removeFavorite(userId, listingId);
    },
    onMutate: async (listingId: string) => {
      await queryClient.cancelQueries({ queryKey: ["favorites", "list", userId] });
      const previous = queryClient.getQueryData<Listing[]>(["favorites", "list", userId]);
      queryClient.setQueryData<Listing[]>(
        ["favorites", "list", userId],
        (old) => old?.filter((l) => l.id !== listingId) ?? []
      );
      return { previous };
    },
    onError: (_err, _listingId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["favorites", "list", userId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  const handlePress = useCallback(
    (listingId: string) => {
      navigation.navigate("ListingDetail", { listingId });
    },
    [navigation]
  );

  const handleToggleFavorite = useCallback(
    (listingId: string) => {
      unfavoriteMutation.mutate(listingId);
    },
    [unfavoriteMutation]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ListingCardData; index: number }) => (
      <View className={`w-1/2 ${index % 2 === 0 ? "pr-1.5" : "pl-1.5"}`}>
        <ListingCard
          listing={item}
          onPress={handlePress}
          isFavorited={true}
          onToggleFavorite={handleToggleFavorite}
        />
      </View>
    ),
    [handlePress, handleToggleFavorite]
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <FlatList
      data={favorites ?? []}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerClassName="px-2.5 pt-3 pb-4"
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor="#2563EB"
          colors={["#2563EB"]}
        />
      }
      ListEmptyComponent={
        <View className="items-center justify-center px-6 pt-20">
          <Text className="mb-2 text-5xl">{"❤️"}</Text>
          <Text className="mb-2 text-center text-lg font-bold text-gray-900">
            No Favorites Yet
          </Text>
          <Text className="text-center text-sm text-gray-500">
            Tap the heart on any listing to save it here for later.
          </Text>
        </View>
      }
    />
  );
}
