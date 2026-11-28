import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import seedJson from "../content/blackrose-menu.json";
import gallerySeedJson from "../content/gallery-seed.json";

export type LocalGallerySpan = "wide" | "tall" | "square";
export type LocalSocialPlatform =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "tripadvisor"
  | "whatsapp"
  | "other";

export type LocalGalleryPhoto = {
  id: string;
  title: string;
  tag: string;
  alt: string;
  image_url: string;
  span: LocalGallerySpan;
  sort_order: number;
  is_visible: boolean;
};

export type LocalSocialLink = {
  id: string;
  platform: LocalSocialPlatform;
  label: string;
  handle: string;
  url: string;
  sort_order: number;
  is_visible: boolean;
};

export type LocalSocialPost = {
  id: string;
  platform: Exclude<LocalSocialPlatform, "whatsapp">;
  caption: string;
  image_url: string;
  post_url: string;
  posted_label: string;
  sort_order: number;
  is_visible: boolean;
};

type GalleryFile = {
  photos: LocalGalleryPhoto[];
  socials: LocalSocialLink[];
  posts: LocalSocialPost[];
};

export type LocalMenuCategory = {
  id: string;
  name: string;
  kicker: string;
  note: string;
  price_label: string;
  secondary_price_label: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
};

export type LocalMenuItem = {
  id: string;
  category_id: string | null;
  group_name: string;
  name: string;
  description: string;
  price_cents: number | null;
  secondary_price_cents: number | null;
  happy_hour_price_cents: number | null;
  price_note: string;
  currency: string;
  badge: string;
  is_signature: boolean;
  is_available: boolean;
  sort_order: number;
};

export type LocalReservation = {
  reference: string;
  created_at: string;
  name: string;
  phone: string;
  guests: string;
  night: string;
  time: string;
  notes: string;
  status: "requested" | "confirmed" | "seated" | "no_show" | "cancelled";
  source: string;
  handled_by?: string | null;
  handled_at: string | null;
};

type MenuFile = {
  categories: LocalMenuCategory[];
  items: LocalMenuItem[];
};

export const localStoreAllowed =
  process.env.NODE_ENV !== "production" || process.env.ALLOW_FILE_STORE === "1";

function dataDir() {
  return process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".data");
}

const menuFilePath = () => path.join(dataDir(), "menu.json");
const galleryFilePath = () => path.join(dataDir(), "gallery.json");
const uploadsDirPath = () => path.join(dataDir(), "uploads");
const reservationsFilePath = () => path.join(dataDir(), "reservations.json");
const legacyReservationsJsonlPath = () =>
  path.join(dataDir(), "reservations.jsonl");

/** Serialize read-modify-write operations per file path within the Node process. */
const locks = new Map<string, Promise<unknown>>();
function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(
    key,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

async function atomicWriteJson(filePath: string, data: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.${randomUUID().slice(0, 8)}.tmp`;
  await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(tmp, filePath);
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

type SeedItem = {
  name: string;
  group_name?: string;
  description?: string;
  price?: number | null;
  secondary_price?: number | null;
  happy_hour_price?: number | null;
  price_note?: string;
  badge?: string;
  signature?: boolean;
  available?: boolean;
  sort_order?: number;
};

type SeedCategory = {
  name: string;
  kicker?: string;
  note?: string;
  price_label?: string;
  secondary_price_label?: string;
  image_url?: string;
  sort_order?: number;
  items?: SeedItem[];
};

function defaultMenuSeed(): MenuFile {
  const categories: LocalMenuCategory[] = [];
  const items: LocalMenuItem[] = [];
  const rawCategories = (seedJson as { categories: SeedCategory[] }).categories;

  for (let ci = 0; ci < rawCategories.length; ci++) {
    const c = rawCategories[ci];
    const catId = `cat-${slug(c.name) || ci + 1}`;
    categories.push({
      id: catId,
      name: c.name,
      kicker: c.kicker ?? "",
      note: c.note ?? "",
      price_label: c.price_label ?? "",
      secondary_price_label: c.secondary_price_label ?? "",
      image_url: c.image_url ?? "",
      sort_order: c.sort_order ?? (ci + 1) * 10,
      is_active: true,
    });

    for (let ii = 0; ii < (c.items ?? []).length; ii++) {
      const it = c.items![ii];
      const groupSlug = it.group_name ? `-${slug(it.group_name)}` : "";
      items.push({
        id: `item-${slug(c.name)}${groupSlug}-${slug(it.name) || ii + 1}`,
        category_id: catId,
        group_name: it.group_name ?? "",
        name: it.name,
        description: it.description ?? "",
        price_cents:
          typeof it.price === "number" ? Math.round(it.price * 100) : null,
        secondary_price_cents:
          typeof it.secondary_price === "number"
            ? Math.round(it.secondary_price * 100)
            : null,
        happy_hour_price_cents:
          typeof it.happy_hour_price === "number"
            ? Math.round(it.happy_hour_price * 100)
            : null,
        price_note: it.price_note ?? "",
        currency: "ETB",
        badge: it.badge ?? "",
        is_signature: Boolean(it.signature),
        is_available: it.available ?? true,
        sort_order: it.sort_order ?? (ii + 1) * 10,
      });
    }
  }

  return { categories, items };
}

function normalizeCategory(c: Partial<LocalMenuCategory>): LocalMenuCategory {
  return {
    id: c.id ?? randomUUID(),
    name: c.name ?? "",
    kicker: c.kicker ?? "",
    note: c.note ?? "",
    price_label: c.price_label ?? "",
    secondary_price_label: c.secondary_price_label ?? "",
    image_url: c.image_url ?? "",
    sort_order: c.sort_order ?? 100,
    is_active: c.is_active ?? true,
  };
}

function normalizeItem(i: Partial<LocalMenuItem>): LocalMenuItem {
  return {
    id: i.id ?? randomUUID(),
    category_id: i.category_id ?? null,
    group_name: i.group_name ?? "",
    name: i.name ?? "",
    description: i.description ?? "",
    price_cents: i.price_cents ?? null,
    secondary_price_cents: i.secondary_price_cents ?? null,
    happy_hour_price_cents: i.happy_hour_price_cents ?? null,
    price_note: i.price_note ?? "",
    currency: i.currency ?? "ETB",
    badge: i.badge ?? "",
    is_signature: Boolean(i.is_signature),
    is_available: i.is_available ?? true,
    sort_order: i.sort_order ?? 100,
  };
}

const byOrderAndName = <T extends { sort_order: number; name: string }>(
  a: T,
  b: T,
) =>
  a.sort_order - b.sort_order ||
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

async function readMenuFile(): Promise<MenuFile> {
  const file = menuFilePath();
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as Partial<MenuFile>;
    return {
      categories: Array.isArray(parsed.categories)
        ? parsed.categories.map(normalizeCategory)
        : [],
      items: Array.isArray(parsed.items)
        ? parsed.items.map(normalizeItem)
        : [],
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") {
      const seed = defaultMenuSeed();
      await atomicWriteJson(file, seed);
      return seed;
    }
    throw err;
  }
}

/* ---------------------------------------------------------------- menu */

export async function localReadMenuData(): Promise<MenuFile> {
  const data = await withLock(menuFilePath(), () => readMenuFile());
  return {
    categories: [...data.categories].sort(byOrderAndName),
    items: [...data.items].sort(byOrderAndName),
  };
}

export async function localCreateCategory(
  input: Omit<LocalMenuCategory, "id">,
): Promise<LocalMenuCategory> {
  return withLock(menuFilePath(), async () => {
    const data = await readMenuFile();
    const cat: LocalMenuCategory = { id: randomUUID(), ...input };
    data.categories.push(cat);
    await atomicWriteJson(menuFilePath(), data);
    return cat;
  });
}

export async function localUpdateCategory(
  id: string,
  patch: Partial<Omit<LocalMenuCategory, "id">>,
): Promise<LocalMenuCategory | null> {
  return withLock(menuFilePath(), async () => {
    const data = await readMenuFile();
    const idx = data.categories.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    data.categories[idx] = { ...data.categories[idx], ...patch };
    await atomicWriteJson(menuFilePath(), data);
    return data.categories[idx];
  });
}

export async function localDeleteCategory(id: string): Promise<void> {
  await withLock(menuFilePath(), async () => {
    const data = await readMenuFile();
    data.categories = data.categories.filter((c) => c.id !== id);
    // Match Postgres ON DELETE SET NULL: items remain, uncategorised
    data.items = data.items.map((item) =>
      item.category_id === id ? { ...item, category_id: null } : item,
    );
    await atomicWriteJson(menuFilePath(), data);
  });
}

function assertUniqueItemName(
  items: LocalMenuItem[],
  categoryId: string | null,
  name: string,
  groupName: string,
  excludeId?: string,
) {
  if (!categoryId) return;
  const target = name.trim().toLowerCase();
  const targetGroup = groupName.trim().toLowerCase();
  const conflict = items.some(
    (item) =>
      item.id !== excludeId &&
      item.category_id === categoryId &&
      item.name.trim().toLowerCase() === target &&
      item.group_name.trim().toLowerCase() === targetGroup,
  );
  if (conflict) {
    throw new Error(
      `local 23505: duplicate item "${name}" in category ${categoryId} (group "${groupName}")`,
    );
  }
}

export async function localCreateItem(
  input: Omit<LocalMenuItem, "id" | "currency" | "group_name" | "happy_hour_price_cents"> & {
    currency?: string;
    group_name?: string;
    happy_hour_price_cents?: number | null;
  },
): Promise<LocalMenuItem> {
  return withLock(menuFilePath(), async () => {
    const data = await readMenuFile();
    const groupName = input.group_name ?? "";
    assertUniqueItemName(data.items, input.category_id, input.name, groupName);
    const item: LocalMenuItem = {
      id: randomUUID(),
      currency: input.currency ?? "ETB",
      group_name: groupName,
      happy_hour_price_cents: input.happy_hour_price_cents ?? null,
      ...input,
    };
    data.items.push(item);
    await atomicWriteJson(menuFilePath(), data);
    return item;
  });
}

export async function localUpdateItem(
  id: string,
  patch: Partial<Omit<LocalMenuItem, "id">>,
): Promise<LocalMenuItem | null> {
  return withLock(menuFilePath(), async () => {
    const data = await readMenuFile();
    const idx = data.items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const next = { ...data.items[idx], ...patch };
    assertUniqueItemName(data.items, next.category_id, next.name, next.group_name, id);
    data.items[idx] = next;
    await atomicWriteJson(menuFilePath(), data);
    return next;
  });
}

export async function localDeleteItem(id: string): Promise<void> {
  await withLock(menuFilePath(), async () => {
    const data = await readMenuFile();
    data.items = data.items.filter((i) => i.id !== id);
    await atomicWriteJson(menuFilePath(), data);
  });
}

export async function localReplaceMenu(next: MenuFile): Promise<void> {
  await withLock(menuFilePath(), async () => {
    await atomicWriteJson(menuFilePath(), next);
  });
}

/* ------------------------------------------------------------ bookings */

async function readReservationsFile(): Promise<LocalReservation[]> {
  const file = reservationsFilePath();
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalReservation[]) : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") throw err;
  }

  // Migrate legacy .data/reservations.jsonl if present
  try {
    const legacy = await readFile(legacyReservationsJsonlPath(), "utf8");
    const rows: LocalReservation[] = [];
    for (const line of legacy.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const obj = JSON.parse(trimmed) as Partial<LocalReservation>;
        if (obj.reference && obj.name && obj.phone) {
          rows.push({
            reference: obj.reference,
            created_at: obj.created_at ?? new Date().toISOString(),
            name: obj.name,
            phone: obj.phone,
            guests: obj.guests ?? "",
            night: obj.night ?? "",
            time: obj.time ?? "",
            notes: obj.notes ?? "",
            status: obj.status ?? "requested",
            source: obj.source ?? "web",
            handled_at: obj.handled_at ?? null,
          });
        }
      } catch {
        /* ignore malformed line */
      }
    }
    if (rows.length > 0) {
      await atomicWriteJson(file, rows);
    }
    return rows;
  } catch {
    return [];
  }
}

export async function localListReservations(
  limit = 300,
): Promise<LocalReservation[]> {
  const rows = await withLock(reservationsFilePath(), () =>
    readReservationsFile(),
  );
  return [...rows]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

export async function localSaveReservation(
  record: LocalReservation,
): Promise<LocalReservation> {
  return withLock(reservationsFilePath(), async () => {
    const rows = await readReservationsFile();
    rows.unshift(record);
    await atomicWriteJson(reservationsFilePath(), rows);
    return record;
  });
}

export async function localUpdateReservation(
  reference: string,
  patch: Partial<Pick<LocalReservation, "status" | "notes" | "handled_at">>,
): Promise<LocalReservation | null> {
  return withLock(reservationsFilePath(), async () => {
    const rows = await readReservationsFile();
    const idx = rows.findIndex((r) => r.reference === reference);
    if (idx === -1) return null;
    rows[idx] = { ...rows[idx], ...patch };
    await atomicWriteJson(reservationsFilePath(), rows);
    return rows[idx];
  });
}

export async function localDeleteReservation(reference: string): Promise<void> {
  await withLock(reservationsFilePath(), async () => {
    const rows = await readReservationsFile();
    const next = rows.filter((r) => r.reference !== reference);
    await atomicWriteJson(reservationsFilePath(), next);
  });
}

export async function localPurgeOldReservations(
  keepDays = 45,
): Promise<number> {
  return withLock(reservationsFilePath(), async () => {
    const rows = await readReservationsFile();
    const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
    const kept = rows.filter((r) => {
      const ts = Date.parse(r.created_at);
      return Number.isNaN(ts) || ts >= cutoff;
    });
    const removed = rows.length - kept.length;
    if (removed > 0) {
      await atomicWriteJson(reservationsFilePath(), kept);
    }
    return removed;
  });
}

/* ----------------------------------------------------- gallery & socials */

function defaultGallerySeed(): GalleryFile {
  const raw = gallerySeedJson as GalleryFile;
  return {
    photos: (raw.photos ?? []).map((p, idx) => ({
      ...p,
      sort_order: typeof p.sort_order === "number" ? p.sort_order : (idx + 1) * 10,
      is_visible: p.is_visible ?? true,
    })),
    socials: (raw.socials ?? []).map((s, idx) => ({
      ...s,
      sort_order: typeof s.sort_order === "number" ? s.sort_order : (idx + 1) * 10,
      is_visible: s.is_visible ?? true,
    })),
    posts: (raw.posts ?? []).map((p, idx) => ({
      ...p,
      sort_order: typeof p.sort_order === "number" ? p.sort_order : (idx + 1) * 10,
      is_visible: p.is_visible ?? true,
    })),
  };
}

async function readGalleryFile(): Promise<GalleryFile> {
  const file = galleryFilePath();
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as Partial<GalleryFile>;
    if (
      Array.isArray(parsed.photos) &&
      Array.isArray(parsed.socials) &&
      Array.isArray(parsed.posts)
    ) {
      return {
        photos: parsed.photos,
        socials: parsed.socials,
        posts: parsed.posts,
      };
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") throw err;
  }
  const seeded = defaultGallerySeed();
  await atomicWriteJson(file, seeded);
  return seeded;
}

export async function localReadGallery(): Promise<GalleryFile> {
  return withLock(galleryFilePath(), async () => {
    const data = await readGalleryFile();
    return {
      photos: [...data.photos].sort((a, b) => a.sort_order - b.sort_order),
      socials: [...data.socials].sort((a, b) => a.sort_order - b.sort_order),
      posts: [...data.posts].sort((a, b) => a.sort_order - b.sort_order),
    };
  });
}

export async function localCreateGalleryPhoto(
  input: Omit<LocalGalleryPhoto, "id">,
): Promise<LocalGalleryPhoto> {
  return withLock(galleryFilePath(), async () => {
    const data = await readGalleryFile();
    const row: LocalGalleryPhoto = { id: randomUUID(), ...input };
    data.photos.push(row);
    await atomicWriteJson(galleryFilePath(), data);
    return row;
  });
}

export async function localUpdateGalleryPhoto(
  id: string,
  patch: Partial<Omit<LocalGalleryPhoto, "id">>,
): Promise<LocalGalleryPhoto | null> {
  return withLock(galleryFilePath(), async () => {
    const data = await readGalleryFile();
    const idx = data.photos.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    data.photos[idx] = { ...data.photos[idx], ...patch };
    await atomicWriteJson(galleryFilePath(), data);
    return data.photos[idx];
  });
}

export async function localDeleteGalleryPhoto(id: string): Promise<void> {
  await withLock(galleryFilePath(), async () => {
    const data = await readGalleryFile();
    const target = data.photos.find((p) => p.id === id);
    data.photos = data.photos.filter((p) => p.id !== id);
    await atomicWriteJson(galleryFilePath(), data);
    if (target?.image_url.startsWith("/api/media/")) {
      const fname = target.image_url.slice("/api/media/".length);
      const stillUsed =
        data.photos.some((p) => p.image_url === target.image_url) ||
        data.posts.some((p) => p.image_url === target.image_url);
      if (!stillUsed && /^[a-z0-9-]+\.(jpg|jpeg|png|webp)$/.test(fname)) {
        await unlink(path.join(uploadsDirPath(), fname)).catch(() => {});
      }
    }
  });
}

export async function localCreateSocialLink(
  input: Omit<LocalSocialLink, "id">,
): Promise<LocalSocialLink> {
  return withLock(galleryFilePath(), async () => {
    const data = await readGalleryFile();
    const row: LocalSocialLink = { id: randomUUID(), ...input };
    data.socials.push(row);
    await atomicWriteJson(galleryFilePath(), data);
    return row;
  });
}

export async function localUpdateSocialLink(
  id: string,
  patch: Partial<Omit<LocalSocialLink, "id">>,
): Promise<LocalSocialLink | null> {
  return withLock(galleryFilePath(), async () => {
    const data = await readGalleryFile();
    const idx = data.socials.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    data.socials[idx] = { ...data.socials[idx], ...patch };
    await atomicWriteJson(galleryFilePath(), data);
    return data.socials[idx];
  });
}

export async function localDeleteSocialLink(id: string): Promise<void> {
  await withLock(galleryFilePath(), async () => {
    const data = await readGalleryFile();
    data.socials = data.socials.filter((s) => s.id !== id);
    await atomicWriteJson(galleryFilePath(), data);
  });
}

export async function localCreateSocialPost(
  input: Omit<LocalSocialPost, "id">,
): Promise<LocalSocialPost> {
  return withLock(galleryFilePath(), async () => {
    const data = await readGalleryFile();
    const row: LocalSocialPost = { id: randomUUID(), ...input };
    data.posts.push(row);
    await atomicWriteJson(galleryFilePath(), data);
    return row;
  });
}

export async function localUpdateSocialPost(
  id: string,
  patch: Partial<Omit<LocalSocialPost, "id">>,
): Promise<LocalSocialPost | null> {
  return withLock(galleryFilePath(), async () => {
    const data = await readGalleryFile();
    const idx = data.posts.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    data.posts[idx] = { ...data.posts[idx], ...patch };
    await atomicWriteJson(galleryFilePath(), data);
    return data.posts[idx];
  });
}

export async function localDeleteSocialPost(id: string): Promise<void> {
  await withLock(galleryFilePath(), async () => {
    const data = await readGalleryFile();
    const target = data.posts.find((p) => p.id === id);
    data.posts = data.posts.filter((p) => p.id !== id);
    await atomicWriteJson(galleryFilePath(), data);
    if (target?.image_url.startsWith("/api/media/")) {
      const fname = target.image_url.slice("/api/media/".length);
      const stillUsed =
        data.photos.some((p) => p.image_url === target.image_url) ||
        data.posts.some((p) => p.image_url === target.image_url);
      if (!stillUsed && /^[a-z0-9-]+\.(jpg|jpeg|png|webp)$/.test(fname)) {
        await unlink(path.join(uploadsDirPath(), fname)).catch(() => {});
      }
    }
  });
}

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function detectImageExtension(buf: Buffer): "jpg" | "png" | "webp" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "png";
  }
  if (
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

export async function localSaveUploadedImage(buf: Buffer): Promise<string> {
  if (buf.length === 0) throw new Error("Empty image file");
  if (buf.length > MAX_UPLOAD_BYTES) {
    throw new Error("Image is larger than 8 MB");
  }
  const ext = detectImageExtension(buf);
  if (!ext) {
    throw new Error("Unsupported image format (use JPEG, PNG, or WebP)");
  }
  const dir = uploadsDirPath();
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  const full = path.join(dir, filename);
  await writeFile(full, buf);
  return `/api/media/${filename}`;
}

export async function localReadUploadedImage(
  filename: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  if (!/^[a-z0-9-]+\.(jpg|jpeg|png|webp)$/.test(filename)) return null;
  const full = path.join(uploadsDirPath(), filename);
  try {
    const data = await readFile(full);
    const ext = path.extname(filename).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".webp"
          ? "image/webp"
          : "image/jpeg";
    return { data, contentType };
  } catch {
    return null;
  }
}
