"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/auth";
import { storageMode } from "@/lib/supabase";
import {
  createGalleryPhoto,
  createSocialLink,
  createSocialPost,
  deleteGalleryPhoto,
  deleteSocialLink,
  deleteSocialPost,
  saveGalleryUpload,
  type GallerySpan,
  type SocialPlatform,
  updateGalleryPhoto,
  updateSocialLink,
  updateSocialPost,
} from "@/lib/gallery";

async function requireAdmin() {
  if (!(await isSignedIn())) redirect("/admin/login");
  if (storageMode === "none") throw new Error("Database is not configured");
}

function revalidateGallery() {
  revalidatePath("/admin/gallery");
  revalidatePath("/gallery");
  revalidatePath("/");
  revalidatePath("/week");
  revalidatePath("/menu");
  revalidatePath("/visit");
}

const str = (fd: FormData, key: string, max = 400) =>
  String(fd.get(key) ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .trim()
    .slice(0, max);

const int = (fd: FormData, key: string, fallback = 0) => {
  const n = Number.parseInt(String(fd.get(key) ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
};

const bool = (fd: FormData, key: string) =>
  fd.get(key) === "on" || fd.get(key) === "true";

const SPANS: readonly GallerySpan[] = ["wide", "tall", "square"];
const PLATFORMS: readonly SocialPlatform[] = [
  "instagram",
  "facebook",
  "tiktok",
  "tripadvisor",
  "whatsapp",
  "other",
];
const POST_PLATFORMS: readonly Exclude<SocialPlatform, "whatsapp">[] = [
  "instagram",
  "facebook",
  "tiktok",
  "tripadvisor",
  "other",
];

function sanitizeUrl(raw: string, allowRelative = true): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (allowRelative && trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    /* invalid URL */
  }
  return "";
}

async function resolveImageInput(fd: FormData): Promise<string> {
  const file = fd.get("image_file");
  if (file instanceof File && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    return saveGalleryUpload(buf);
  }
  return sanitizeUrl(str(fd, "image_url", 500), true);
}

/* ----------------------------------------------------- gallery photos */

export async function addGalleryPhoto(fd: FormData) {
  await requireAdmin();
  const title = str(fd, "title", 120);
  if (!title) redirect("/admin/gallery?err=title");

  let image_url = "";
  try {
    image_url = await resolveImageInput(fd);
  } catch (err) {
    const msg = encodeURIComponent(
      err instanceof Error ? err.message : "Upload failed",
    );
    redirect(`/admin/gallery?err=${msg}`);
  }
  if (!image_url) redirect("/admin/gallery?err=image");

  const spanRaw = str(fd, "span", 16) as GallerySpan;
  const span = SPANS.includes(spanRaw) ? spanRaw : "wide";

  await createGalleryPhoto({
    title,
    tag: str(fd, "tag", 48),
    alt: str(fd, "alt", 240) || title,
    image_url,
    span,
    sort_order: int(fd, "sort_order", 100),
    is_visible: true,
  });
  revalidateGallery();
  redirect("/admin/gallery?saved=photo");
}

export async function saveGalleryPhoto(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id", 80);
  const title = str(fd, "title", 120);
  if (!id || !title) return;

  const spanRaw = str(fd, "span", 16) as GallerySpan;
  const span = SPANS.includes(spanRaw) ? spanRaw : "wide";
  let image_url = sanitizeUrl(str(fd, "image_url", 500), true);

  const file = fd.get("image_file");
  if (file instanceof File && file.size > 0) {
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      image_url = await saveGalleryUpload(buf);
    } catch (err) {
      const msg = encodeURIComponent(
        err instanceof Error ? err.message : "Upload failed",
      );
      redirect(`/admin/gallery?err=${msg}`);
    }
  }

  await updateGalleryPhoto(id, {
    title,
    tag: str(fd, "tag", 48),
    alt: str(fd, "alt", 240) || title,
    ...(image_url ? { image_url } : {}),
    span,
    sort_order: int(fd, "sort_order", 0),
    is_visible: bool(fd, "is_visible"),
  });
  revalidateGallery();
  redirect("/admin/gallery?saved=photo");
}

export async function toggleGalleryPhoto(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id", 80);
  if (!id) return;
  await updateGalleryPhoto(id, { is_visible: bool(fd, "is_visible") });
  revalidateGallery();
}

export async function removeGalleryPhoto(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id", 80);
  if (!id) return;
  await deleteGalleryPhoto(id);
  revalidateGallery();
}

/* ----------------------------------------------------- social links */

export async function addSocialLink(fd: FormData) {
  await requireAdmin();
  const label = str(fd, "label", 60);
  const url = sanitizeUrl(str(fd, "url", 500), false);
  if (!label || !url) redirect("/admin/gallery?err=social");

  const platRaw = str(fd, "platform", 20) as SocialPlatform;
  const platform = PLATFORMS.includes(platRaw) ? platRaw : "other";

  await createSocialLink({
    platform,
    label,
    handle: str(fd, "handle", 80),
    url,
    sort_order: int(fd, "sort_order", 50),
    is_visible: true,
  });
  revalidateGallery();
  redirect("/admin/gallery?saved=social");
}

export async function saveSocialLink(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id", 80);
  const label = str(fd, "label", 60);
  const url = sanitizeUrl(str(fd, "url", 500), false);
  if (!id || !label || !url) return;

  const platRaw = str(fd, "platform", 20) as SocialPlatform;
  const platform = PLATFORMS.includes(platRaw) ? platRaw : "other";

  await updateSocialLink(id, {
    platform,
    label,
    handle: str(fd, "handle", 80),
    url,
    sort_order: int(fd, "sort_order", 0),
    is_visible: bool(fd, "is_visible"),
  });
  revalidateGallery();
  redirect("/admin/gallery?saved=social");
}

export async function removeSocialLink(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id", 80);
  if (!id) return;
  await deleteSocialLink(id);
  revalidateGallery();
}

/* ----------------------------------------------------- social posts */

export async function addSocialPost(fd: FormData) {
  await requireAdmin();
  const caption = str(fd, "caption", 400);
  if (!caption) redirect("/admin/gallery?err=caption");

  let image_url = "";
  try {
    image_url = await resolveImageInput(fd);
  } catch (err) {
    const msg = encodeURIComponent(
      err instanceof Error ? err.message : "Upload failed",
    );
    redirect(`/admin/gallery?err=${msg}`);
  }
  if (!image_url) redirect("/admin/gallery?err=image");

  const platRaw = str(fd, "platform", 20) as Exclude<SocialPlatform, "whatsapp">;
  const platform = POST_PLATFORMS.includes(platRaw) ? platRaw : "instagram";

  await createSocialPost({
    platform,
    caption,
    image_url,
    post_url: sanitizeUrl(str(fd, "post_url", 500), true),
    posted_label: str(fd, "posted_label", 60),
    sort_order: int(fd, "sort_order", 50),
    is_visible: true,
  });
  revalidateGallery();
  redirect("/admin/gallery?saved=post");
}

export async function saveSocialPost(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id", 80);
  const caption = str(fd, "caption", 400);
  if (!id || !caption) return;

  const platRaw = str(fd, "platform", 20) as Exclude<SocialPlatform, "whatsapp">;
  const platform = POST_PLATFORMS.includes(platRaw) ? platRaw : "instagram";
  let image_url = sanitizeUrl(str(fd, "image_url", 500), true);

  const file = fd.get("image_file");
  if (file instanceof File && file.size > 0) {
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      image_url = await saveGalleryUpload(buf);
    } catch (err) {
      const msg = encodeURIComponent(
        err instanceof Error ? err.message : "Upload failed",
      );
      redirect(`/admin/gallery?err=${msg}`);
    }
  }

  await updateSocialPost(id, {
    platform,
    caption,
    ...(image_url ? { image_url } : {}),
    post_url: sanitizeUrl(str(fd, "post_url", 500), true),
    posted_label: str(fd, "posted_label", 60),
    sort_order: int(fd, "sort_order", 0),
    is_visible: bool(fd, "is_visible"),
  });
  revalidateGallery();
  redirect("/admin/gallery?saved=post");
}

export async function removeSocialPost(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id", 80);
  if (!id) return;
  await deleteSocialPost(id);
  revalidateGallery();
}
