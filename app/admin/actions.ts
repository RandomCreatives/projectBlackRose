"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { storageMode } from "@/lib/supabase";
import { isSignedIn } from "@/lib/auth";
import {
  createMenuCategory,
  createMenuItem,
  deleteMenuCategory,
  deleteMenuItem,
  parsePrice,
  toggleMenuItem,
  updateMenuCategory,
  updateMenuItem,
} from "@/lib/menu";
import {
  deleteReservationRecord,
  purgeOldReservations,
  type ReservationStatus,
  updateReservationNotes,
  updateReservationStatus,
} from "@/lib/store";

async function requireAdmin() {
  if (!(await isSignedIn())) redirect("/admin/login");
  if (storageMode === "none") throw new Error("Database is not configured");
}

function revalidateMenu() {
  revalidatePath("/admin/menu");
  revalidatePath("/menu");
  revalidatePath("/");
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

/* ------------------------------------------------------------ bookings */

const STATUSES: readonly ReservationStatus[] = [
  "requested",
  "confirmed",
  "seated",
  "no_show",
  "cancelled",
];

export async function setReservationStatus(fd: FormData) {
  await requireAdmin();
  const reference = str(fd, "reference", 20);
  const status = str(fd, "status", 20) as ReservationStatus;
  if (!reference || !STATUSES.includes(status)) return;
  await updateReservationStatus(reference, status);
  revalidatePath("/admin/bookings");
}

export async function setReservationNotes(fd: FormData) {
  await requireAdmin();
  const reference = str(fd, "reference", 20);
  if (!reference) return;
  await updateReservationNotes(reference, str(fd, "notes", 400));
  revalidatePath("/admin/bookings");
}

export async function deleteReservation(fd: FormData) {
  await requireAdmin();
  const reference = str(fd, "reference", 20);
  if (!reference) return;
  await deleteReservationRecord(reference);
  revalidatePath("/admin/bookings");
}

export async function purgeOld() {
  await requireAdmin();
  await purgeOldReservations(45);
  revalidatePath("/admin/bookings");
}

/* ---------------------------------------------------------------- menu */

export async function createCategory(fd: FormData) {
  await requireAdmin();
  const name = str(fd, "name", 60);
  if (name.length < 2) return;
  await createMenuCategory({
    name,
    kicker: str(fd, "kicker", 60),
    note: str(fd, "note", 200),
    price_label: str(fd, "price_label", 30),
    secondary_price_label: str(fd, "secondary_price_label", 30),
    image_url: str(fd, "image_url", 200),
    sort_order: int(fd, "sort_order", 100),
    is_active: true,
  });
  revalidateMenu();
}

export async function updateCategory(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id", 80);
  if (!id) return;
  await updateMenuCategory(id, {
    name: str(fd, "name", 60),
    kicker: str(fd, "kicker", 60),
    note: str(fd, "note", 200),
    price_label: str(fd, "price_label", 30),
    secondary_price_label: str(fd, "secondary_price_label", 30),
    image_url: str(fd, "image_url", 200),
    sort_order: int(fd, "sort_order", 100),
    is_active: bool(fd, "is_active"),
  });
  revalidateMenu();
}

export async function deleteCategory(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id", 80);
  if (!id) return;
  await deleteMenuCategory(id);
  revalidateMenu();
}

export async function createItem(fd: FormData) {
  await requireAdmin();
  const name = str(fd, "name", 80);
  if (!name) return;
  try {
    await createMenuItem({
      category_id: str(fd, "category_id", 80) || null,
      name,
      description: str(fd, "description", 300),
      price_cents: parsePrice(str(fd, "price", 20)),
      secondary_price_cents: parsePrice(str(fd, "secondary_price", 20)),
      price_note: str(fd, "price_note", 60),
      badge: str(fd, "badge", 40),
      is_signature: bool(fd, "is_signature"),
      is_available: true,
      sort_order: int(fd, "sort_order", 100),
    });
  } catch (err) {
    // 23505 = a serve with that name is already in this category. That is the correct
    // outcome of a double-click; nothing to do but refresh.
    if (!(err instanceof Error) || !err.message.includes("23505")) throw err;
  }
  revalidateMenu();
}

export async function updateItem(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id", 80);
  if (!id) return;
  try {
    await updateMenuItem(id, {
      category_id: str(fd, "category_id", 80) || null,
      name: str(fd, "name", 80),
      description: str(fd, "description", 300),
      price_cents: parsePrice(str(fd, "price", 20)),
      secondary_price_cents: parsePrice(str(fd, "secondary_price", 20)),
      price_note: str(fd, "price_note", 60),
      badge: str(fd, "badge", 40),
      is_signature: bool(fd, "is_signature"),
      is_available: bool(fd, "is_available"),
      sort_order: int(fd, "sort_order", 100),
    });
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes("23505")) throw err;
  }
  revalidateMenu();
}

export async function toggleItem(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id", 80);
  if (!id) return;
  await toggleMenuItem(id, bool(fd, "is_available"));
  revalidateMenu();
}

export async function deleteItem(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id", 80);
  if (!id) return;
  await deleteMenuItem(id);
  revalidateMenu();
}
