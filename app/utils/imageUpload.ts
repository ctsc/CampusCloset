import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { supabase } from "../api/supabase";
import { decode } from "base64-arraybuffer";

const MAX_WIDTH = 800;
const JPEG_QUALITY = 0.8;

/** Pick an image from the device library. Returns the local URI or null if cancelled. */
export async function pickImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsEditing: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return result.assets[0].uri;
}

/** Compress and resize an image to 800px wide, JPEG 80% quality. */
async function compressToBase64(uri: string) {
  const ref = await ImageManipulator.manipulate(uri)
    .resize({ width: MAX_WIDTH })
    .renderAsync();

  return ref.saveAsync({
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
    base64: true,
  });
}

/**
 * Upload an image to Supabase Storage.
 *
 * @param bucket - Storage bucket name (e.g. "listing-images" or "avatars")
 * @param path - Full path within the bucket (e.g. "{userId}/{listingId}/0.jpg")
 * @param uri - Local image URI to upload
 * @returns Public URL of the uploaded image, or null on failure
 */
export async function uploadImage(
  bucket: string,
  path: string,
  uri: string
): Promise<string | null> {
  const compressed = await compressToBase64(uri);

  if (!compressed.base64) {
    return null;
  }

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, decode(compressed.base64), {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) {
    console.error("Upload error:", error.message);
    return null;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return publicUrl;
}

/**
 * Pick, compress, and upload an image in one step.
 *
 * @param bucket - Storage bucket name
 * @param path - Full path within the bucket
 * @returns Public URL of the uploaded image, or null if cancelled/failed
 */
export async function pickAndUploadImage(
  bucket: string,
  path: string
): Promise<string | null> {
  const uri = await pickImage();
  if (!uri) return null;
  return uploadImage(bucket, path, uri);
}
