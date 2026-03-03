import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type {
  MainTabParamList,
  HomeStackParamList,
  SearchStackParamList,
  SellStackParamList,
  FavoritesStackParamList,
  ProfileStackParamList,
} from "./types";
import FeedScreen from "../screens/home/FeedScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import PlaceholderScreen from "../screens/PlaceholderScreen";

// --- Stack navigators for each tab ---

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
function HomeNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="Feed"
        component={FeedScreen}
        options={{ title: "Home" }}
      />
      <HomeStack.Screen name="ListingDetail" options={{ title: "Listing" }}>
        {() => <PlaceholderScreen name="Listing Detail" />}
      </HomeStack.Screen>
      <HomeStack.Screen name="SellerProfile" options={{ title: "Seller" }}>
        {() => <PlaceholderScreen name="Seller Profile" />}
      </HomeStack.Screen>
    </HomeStack.Navigator>
  );
}

const SearchStack = createNativeStackNavigator<SearchStackParamList>();
function SearchNavigator() {
  return (
    <SearchStack.Navigator>
      <SearchStack.Screen name="Search">
        {() => <PlaceholderScreen name="Search" />}
      </SearchStack.Screen>
      <SearchStack.Screen name="ListingDetail" options={{ title: "Listing" }}>
        {() => <PlaceholderScreen name="Listing Detail" />}
      </SearchStack.Screen>
      <SearchStack.Screen name="SellerProfile" options={{ title: "Seller" }}>
        {() => <PlaceholderScreen name="Seller Profile" />}
      </SearchStack.Screen>
    </SearchStack.Navigator>
  );
}

const SellStack = createNativeStackNavigator<SellStackParamList>();
function SellNavigator() {
  return (
    <SellStack.Navigator>
      <SellStack.Screen name="CreateListing" options={{ title: "Sell" }}>
        {() => <PlaceholderScreen name="Create Listing" />}
      </SellStack.Screen>
      <SellStack.Screen name="EditListing" options={{ title: "Edit Listing" }}>
        {() => <PlaceholderScreen name="Edit Listing" />}
      </SellStack.Screen>
    </SellStack.Navigator>
  );
}

const FavStack = createNativeStackNavigator<FavoritesStackParamList>();
function FavoritesNavigator() {
  return (
    <FavStack.Navigator>
      <FavStack.Screen name="Favorites">
        {() => <PlaceholderScreen name="Favorites" />}
      </FavStack.Screen>
      <FavStack.Screen name="ListingDetail" options={{ title: "Listing" }}>
        {() => <PlaceholderScreen name="Listing Detail" />}
      </FavStack.Screen>
      <FavStack.Screen name="SellerProfile" options={{ title: "Seller" }}>
        {() => <PlaceholderScreen name="Seller Profile" />}
      </FavStack.Screen>
    </FavStack.Navigator>
  );
}

const ProfStack = createNativeStackNavigator<ProfileStackParamList>();
function ProfileNavigator() {
  return (
    <ProfStack.Navigator>
      <ProfStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
      <ProfStack.Screen name="EditProfile" options={{ title: "Edit Profile" }}>
        {() => <PlaceholderScreen name="Edit Profile" />}
      </ProfStack.Screen>
      <ProfStack.Screen
        name="OrderDetail"
        options={{ title: "Order Detail" }}
      >
        {() => <PlaceholderScreen name="Order Detail" />}
      </ProfStack.Screen>
      <ProfStack.Screen name="Settings">
        {() => <PlaceholderScreen name="Settings" />}
      </ProfStack.Screen>
    </ProfStack.Navigator>
  );
}

// --- Bottom Tab Navigator ---

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "#8E8E93",
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{ title: "Home" }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchNavigator}
        options={{ title: "Search" }}
      />
      <Tab.Screen
        name="SellTab"
        component={SellNavigator}
        options={{ title: "Sell" }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesNavigator}
        options={{ title: "Favorites" }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
}
