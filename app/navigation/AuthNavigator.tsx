import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "./types";
import PlaceholderScreen from "../screens/PlaceholderScreen";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login">
        {() => <PlaceholderScreen name="Login" />}
      </Stack.Screen>
      <Stack.Screen name="SignUp">
        {() => <PlaceholderScreen name="Sign Up" />}
      </Stack.Screen>
      <Stack.Screen name="ForgotPassword">
        {() => <PlaceholderScreen name="Forgot Password" />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
