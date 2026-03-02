import { View, Text } from "react-native";

interface Props {
  name: string;
}

export default function PlaceholderScreen({ name }: Props) {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-lg text-gray-500">{name}</Text>
    </View>
  );
}
