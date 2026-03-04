import { supabase } from "./supabase";

export interface ListingImage {
  id: string;
  listing_id: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

export interface ListingSeller {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

export interface Listing {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  size: string | null;
  condition: string;
  status: string;
  created_at: string;
  updated_at: string;
  listing_images: ListingImage[];
  seller: ListingSeller;
}

export type ListingSort = "newest" | "price_asc" | "price_desc";

export interface ListingsFilter {
  category?: string;
  sort?: ListingSort;
}

const PAGE_SIZE = 20;

/** Fetch a paginated list of active listings with images and seller info. */
export async function getListings(
  page: number,
  filters?: ListingsFilter
): Promise<Listing[]> {
  let query = supabase
    .from("listings")
    .select(
      `
      *,
      listing_images ( id, listing_id, image_url, display_order, created_at ),
      seller:profiles!seller_id ( id, username, avatar_url )
    `
    )
    .eq("status", "active");

  if (filters?.category && filters.category !== "All") {
    query = query.eq("category", filters.category);
  }

  switch (filters?.sort) {
    case "price_asc":
      query = query.order("price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  query = query
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    .order("display_order", {
      ascending: true,
      referencedTable: "listing_images",
    });

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as Listing[]) ?? [];
}

/** Fetch a single listing by ID with images and seller info. */
export async function getListing(id: string): Promise<Listing> {
  const { data, error } = await supabase
    .from("listings")
    .select(
      `
      *,
      listing_images ( id, listing_id, image_url, display_order, created_at ),
      seller:profiles!seller_id ( id, username, avatar_url )
    `
    )
    .eq("id", id)
    .order("display_order", {
      ascending: true,
      referencedTable: "listing_images",
    })
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as Listing;
}

export interface CreateListingData {
  title: string;
  description?: string;
  price: number;
  category: string;
  size?: string;
  condition: string;
}

/** Insert a new listing. Returns the created listing row. */
export async function createListing(
  sellerId: string,
  data: CreateListingData
): Promise<{ id: string }> {
  const { data: listing, error } = await supabase
    .from("listings")
    .insert({
      seller_id: sellerId,
      title: data.title,
      description: data.description ?? null,
      price: data.price,
      category: data.category,
      size: data.size ?? null,
      condition: data.condition,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return listing;
}

export interface UpdateListingData {
  title?: string;
  description?: string;
  price?: number;
  category?: string;
  size?: string;
  condition?: string;
}

/** Update an existing listing. */
export async function updateListing(
  id: string,
  data: UpdateListingData
): Promise<void> {
  const { error } = await supabase
    .from("listings")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

/** Soft-delete a listing by setting status to 'archived'. */
export async function archiveListing(id: string): Promise<void> {
  const { error } = await supabase
    .from("listings")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

/** Insert listing image records for a listing. */
export async function createListingImages(
  listingId: string,
  imageUrls: string[]
): Promise<void> {
  const rows = imageUrls.map((url, index) => ({
    listing_id: listingId,
    image_url: url,
    display_order: index,
  }));

  const { error } = await supabase.from("listing_images").insert(rows);

  if (error) {
    throw new Error(error.message);
  }
}

/** Delete all images for a listing (used before re-uploading on edit). */
export async function deleteListingImages(listingId: string): Promise<void> {
  const { error } = await supabase
    .from("listing_images")
    .delete()
    .eq("listing_id", listingId);

  if (error) {
    throw new Error(error.message);
  }
}
