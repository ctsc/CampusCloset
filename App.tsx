import "./global.css";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import QueryProvider from "./app/providers/QueryProvider";
import RootNavigator from "./app/navigation/RootNavigator";
import { supabase } from "./app/api/supabase";
import { useAuthStore } from "./app/store/useAuthStore";

export default function App() {
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    // Check for existing session on launch
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show loading screen while checking initial session
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <QueryProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <RootNavigator isAuthenticated={!!session} />
      </NavigationContainer>
    </QueryProvider>
  );
}
