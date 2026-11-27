import { insert, remove, select, storageMode, update } from "./supabase";
import {
  localCreateCategory,
  localCreateItem,
  localDeleteCategory,
  localDeleteItem,
  localReadMenuData,
  localUpdateCategory,
  localUpdateItem,
} from "./local-store";

export type MenuCategory = {
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

export type MenuItem = {
  id: string;
  category_id: string | null;
  name: string;
  description: string;
  /** integer minor units; null means "ask at the bar" */
  price_cents: number | null;
  /** optional second column (e.g. Bottle price for spirits, Half portion for kitchen) */
  secondary_price_cents: number | null;
  price_note: string;
  currency: string;
  badge: string;
  is_signature: boolean;
  is_available: boolean;
  sort_order: number;
};

export type MenuCategoryWithItems = MenuCategory & { items: MenuItem[] };

export type Menu = {
  categories: MenuCategoryWithItems[];
  source: "supabase" | "local" | "fallback";
};

export type AdminMenu = {
  categories: MenuCategoryWithItems[];
  uncategorised: MenuItem[];
};

/** Shown if no database is reachable — the page still renders and still tells the truth. */
const FALLBACK: Menu = {
  source: "fallback",
  categories: [
    {
      id: "house",
      name: "Cocktails",
      kicker: "House & classic serves",
      note: "Made the same way every night.",
      price_label: "Serve",
      secondary_price_label: "",
      image_url: "/img/figure.jpg",
      sort_order: 10,
      is_active: true,
      items: [
        {
          id: "black-rose",
          category_id: "house",
          name: "Black Rose",
          description:
            "Ordered by name, made the same way every night for twenty years. Dark, floral, dry.",
          price_cents: 44500,
          secondary_price_cents: null,
          price_note: "",
          currency: "ETB",
          badge: "Signature",
          is_signature: true,
          is_available: true,
          sort_order: 10,
        },
      ],
    },
  ],
};

function normalizeCategory(c: Partial<MenuCategory> & { id: string; name: string }): MenuCategory {
  return {
    id: c.id,
    name: c.name,
    kicker: c.kicker ?? "",
    note: c.note ?? "",
    price_label: c.price_label ?? "",
    secondary_price_label: c.secondary_price_label ?? "",
    image_url: c.image_url ?? "",
    sort_order: c.sort_order ?? 100,
    is_active: c.is_active ?? true,
  };
}

function normalizeItem(i: Partial<MenuItem> & { id: string; name: string }): MenuItem {
  return {
    id: i.id,
    category_id: i.category_id ?? null,
    name: i.name,
    description: i.description ?? "",
    price_cents: i.price_cents ?? null,
    secondary_price_cents: i.secondary_price_cents ?? null,
    price_note: i.price_note ?? "",
    currency: i.currency ?? "ETB",
    badge: i.badge ?? "",
    is_signature: Boolean(i.is_signature),
    is_available: i.is_available ?? true,
    sort_order: i.sort_order ?? 100,
  };
}

function groupAdminMenu(
  categories: MenuCategory[],
  items: MenuItem[],
): AdminMenu {
  const catIds = new Set(categories.map((c) => c.id));
  return {
    categories: categories.map((c) => ({
      ...c,
      items: items.filter((i) => i.category_id === c.id),
    })),
    uncategorised: items.filter(
      (i) => !i.category_id || !catIds.has(i.category_id),
    ),
  };
}

/** Public menu: only live categories and available items, in the owners' order. */
export async function getMenu(): Promise<Menu> {
  if (storageMode === "supabase") {
    try {
      const [rawCategories, rawItems] = await Promise.all([
        select<MenuCategory>("menu_categories", {
          select: "*",
          is_active: "eq.true",
          order: "sort_order.asc,name.asc",
        }),
        select<MenuItem>("menu_items", {
          select: "*",
          is_available: "eq.true",
          order: "sort_order.asc,name.asc",
        }),
      ]);
      const categories = rawCategories.map(normalizeCategory);
      const items = rawItems.map(normalizeItem);
      if (!categories.length) return FALLBACK;
      return {
        source: "supabase",
        categories: categories.map((c) => ({
          ...c,
          items: items.filter((i) => i.category_id === c.id),
        })),
      };
    } catch (err) {
      console.error("menu.read.failed", err);
      return FALLBACK;
    }
  }

  if (storageMode === "local") {
    try {
      const { categories, items } = await localReadMenuData();
      const liveCategories = categories.filter((c) => c.is_active);
      const liveItems = items.filter((i) => i.is_available);
      if (!liveCategories.length) return FALLBACK;
      return {
        source: "local",
        categories: liveCategories.map((c) => ({
          ...c,
          items: liveItems.filter((i) => i.category_id === c.id),
        })),
      };
    } catch (err) {
      console.error("menu.local.read.failed", err);
      return FALLBACK;
    }
  }

  return FALLBACK;
}

/** Admin menu: everything, including hidden rows and uncategorised items. */
export async function getMenuAdmin(): Promise<AdminMenu> {
  if (storageMode === "supabase") {
    const [rawCategories, rawItems] = await Promise.all([
      select<MenuCategory>("menu_categories", {
        select: "*",
        order: "sort_order.asc,name.asc",
      }),
      select<MenuItem>("menu_items", {
        select: "*",
        order: "sort_order.asc,name.asc",
      }),
    ]);
    return groupAdminMenu(
      rawCategories.map(normalizeCategory),
      rawItems.map(normalizeItem),
    );
  }

  if (storageMode === "local") {
    const { categories, items } = await localReadMenuData();
    return groupAdminMenu(categories, items);
  }

  return { categories: [], uncategorised: [] };
}

export async function createMenuCategory(
  input: Omit<MenuCategory, "id">,
): Promise<void> {
  if (storageMode === "supabase") {
    await insert("menu_categories", input);
    return;
  }
  if (storageMode === "local") {
    await localCreateCategory(input);
    return;
  }
  throw new Error("No menu backend configured");
}

export async function updateMenuCategory(
  id: string,
  patch: Omit<MenuCategory, "id">,
): Promise<void> {
  if (storageMode === "supabase") {
    await update("menu_categories", { id: `eq.${id}` }, patch);
    return;
  }
  if (storageMode === "local") {
    await localUpdateCategory(id, patch);
    return;
  }
  throw new Error("No menu backend configured");
}

export async function deleteMenuCategory(id: string): Promise<void> {
  if (storageMode === "supabase") {
    await remove("menu_categories", { id: `eq.${id}` });
    return;
  }
  if (storageMode === "local") {
    await localDeleteCategory(id);
    return;
  }
  throw new Error("No menu backend configured");
}

export async function createMenuItem(
  input: Omit<MenuItem, "id" | "currency">,
): Promise<void> {
  if (storageMode === "supabase") {
    await insert("menu_items", input);
    return;
  }
  if (storageMode === "local") {
    await localCreateItem(input);
    return;
  }
  throw new Error("No menu backend configured");
}

export async function updateMenuItem(
  id: string,
  patch: Omit<MenuItem, "id" | "currency">,
): Promise<void> {
  if (storageMode === "supabase") {
    await update("menu_items", { id: `eq.${id}` }, patch);
    return;
  }
  if (storageMode === "local") {
    await localUpdateItem(id, patch);
    return;
  }
  throw new Error("No menu backend configured");
}

export async function toggleMenuItem(
  id: string,
  is_available: boolean,
): Promise<void> {
  if (storageMode === "supabase") {
    await update("menu_items", { id: `eq.${id}` }, { is_available });
    return;
  }
  if (storageMode === "local") {
    await localUpdateItem(id, { is_available });
    return;
  }
  throw new Error("No menu backend configured");
}

export async function deleteMenuItem(id: string): Promise<void> {
  if (storageMode === "supabase") {
    await remove("menu_items", { id: `eq.${id}` });
    return;
  }
  if (storageMode === "local") {
    await localDeleteItem(id);
    return;
  }
  throw new Error("No menu backend configured");
}

/** "44500" minor units + "ETB" → "ETB 445". Non-round amounts keep their decimals. */
export function formatPrice(
  cents: number | null | undefined,
  currency = "ETB",
): string | null {
  const num = formatPriceNumber(cents);
  return num === null ? null : `${currency} ${num}`;
}

/** "2767000" minor units → "27,670" (for compact tabular columns where currency is in the header). */
export function formatPriceNumber(
  cents: number | null | undefined,
): string | null {
  if (cents === null || cents === undefined) return null;
  const major = cents / 100;
  return Number.isInteger(major)
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(major)
    : new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(major);
}

/** Parse what a person types ("445", "445.50", "ETB 445") into minor units. */
export function parsePrice(input: string): number | null {
  const cleaned = input.replace(/[^\d.,]/g, "").replace(/,/g, "");
  if (!cleaned) return null;
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}
