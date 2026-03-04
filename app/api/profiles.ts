import { supabase } from "./supabase";
import type { Listing } from "./listings";

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  university: string | null;
  push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
}

/** Fetch a user profile by ID. */
export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile;
}

/** Update a user profile. */
export async function updateProfile(
  userId: string,
  updates: UpdateProfileData
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile;
}

/** Fetch active listings for a given user (seller). */
export async function getProfileListings(userId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(
      `
      *,
      listing_images ( id, listing_id, image_url, display_order, created_at ),
      seller:profiles!seller_id ( id, username, avatar_url )
    `
    )
    .eq("seller_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .order("display_order", {
      ascending: true,
      referencedTable: "listing_images",
    });

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as Listing[]) ?? [];
}

/** Check if a username is already taken (excluding a specific user). */
export async function isUsernameTaken(
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  let query = supabase
    .from("profiles")
    .select("id")
    .eq("username", username);

  if (excludeUserId) {
    query = query.neq("id", excludeUserId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data?.length ?? 0) > 0;
}
