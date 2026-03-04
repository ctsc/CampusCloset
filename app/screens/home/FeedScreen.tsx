import { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useInfiniteQuery, useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { MainTabParamList, HomeStackParamList } from "../../navigation/types";
import { getListings } from "../../api/listings";
import { checkFavorites, addFavorite, removeFavorite } from "../../api/favorites";
import { useAuthStore } from "../../store/useAuthStore";
import ListingCard from "../../components/ListingCard";
import type { ListingCardData } from "../../components/ListingCard";

type TabNavProp = BottomTabNavigationProp<MainTabParamList, "HomeTab">;
type StackNavProp = NativeStackNavigationProp<HomeStackParamList>;

const PAGE_SIZE = 20;

export default function FeedScreen() {
  const tabNavigation = useNavigation<TabNavProp>();
  const stackNavigation = useNavigation<StackNavProp>();
  const userId = useAuthStore((s) => s.session?.user?.id);
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["listings", "feed"],
    queryFn: ({ pageParam }) => getListings(pageParam, { sort: "newest" }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === PAGE_SIZE ? lastPageParam + 1 : undefined,
  });

  const allListings = data?.pages.flat() ?? [];
  const listingIds = allListings.map((l) => l.id);

  // Fetch favorite status for visible listings
  const { data: favoritedIds } = useQuery({
    queryKey: ["favorites", "check", listingIds],
    queryFn: () => (userId ? checkFavorites(userId, listingIds) : Promise.resolve(new Set<string>())),
    enabled: listingIds.length > 0 && !!userId,
  });

  // Favorite toggle mutation with optimistic update
  const favoriteMutation = useMutation({
    mutationFn: async (listingId: string) => {
      if (!userId) return;
      const isFav = favoritedIds?.has(listingId);
      if (isFav) {
        await removeFavorite(userId, listingId);
      } else {
        await addFavorite(userId, listingId);
      }
    },
    onMutate: async (listingId: string) => {
      await queryClient.cancelQueries({ queryKey: ["favorites", "check"] });
      const previousIds = favoritedIds;
      // Optimistically update
      queryClient.setQueryData<Set<string>>(
        ["favorites", "check", listingIds],
        (old) => {
          const newSet = new Set(old);
          if (newSet.has(listingId)) {
            newSet.delete(listingId);
          } else {
            newSet.add(listingId);
          }
          return newSet;
        }
      );
      return { previousIds };
    },
    onError: (_err, _listingId, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(
          ["favorites", "check", listingIds],
          context.previousIds
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  const handlePress = useCallback(
    (listingId: string) => {
      stackNavigation.navigate("ListingDetail", { listingId });
    },
    [stackNavigation]
  );

  const handleToggleFavorite = useCallback(
    (listingId: string) => {
      favoriteMutation.mutate(listingId);
    },
    [favoriteMutation]
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item, index }: { item: ListingCardData; index: number }) => (
      <View className={`w-1/2 ${index % 2 === 0 ? "pr-1.5" : "pl-1.5"}`}>
        <ListingCard
          listing={item}
          onPress={handlePress}
          isFavorited={favoritedIds?.has(item.id) ?? false}
          onToggleFavorite={handleToggleFavorite}
        />
      </View>
    ),
    [handlePress, handleToggleFavorite, favoritedIds]
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 px-4 pt-4">
        <View className="flex-row flex-wrap">
          {[1, 2, 3, 4].map((i) => (
            <View key={i} className="mb-3 w-1/2 px-1.5">
              <View className="rounded-xl bg-white p-2 shadow-sm">
                <View className="aspect-square w-full rounded-lg bg-gray-200" />
                <View className="mt-2 h-3.5 w-3/4 rounded bg-gray-200" />
                <View className="mt-1.5 h-4 w-1/3 rounded bg-gray-200" />
                <View className="mt-1.5 h-5 w-1/2 rounded bg-gray-200" />
              </View>
            </View>
          ))}
        </View>
        <ActivityIndicator className="mt-4" color="#2563EB" />
      </View>
    );
  }

  return (
    <FlatList
      data={allListings}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerClassName="px-2.5 pt-3 pb-4"
      columnWrapperClassName="mb-0"
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor="#2563EB"
          colors={["#2563EB"]}
        />
      }
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator className="py-4" color="#2563EB" />
        ) : null
      }
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center px-6 pt-20">
          <Text className="mb-2 text-6xl">{"🛍️"}</Text>
          <Text className="mb-2 text-center text-xl font-bold text-gray-900">
            No Listings Yet
          </Text>
          <Text className="mb-6 text-center text-base text-gray-500">
            Be the first to list something on CampusCloset! Your campus
            community is waiting.
          </Text>
          <TouchableOpacity
            className="rounded-lg bg-blue-600 px-8 py-3"
            onPress={() =>
              tabNavigation.navigate({
                name: "SellTab",
                params: { screen: "CreateListing" },
              })
            }
          >
            <Text className="text-base font-semibold text-white">
              List an Item
            </Text>
          </TouchableOpacity>
        </View>
      }
    />
  );
}
