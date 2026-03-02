import "./global.css";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import QueryProvider from "./app/providers/QueryProvider";
import RootNavigator from "./app/navigation/RootNavigator";

export default function App() {
  // TODO: Replace with useAuthStore once Zustand + Supabase are wired up
  const isAuthenticated = false;

  return (
    <QueryProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <RootNavigator isAuthenticated={isAuthenticated} />
      </NavigationContainer>
    </QueryProvider>
  );
}
