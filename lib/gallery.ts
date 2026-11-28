import "server-only";
import gallerySeedJson from "@/content/gallery-seed.json";
import { insert, remove, select, storageMode, update } from "./supabase";
import {
  localCreateGalleryPhoto,
  localCreateSocialLink,
  localCreateSocialPost,
  localDeleteGalleryPhoto,
  localDeleteSocialLink,
  localDeleteSocialPost,
  localReadGallery,
  localSaveUploadedImage,
  localUpdateGalleryPhoto,
  localUpdateSocialLink,
  localUpdateSocialPost,
  type LocalGalleryPhoto,
  type LocalGallerySpan,
  type LocalSocialLink,
  type LocalSocialPlatform,
  type LocalSocialPost,
} from "./local-store";

export type GallerySpan = LocalGallerySpan;
export type SocialPlatform = LocalSocialPlatform;
export type GalleryPhoto = LocalGalleryPhoto;
export type SocialLink = LocalSocialLink;
export type SocialPost = LocalSocialPost;

export type GalleryData = {
  photos: GalleryPhoto[];
  socials: SocialLink[];
  posts: SocialPost[];
  source: "database" | "local" | "fallback";
};

function staticFallback(): GalleryData {
  const seed = gallerySeedJson as {
    photos: GalleryPhoto[];
    socials: SocialLink[];
    posts: SocialPost[];
  };
  return {
    photos: seed.photos.filter((p) => p.is_visible),
    socials: seed.socials.filter((s) => s.is_visible),
    posts: seed.posts.filter((p) => p.is_visible),
    source: "fallback",
  };
}

/** Public gallery & socials read — visible records only, safe fallback on any error. */
export async function getGallery(): Promise<GalleryData> {
  if (storageMode === "local") {
    try {
      const data = await localReadGallery();
      return {
        photos: data.photos.filter((p) => p.is_visible),
        socials: data.socials.filter((s) => s.is_visible),
        posts: data.posts.filter((p) => p.is_visible),
        source: "local",
      };
    } catch (err) {
      console.error("[gallery] local read failed, serving fallback", err);
      return staticFallback();
    }
  }

  if (storageMode === "none") return staticFallback();

  try {
    const [photos, socials, posts] = await Promise.all([
      select<GalleryPhoto>("gallery_photos", {
        select: "*",
        is_visible: "eq.true",
        order: "sort_order.asc,created_at.asc",
      }),
      select<SocialLink>("social_links", {
        select: "*",
        is_visible: "eq.true",
        order: "sort_order.asc,created_at.asc",
      }),
      select<SocialPost>("social_posts", {
        select: "*",
        is_visible: "eq.true",
        order: "sort_order.asc,created_at.asc",
      }),
    ]);

    if (photos.length === 0 && socials.length === 0 && posts.length === 0) {
      return staticFallback();
    }
    return { photos, socials, posts, source: "database" };
  } catch (err) {
    console.error("[gallery] supabase read failed, serving fallback", err);
    return staticFallback();
  }
}

/** Admin read — includes hidden entries too. */
export async function getGalleryForAdmin(): Promise<GalleryData> {
  if (storageMode === "local") {
    const data = await localReadGallery();
    return { ...data, source: "local" };
  }
  if (storageMode === "none") {
    return { photos: [], socials: [], posts: [], source: "fallback" };
  }
  const [photos, socials, posts] = await Promise.all([
    select<GalleryPhoto>("gallery_photos", {
      select: "*",
      order: "sort_order.asc,created_at.asc",
    }),
    select<SocialLink>("social_links", {
      select: "*",
      order: "sort_order.asc,created_at.asc",
    }),
    select<SocialPost>("social_posts", {
      select: "*",
      order: "sort_order.asc,created_at.asc",
    }),
  ]);
  return { photos, socials, posts, source: "database" };
}

/* ----------------------------------------------------- upload & mutations */

export async function saveGalleryUpload(buf: Buffer): Promise<string> {
  if (storageMode === "local") {
    return localSaveUploadedImage(buf);
  }
  throw new Error(
    "Direct file upload requires local mode or Supabase Storage; paste an image URL instead.",
  );
}

export async function createGalleryPhoto(
  input: Omit<GalleryPhoto, "id">,
): Promise<void> {
  if (storageMode === "local") {
    await localCreateGalleryPhoto(input);
    return;
  }
  if (storageMode === "supabase") {
    await insert("gallery_photos", input);
    return;
  }
  throw new Error("Database is not configured");
}

export async function updateGalleryPhoto(
  id: string,
  patch: Partial<Omit<GalleryPhoto, "id">>,
): Promise<void> {
  if (storageMode === "local") {
    await localUpdateGalleryPhoto(id, patch);
    return;
  }
  if (storageMode === "supabase") {
    await update("gallery_photos", { id: `eq.${id}` }, patch);
    return;
  }
  throw new Error("Database is not configured");
}

export async function deleteGalleryPhoto(id: string): Promise<void> {
  if (storageMode === "local") {
    await localDeleteGalleryPhoto(id);
    return;
  }
  if (storageMode === "supabase") {
    await remove("gallery_photos", { id: `eq.${id}` });
    return;
  }
  throw new Error("Database is not configured");
}

export async function createSocialLink(
  input: Omit<SocialLink, "id">,
): Promise<void> {
  if (storageMode === "local") {
    await localCreateSocialLink(input);
    return;
  }
  if (storageMode === "supabase") {
    await insert("social_links", input);
    return;
  }
  throw new Error("Database is not configured");
}

export async function updateSocialLink(
  id: string,
  patch: Partial<Omit<SocialLink, "id">>,
): Promise<void> {
  if (storageMode === "local") {
    await localUpdateSocialLink(id, patch);
    return;
  }
  if (storageMode === "supabase") {
    await update("social_links", { id: `eq.${id}` }, patch);
    return;
  }
  throw new Error("Database is not configured");
}

export async function deleteSocialLink(id: string): Promise<void> {
  if (storageMode === "local") {
    await localDeleteSocialLink(id);
    return;
  }
  if (storageMode === "supabase") {
    await remove("social_links", { id: `eq.${id}` });
    return;
  }
  throw new Error("Database is not configured");
}

export async function createSocialPost(
  input: Omit<SocialPost, "id">,
): Promise<void> {
  if (storageMode === "local") {
    await localCreateSocialPost(input);
    return;
  }
  if (storageMode === "supabase") {
    await insert("social_posts", input);
    return;
  }
  throw new Error("Database is not configured");
}

export async function updateSocialPost(
  id: string,
  patch: Partial<Omit<SocialPost, "id">>,
): Promise<void> {
  if (storageMode === "local") {
    await localUpdateSocialPost(id, patch);
    return;
  }
  if (storageMode === "supabase") {
    await update("social_posts", { id: `eq.${id}` }, patch);
    return;
  }
  throw new Error("Database is not configured");
}

export async function deleteSocialPost(id: string): Promise<void> {
  if (storageMode === "local") {
    await localDeleteSocialPost(id);
    return;
  }
  if (storageMode === "supabase") {
    await remove("social_posts", { id: `eq.${id}` });
    return;
  }
  throw new Error("Database is not configured");
}
