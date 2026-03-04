import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../store/useAuthStore";
import { createListing, createListingImages } from "../../api/listings";
import { uploadImage } from "../../utils/imageUpload";
import type { SellScreenProps } from "../../navigation/types";

const CATEGORIES = [
  "Tops",
  "Bottoms",
  "Dresses",
  "Shoes",
  "Accessories",
  "Other",
] as const;

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "One Size"] as const;

const CONDITIONS = [
  { label: "New", value: "new" },
  { label: "Like New", value: "like_new" },
  { label: "Good", value: "good" },
  { label: "Fair", value: "fair" },
] as const;

export const listingSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or less"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .or(z.literal("")),
  price: z
    .string()
    .min(1, "Price is required")
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 1;
      },
      { message: "Price must be at least $1.00" }
    ),
  category: z.enum(CATEGORIES, {
    message: "Please select a category",
  }),
  size: z.enum(SIZES, {
    message: "Please select a size",
  }),
  condition: z.enum(["new", "like_new", "good", "fair"] as const, {
    message: "Please select a condition",
  }),
});

export type ListingFormData = z.infer<typeof listingSchema>;

const MAX_IMAGES = 5;

export interface SelectedImage {
  uri: string;
  id: string;
}

export default function CreateListingScreen({
  navigation,
}: SellScreenProps<"CreateListing">) {
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [uploadProgress, setUploadProgress] = useState("");
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: "",
      description: "",
      price: "",
      category: undefined,
      size: undefined,
      condition: undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ListingFormData) => {
      const userId = session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      // 1. Create the listing row
      setUploadProgress("Creating listing...");
      const listing = await createListing(userId, {
        title: data.title,
        description: data.description || undefined,
        price: parseFloat(data.price),
        category: data.category,
        size: data.size,
        condition: data.condition,
      });

      // 2. Upload each image to storage
      const imageUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        setUploadProgress(
          `Uploading photo ${i + 1} of ${images.length}...`
        );
        const path = `${userId}/${listing.id}/${i}.jpg`;
        const url = await uploadImage("listing-images", path, images[i].uri);
        if (!url) throw new Error(`Failed to upload image ${i + 1}`);
        imageUrls.push(url);
      }

      // 3. Insert listing_images rows
      setUploadProgress("Finishing up...");
      await createListingImages(listing.id, imageUrls);

      return listing.id;
    },
    onSuccess: (listingId) => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["profileListings"] });
      Alert.alert("Success", "Your listing is live!", [
        {
          text: "OK",
          onPress: () => {
            const parent = navigation.getParent();
            if (parent) {
              parent.navigate("HomeTab", {
                screen: "ListingDetail",
                params: { listingId },
              });
            }
          },
        },
      ]);
    },
    onError: (error: Error) => {
      Alert.alert(
        "Error",
        error.message || "Failed to create listing. Please try again."
      );
    },
    onSettled: () => {
      setUploadProgress("");
    },
  });

  const pickImages = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert("Limit Reached", `You can add up to ${MAX_IMAGES} photos.`);
      return;
    }

    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Needed",
        "Please allow access to your photo library."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newImages: SelectedImage[] = result.assets
        .slice(0, MAX_IMAGES - images.length)
        .map((asset) => ({
          uri: asset.uri,
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        }));
      setImages((prev) => [...prev, ...newImages]);
    }
  };

  const takePhoto = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert("Limit Reached", `You can add up to ${MAX_IMAGES} photos.`);
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Needed",
        "Please allow access to your camera."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImages((prev) => [
        ...prev,
        {
          uri: result.assets[0].uri,
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      ]);
    }
  };

  const showImageOptions = () => {
    Alert.alert("Add Photo", "Choose an option", [
      { text: "Camera", onPress: takePhoto },
      { text: "Photo Library", onPress: pickImages },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const onSubmit = (data: ListingFormData) => {
    if (!session?.user?.id) {
      Alert.alert("Error", "You must be logged in to create a listing.");
      return;
    }

    if (images.length === 0) {
      Alert.alert("Photos Required", "Please add at least one photo.");
      return;
    }

    createMutation.mutate(data);
  };

  const submitting = createMutation.isPending;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerClassName="px-4 py-4 pb-8"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Image Picker Section */}
        <Text className="mb-2 text-sm font-medium text-gray-700">
          Photos ({images.length}/{MAX_IMAGES})
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
          contentContainerClassName="gap-3"
        >
          {images.map((img, index) => (
            <View key={img.id} className="relative">
              <Image
                source={{ uri: img.uri }}
                className="h-24 w-24 rounded-lg"
              />
              {index === 0 && (
                <View className="absolute bottom-0 left-0 rounded-br-lg rounded-tl-lg bg-blue-600 px-1.5 py-0.5">
                  <Text className="text-xs font-medium text-white">Cover</Text>
                </View>
              )}
              <TouchableOpacity
                className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full bg-red-500"
                onPress={() => removeImage(img.id)}
              >
                <Text className="text-xs font-bold text-white">X</Text>
              </TouchableOpacity>
            </View>
          ))}
          {images.length < MAX_IMAGES && (
            <TouchableOpacity
              className="h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-300"
              onPress={showImageOptions}
            >
              <Text className="text-2xl text-gray-400">+</Text>
              <Text className="text-xs text-gray-400">Add Photo</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Title */}
        <Text className="mb-1 text-sm font-medium text-gray-700">Title</Text>
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className={`mb-1 rounded-lg border px-4 py-3 text-base ${
                errors.title ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="e.g. Vintage Nike Hoodie"
              maxLength={100}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              editable={!submitting}
            />
          )}
        />
        {errors.title ? (
          <Text className="mb-3 text-sm text-red-500">
            {errors.title.message}
          </Text>
        ) : (
          <View className="mb-3" />
        )}

        {/* Description */}
        <Text className="mb-1 text-sm font-medium text-gray-700">
          Description (optional)
        </Text>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className={`mb-1 rounded-lg border px-4 py-3 text-base ${
                errors.description ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Describe your item..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              editable={!submitting}
              style={{ minHeight: 100 }}
            />
          )}
        />
        {errors.description ? (
          <Text className="mb-3 text-sm text-red-500">
            {errors.description.message}
          </Text>
        ) : (
          <View className="mb-3" />
        )}

        {/* Price */}
        <Text className="mb-1 text-sm font-medium text-gray-700">Price</Text>
        <Controller
          control={control}
          name="price"
          render={({ field: { onChange, onBlur, value } }) => (
            <View className="relative mb-1">
              <Text className="absolute left-4 top-3 z-10 text-base text-gray-500">
                $
              </Text>
              <TextInput
                className={`rounded-lg border py-3 pl-8 pr-4 text-base ${
                  errors.price ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="0.00"
                keyboardType="decimal-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                editable={!submitting}
              />
            </View>
          )}
        />
        {errors.price ? (
          <Text className="mb-3 text-sm text-red-500">
            {errors.price.message}
          </Text>
        ) : (
          <View className="mb-3" />
        )}

        {/* Category */}
        <Text className="mb-2 text-sm font-medium text-gray-700">
          Category
        </Text>
        <Controller
          control={control}
          name="category"
          render={({ field: { onChange, value } }) => (
            <View className="mb-1 flex-row flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  className={`rounded-full px-4 py-2 ${
                    value === cat
                      ? "bg-blue-600"
                      : "border border-gray-300 bg-white"
                  }`}
                  onPress={() => onChange(cat)}
                  disabled={submitting}
                >
                  <Text
                    className={`text-sm font-medium ${
                      value === cat ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        {errors.category ? (
          <Text className="mb-3 text-sm text-red-500">
            {errors.category.message}
          </Text>
        ) : (
          <View className="mb-3" />
        )}

        {/* Size */}
        <Text className="mb-2 text-sm font-medium text-gray-700">Size</Text>
        <Controller
          control={control}
          name="size"
          render={({ field: { onChange, value } }) => (
            <View className="mb-1 flex-row flex-wrap gap-2">
              {SIZES.map((size) => (
                <TouchableOpacity
                  key={size}
                  className={`rounded-full px-4 py-2 ${
                    value === size
                      ? "bg-blue-600"
                      : "border border-gray-300 bg-white"
                  }`}
                  onPress={() => onChange(size)}
                  disabled={submitting}
                >
                  <Text
                    className={`text-sm font-medium ${
                      value === size ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        {errors.size ? (
          <Text className="mb-3 text-sm text-red-500">
            {errors.size.message}
          </Text>
        ) : (
          <View className="mb-3" />
        )}

        {/* Condition */}
        <Text className="mb-2 text-sm font-medium text-gray-700">
          Condition
        </Text>
        <Controller
          control={control}
          name="condition"
          render={({ field: { onChange, value } }) => (
            <View className="mb-1 flex-row flex-wrap gap-2">
              {CONDITIONS.map((cond) => (
                <TouchableOpacity
                  key={cond.value}
                  className={`rounded-full px-4 py-2 ${
                    value === cond.value
                      ? "bg-blue-600"
                      : "border border-gray-300 bg-white"
                  }`}
                  onPress={() => onChange(cond.value)}
                  disabled={submitting}
                >
                  <Text
                    className={`text-sm font-medium ${
                      value === cond.value ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {cond.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        {errors.condition ? (
          <Text className="mb-3 text-sm text-red-500">
            {errors.condition.message}
          </Text>
        ) : (
          <View className="mb-3" />
        )}

        {/* Upload progress */}
        {uploadProgress !== "" && (
          <Text className="mb-2 text-center text-sm text-blue-600">
            {uploadProgress}
          </Text>
        )}

        {/* Submit */}
        <TouchableOpacity
          className={`mt-4 rounded-lg py-4 ${
            submitting ? "bg-blue-400" : "bg-blue-600"
          }`}
          onPress={handleSubmit(onSubmit)}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-center text-base font-semibold text-white">
              List Item
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
