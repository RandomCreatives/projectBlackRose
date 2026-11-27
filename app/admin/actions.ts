"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  insert,
  remove,
  update,
  rpc,
  supabaseConfigured,
} from "@/lib/supabase";
import { isSignedIn } from "@/lib/auth";
import { parsePrice } from "@/lib/menu";

async function requireAdmin() {
  if (!(await isSignedIn())) redirect("/admin/login");
  if (!supabaseConfigured) throw new Error("Supabase is not configured");
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

const STATUSES = [
  "requested",
  "confirmed",
  "seated",
  "no_show",
  "cancelled",
] as const;

export async function setReservationStatus(fd: FormData) {
  await requireAdmin();
  const reference = str(fd, "reference", 20);
  const status = str(fd, "status", 20);
  if (!reference || !STATUSES.includes(status as (typeof STATUSES)[number]))
    return;
  await update(
    "reservations",
    { reference: `eq.${reference}` },
    {
      status,
      handled_at: new Date().toISOString(),
    },
  );
  revalidatePath("/admin/bookings");
}

export async function setReservationNotes(fd: FormData) {
  await requireAdmin();
  const reference = str(fd, "reference", 20);
  if (!reference) return;
  await update(
    "reservations",
    { reference: `eq.${reference}` },
    { notes: str(fd, "notes", 400) },
  );
  revalidatePath("/admin/bookings");
}

export async function deleteReservation(fd: FormData) {
  await requireAdmin();
  const reference = str(fd, "reference", 20);
  if (!reference) return;
  await remove("reservations", { reference: `eq.${reference}` });
  revalidatePath("/admin/bookings");
}

export async function purgeOld() {
  await requireAdmin();
  if (supabaseConfigured)
    await rpc<number>("purge_old_reservations", { keep_days: 45 });
  revalidatePath("/admin/bookings");
}

/* ---------------------------------------------------------------- menu */

export async function createCategory(fd: FormData) {
  await requireAdmin();
  const name = str(fd, "name", 60);
  if (name.length < 2) return;
  await insert("menu_categories", {
    name,
    kicker: str(fd, "kicker", 60),
    note: str(fd, "note", 200),
    sort_order: int(fd, "sort_order", 100),
    is_active: true,
  });
  revalidatePath("/admin/menu");
  revalidatePath("/");
}

export async function updateCategory(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id", 40);
  if (!id) return;
  await update(
    "menu_categories",
    { id: `eq.${id}` },
    {
      name: str(fd, "name", 60),
      kicker: str(fd, "kicker", 60),
      note: str(fd, "note", 200),
      sort_order: int(fd, "sort_order", 100),
      is_active: bool(fd, "is_active"),
    },
  );
  revalidatePath("/admin/menu");
  revalidatePath("/");
}

export async function deleteCategory(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id", 40);
  if (!id) return;
  await remove("menu_categories", { id: `eq.${id}` });
  revalidatePath("/admin/menu");
  revalidatePath("/");
}

export async function createItem(fd: FormData) {
  await requireAdmin();
  const name = str(fd, "name", 80);
  if (!name) return;
  try {
    await insert("menu_items", {
      category_id: str(fd, "category_id", 40) || null,
      name,
      description: str(fd, "description", 300),
      price_cents: parsePrice(str(fd, "price", 20)),
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
  revalidatePath("/admin/menu");
  revalidatePath("/");
}

export async function updateItem(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id", 40);
  if (!id) return;
  try {
    await update(
      "menu_items",
      { id: `eq.${id}` },
      {
        category_id: str(fd, "category_id", 40) || null,
        name: str(fd, "name", 80),
        description: str(fd, "description", 300),
        price_cents: parsePrice(str(fd, "price", 20)),
        price_note: str(fd, "price_note", 60),
        badge: str(fd, "badge", 40),
        is_signature: bool(fd, "is_signature"),
        is_available: bool(fd, "is_available"),
        sort_order: int(fd, "sort_order", 100),
      },
    );
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes("23505")) throw err;
  }
  revalidatePath("/admin/menu");
  revalidatePath("/");
}

export async function toggleItem(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id", 40);
  if (!id) return;
  await update(
    "menu_items",
    { id: `eq.${id}` },
    { is_available: bool(fd, "is_available") },
  );
  revalidatePath("/admin/menu");
  revalidatePath("/");
}

export async function deleteItem(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id", 40);
  if (!id) return;
  await remove("menu_items", { id: `eq.${id}` });
  revalidatePath("/admin/menu");
  revalidatePath("/");
}
