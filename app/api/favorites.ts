import { supabase } from "./supabase";
import type { Listing } from "./listings";

/** Fetch all favorited listings for a user, with images and seller info. */
export async function getFavorites(userId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select(
      `
      listing:listings (
        *,
        listing_images ( id, listing_id, image_url, display_order, created_at ),
        seller:profiles!seller_id ( id, username, avatar_url )
      )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  // Extract the nested listing objects, filter out nulls (deleted listings)
  return (
    (data
      ?.map((row) => (row as unknown as { listing: Listing }).listing)
      .filter(Boolean) as Listing[]) ?? []
  );
}

/** Add a listing to favorites. */
export async function addFavorite(
  userId: string,
  listingId: string
): Promise<void> {
  const { error } = await supabase
    .from("favorites")
    .insert({ user_id: userId, listing_id: listingId });

  if (error) {
    // Ignore duplicate key errors (already favorited)
    if (error.code === "23505") return;
    throw new Error(error.message);
  }
}

/** Remove a listing from favorites. */
export async function removeFavorite(
  userId: string,
  listingId: string
): Promise<void> {
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("listing_id", listingId);

  if (error) {
    throw new Error(error.message);
  }
}

/** Check which listing IDs from a list are favorited by the user. Returns the set of favorited IDs. */
export async function checkFavorites(
  userId: string,
  listingIds: string[]
): Promise<Set<string>> {
  if (listingIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("user_id", userId)
    .in("listing_id", listingIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Set(data?.map((row) => row.listing_id) ?? []);
}
