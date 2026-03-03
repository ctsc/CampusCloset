import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { MainTabParamList } from "../../navigation/types";

type TabNavProp = BottomTabNavigationProp<MainTabParamList, "HomeTab">;

export default function FeedScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const tabNavigation = useNavigation<TabNavProp>();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO: Refetch listings when query helpers are wired up (Sprint 1)
    // Simulate a brief delay for pull-to-refresh feedback
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  }, []);

  // Loading skeleton state
  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 px-4 pt-4">
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            className="mb-4 rounded-xl bg-white p-4 shadow-sm"
          >
            <View className="mb-3 h-48 rounded-lg bg-gray-200" />
            <View className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
            <View className="h-4 w-1/3 rounded bg-gray-200" />
          </View>
        ))}
        <ActivityIndicator className="mt-4" color="#2563EB" />
      </View>
    );
  }

  // Empty state (no listings yet)
  return (
    <FlatList
      data={[]}
      renderItem={() => null}
      keyExtractor={() => "empty"}
      contentContainerClassName="flex-grow"
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#2563EB"
          colors={["#2563EB"]}
        />
      }
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center px-6">
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
            onPress={() => tabNavigation.navigate({ name: "SellTab", params: { screen: "CreateListing" } })}
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
