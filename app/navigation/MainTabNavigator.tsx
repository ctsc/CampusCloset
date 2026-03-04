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
import SearchScreen from "../screens/search/SearchScreen";
import CreateListingScreen from "../screens/sell/CreateListingScreen";
import EditListingScreen from "../screens/sell/EditListingScreen";
import FavoritesScreen from "../screens/favorites/FavoritesScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import EditProfileScreen from "../screens/profile/EditProfileScreen";
import ListingDetailScreen from "../screens/listing/ListingDetailScreen";
import UserProfileScreen from "../screens/profile/UserProfileScreen";
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
      <HomeStack.Screen
        name="ListingDetail"
        component={ListingDetailScreen}
        options={{ title: "Listing" }}
      />
      <HomeStack.Screen
        name="SellerProfile"
        component={UserProfileScreen}
        options={{ title: "Seller" }}
      />
    </HomeStack.Navigator>
  );
}

const SearchStack = createNativeStackNavigator<SearchStackParamList>();
function SearchNavigator() {
  return (
    <SearchStack.Navigator>
      <SearchStack.Screen
        name="Search"
        component={SearchScreen}
      />
      <SearchStack.Screen
        name="ListingDetail"
        component={ListingDetailScreen}
        options={{ title: "Listing" }}
      />
      <SearchStack.Screen
        name="SellerProfile"
        component={UserProfileScreen}
        options={{ title: "Seller" }}
      />
    </SearchStack.Navigator>
  );
}

const SellStack = createNativeStackNavigator<SellStackParamList>();
function SellNavigator() {
  return (
    <SellStack.Navigator>
      <SellStack.Screen
        name="CreateListing"
        component={CreateListingScreen}
        options={{ title: "Sell" }}
      />
      <SellStack.Screen
        name="EditListing"
        component={EditListingScreen}
        options={{ title: "Edit Listing" }}
      />
    </SellStack.Navigator>
  );
}

const FavStack = createNativeStackNavigator<FavoritesStackParamList>();
function FavoritesNavigator() {
  return (
    <FavStack.Navigator>
      <FavStack.Screen
        name="Favorites"
        component={FavoritesScreen}
      />
      <FavStack.Screen
        name="ListingDetail"
        component={ListingDetailScreen}
        options={{ title: "Listing" }}
      />
      <FavStack.Screen
        name="SellerProfile"
        component={UserProfileScreen}
        options={{ title: "Seller" }}
      />
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
      <ProfStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: "Edit Profile" }}
      />
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
