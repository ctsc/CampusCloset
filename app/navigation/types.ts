import type { NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

// Auth stack
export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

// Each tab's stack
export type HomeStackParamList = {
  Feed: undefined;
  ListingDetail: { listingId: string };
  SellerProfile: { userId: string };
};

export type SearchStackParamList = {
  Search: undefined;
  ListingDetail: { listingId: string };
  SellerProfile: { userId: string };
};

export type SellStackParamList = {
  CreateListing: undefined;
  EditListing: { listingId: string };
};

export type FavoritesStackParamList = {
  Favorites: undefined;
  ListingDetail: { listingId: string };
  SellerProfile: { userId: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  OrderDetail: { orderId: string };
  Settings: undefined;
};

// Bottom tabs
export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  SearchTab: NavigatorScreenParams<SearchStackParamList>;
  SellTab: NavigatorScreenParams<SellStackParamList>;
  FavoritesTab: NavigatorScreenParams<FavoritesStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

// Root navigator
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

// Screen prop helpers
export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type HomeScreenProps<T extends keyof HomeStackParamList> =
  NativeStackScreenProps<HomeStackParamList, T>;

export type SearchScreenProps<T extends keyof SearchStackParamList> =
  NativeStackScreenProps<SearchStackParamList, T>;

export type SellScreenProps<T extends keyof SellStackParamList> =
  NativeStackScreenProps<SellStackParamList, T>;

export type FavoritesScreenProps<T extends keyof FavoritesStackParamList> =
  NativeStackScreenProps<FavoritesStackParamList, T>;

export type ProfileScreenProps<T extends keyof ProfileStackParamList> =
  NativeStackScreenProps<ProfileStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;
