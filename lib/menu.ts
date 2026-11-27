import { select, supabaseConfigured } from "./supabase";

export type MenuCategory = {
  id: string;
  name: string;
  kicker: string;
  note: string;
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
  price_note: string;
  currency: string;
  badge: string;
  is_signature: boolean;
  is_available: boolean;
  sort_order: number;
};

export type Menu = {
  categories: Array<MenuCategory & { items: MenuItem[] }>;
  source: "supabase" | "fallback";
};

/** Shown if Supabase is unreachable — the page still renders and still tells the truth. */
const FALLBACK: Menu = {
  source: "fallback",
  categories: [
    {
      id: "house",
      name: "House serves",
      kicker: "The house serve",
      note: "Made the same way every night.",
      sort_order: 10,
      is_active: true,
      items: [
        {
          id: "black-rose",
          category_id: "house",
          name: "Black Rose",
          description:
            "Ordered by name, made the same way every night for twenty years. Dark, floral, dry.",
          price_cents: null,
          price_note: "Ask at the bar",
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

/** Public menu: only live categories and available items, in the owners' order. */
export async function getMenu(): Promise<Menu> {
  if (!supabaseConfigured) return FALLBACK;
  try {
    const [categories, items] = await Promise.all([
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

/** Admin menu: everything, including hidden rows. Always sourced from Supabase. */
export async function getMenuAdmin(): Promise<Menu["categories"]> {
  const [categories, items] = await Promise.all([
    select<MenuCategory>("menu_categories", {
      select: "*",
      order: "sort_order.asc,name.asc",
    }),
    select<MenuItem>("menu_items", {
      select: "*",
      order: "sort_order.asc,name.asc",
    }),
  ]);
  return categories.map((c) => ({
    ...c,
    items: items.filter((i) => i.category_id === c.id),
  }));
}

/** "44500" minor units + "ETB" → "ETB 445". Non-round amounts keep their decimals. */
export function formatPrice(
  cents: number | null,
  currency = "ETB",
): string | null {
  if (cents === null || cents === undefined) return null;
  const major = cents / 100;
  const text = Number.isInteger(major)
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(major)
    : new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(major);
  return `${currency} ${text}`;
}

/** Parse what a person types ("445", "445.50", "ETB 445") into minor units. */
export function parsePrice(input: string): number | null {
  const cleaned = input.replace(/[^\d.,]/g, "").replace(/,/g, "");
  if (!cleaned) return null;
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}
