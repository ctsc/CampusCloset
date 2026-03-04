import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { SearchStackParamList } from "../../navigation/types";
import { getListings } from "../../api/listings";
import type { ListingSort } from "../../api/listings";
import { checkFavorites, addFavorite, removeFavorite } from "../../api/favorites";
import { useAuthStore } from "../../store/useAuthStore";
import ListingCard from "../../components/ListingCard";
import type { ListingCardData } from "../../components/ListingCard";

type NavProp = NativeStackNavigationProp<SearchStackParamList>;

const CATEGORIES = ["All", "Tops", "Bottoms", "Dresses", "Shoes", "Accessories", "Other"];

const SORT_OPTIONS: { label: string; value: ListingSort }[] = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
];

const PAGE_SIZE = 20;

export default function SearchScreen() {
  const navigation = useNavigation<NavProp>();
  const userId = useAuthStore((s) => s.session?.user?.id);
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSort, setSelectedSort] = useState<ListingSort>("newest");
  const [showSortPicker, setShowSortPicker] = useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["listings", "search", selectedCategory, selectedSort],
    queryFn: ({ pageParam }) =>
      getListings(pageParam, {
        category: selectedCategory === "All" ? undefined : selectedCategory,
        sort: selectedSort,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === PAGE_SIZE ? lastPageParam + 1 : undefined,
  });

  const allListings = data?.pages.flat() ?? [];
  const listingIds = allListings.map((l) => l.id);

  const { data: favoritedIds } = useQuery({
    queryKey: ["favorites", "check", "search", listingIds],
    queryFn: () => (userId ? checkFavorites(userId, listingIds) : Promise.resolve(new Set<string>())),
    enabled: listingIds.length > 0 && !!userId,
  });

  const favoriteMutation = useMutation({
    mutationFn: async (listingId: string) => {
      if (!userId) return;
      if (favoritedIds?.has(listingId)) {
        await removeFavorite(userId, listingId);
      } else {
        await addFavorite(userId, listingId);
      }
    },
    onMutate: async (listingId: string) => {
      await queryClient.cancelQueries({ queryKey: ["favorites", "check"] });
      queryClient.setQueryData<Set<string>>(
        ["favorites", "check", "search", listingIds],
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
      favoriteMutation.mutate(listingId);
    },
    [favoriteMutation]
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.value === selectedSort)?.label ?? "Newest";

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

  return (
    <View className="flex-1 bg-gray-50">
      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-12 border-b border-gray-100 bg-white"
        contentContainerClassName="px-3 py-2"
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            className={`mr-2 rounded-full px-4 py-1.5 ${
              selectedCategory === cat
                ? "bg-blue-600"
                : "bg-gray-100"
            }`}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              className={`text-sm font-medium ${
                selectedCategory === cat ? "text-white" : "text-gray-700"
              }`}
            >
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Sort picker */}
      <View className="border-b border-gray-100 bg-white px-4 py-2">
        <Pressable
          className="flex-row items-center"
          onPress={() => setShowSortPicker(!showSortPicker)}
        >
          <Text className="text-sm text-gray-500">Sort by: </Text>
          <Text className="text-sm font-semibold text-blue-600">
            {currentSortLabel}
          </Text>
        </Pressable>
        {showSortPicker && (
          <View className="mt-2 rounded-lg border border-gray-200 bg-white">
            {SORT_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                className={`border-b border-gray-100 px-4 py-3 ${
                  selectedSort === option.value ? "bg-blue-50" : ""
                }`}
                onPress={() => {
                  setSelectedSort(option.value);
                  setShowSortPicker(false);
                }}
              >
                <Text
                  className={`text-sm ${
                    selectedSort === option.value
                      ? "font-semibold text-blue-600"
                      : "text-gray-700"
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Results */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={allListings}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerClassName="px-2.5 pt-3 pb-4"
          className="flex-1"
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
            <View className="items-center justify-center px-6 pt-20">
              <Text className="mb-2 text-5xl">{"🔍"}</Text>
              <Text className="mb-2 text-center text-lg font-bold text-gray-900">
                No Results Found
              </Text>
              <Text className="text-center text-sm text-gray-500">
                {selectedCategory !== "All"
                  ? `No listings in "${selectedCategory}" yet. Try another category.`
                  : "No listings available. Check back soon!"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
