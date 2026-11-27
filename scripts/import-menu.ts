/**
 * Bulk-load the menu from a JSON file — for the day the owners hand over their list.
 *
 *   npx tsx scripts/import-menu.ts content/blackrose-menu.json            # add / update, leave the rest alone
 *   npx tsx scripts/import-menu.ts content/blackrose-menu.json --replace  # wipe the menu first
 *   npx tsx scripts/import-menu.ts content/blackrose-menu.json --dry-run  # show what would happen
 *   npx tsx scripts/import-menu.ts content/blackrose-menu.json --local    # write to .data/menu.json instead of Supabase
 *
 * Matching is by name, case-insensitive, within a category — so re-running the same file
 * updates prices instead of duplicating the menu.
 *
 * When SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are unset, imports automatically target
 * the local dev store (.data/menu.json).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  localCreateCategory,
  localCreateItem,
  localReadMenuData,
  localReplaceMenu,
  localUpdateCategory,
  localUpdateItem,
} from "../lib/local-store";

/* ---- env: read .env.local without pulling in a dependency ---- */
function loadEnv(file = ".env.local") {
  try {
    for (const line of readFileSync(path.join(process.cwd(), file), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* fine: the environment may already be set */
  }
}
loadEnv();

type JsonItem = {
  name: string;
  group_name?: string;
  description?: string;
  price?: number | string | null;
  secondary_price?: number | string | null;
  price2?: number | string | null;
  happy_hour_price?: number | string | null;
  price_happy?: number | string | null;
  price_note?: string;
  badge?: string;
  signature?: boolean;
  is_signature?: boolean;
  available?: boolean;
  sort_order?: number;
};
type JsonCategory = {
  name: string;
  kicker?: string;
  note?: string;
  price_label?: string;
  secondary_price_label?: string;
  image_url?: string;
  sort_order?: number;
  items?: JsonItem[];
};

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const replace = args.includes("--replace");
const dryRun = args.includes("--dry-run");
const forceLocal = args.includes("--local");

if (!file) {
  console.error(
    "Usage: npx tsx scripts/import-menu.ts <menu.json> [--replace] [--dry-run] [--local]",
  );
  process.exit(1);
}

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const useLocal = forceLocal || !URL_ || !KEY;

const cents = (p: JsonItem["price"]): number | null => {
  if (p === null || p === undefined || p === "") return null;
  const n = typeof p === "number" ? p : Number.parseFloat(String(p).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};

const formatDryPrice = (
  p1: number | null,
  p2: number | null,
  hh: number | null,
) => {
  const a = p1 === null ? "ask at bar" : `ETB ${p1 / 100}`;
  const b = p2 === null ? a : `${a} / ETB ${p2 / 100}`;
  return hh === null ? b : `${b} (HH ETB ${hh / 100})`;
};

async function importLocal(categories: JsonCategory[]) {
  console.log(
    `${dryRun ? "DRY RUN — " : ""}${categories.length} categories from ${file} → local store (.data/menu.json)`,
  );

  if (replace && !dryRun) {
    await localReplaceMenu({ categories: [], items: [] });
    console.log("cleared the existing local menu");
  }

  const current = await localReadMenuData();
  const catId = new Map(current.categories.map((c) => [c.name.toLowerCase(), c.id]));

  for (const c of categories) {
    let id = catId.get(c.name.toLowerCase());
    const row = {
      name: c.name,
      kicker: c.kicker ?? "",
      note: c.note ?? "",
      price_label: c.price_label ?? "",
      secondary_price_label: c.secondary_price_label ?? "",
      image_url: c.image_url ?? "",
      sort_order: c.sort_order ?? 100,
      is_active: true,
    };

    if (dryRun) {
      console.log(`  ${id ? "update" : "create"} category: ${c.name}`);
    } else if (id) {
      await localUpdateCategory(id, row);
    } else {
      const created = await localCreateCategory(row);
      id = created.id;
      catId.set(c.name.toLowerCase(), id);
    }

    for (const it of c.items ?? []) {
      const itemRow = {
        category_id: id ?? null,
        group_name: it.group_name ?? "",
        name: it.name,
        description: it.description ?? "",
        price_cents: cents(it.price),
        secondary_price_cents: cents(it.secondary_price ?? it.price2),
        happy_hour_price_cents: cents(it.happy_hour_price ?? it.price_happy),
        price_note: it.price_note ?? "",
        badge: it.badge ?? "",
        is_signature: Boolean(it.signature ?? it.is_signature),
        is_available: it.available ?? true,
        sort_order: it.sort_order ?? 100,
      };
      if (dryRun) {
        console.log(
          `      item: ${it.group_name ? `[${it.group_name}] ` : ""}${it.name} — ${formatDryPrice(itemRow.price_cents, itemRow.secondary_price_cents, itemRow.happy_hour_price_cents)}`,
        );
        continue;
      }
      const latest = await localReadMenuData();
      const found = latest.items.find(
        (x) =>
          x.category_id === id &&
          x.name.trim().toLowerCase() === it.name.trim().toLowerCase() &&
          x.group_name.trim().toLowerCase() === itemRow.group_name.trim().toLowerCase(),
      );
      if (found) {
        await localUpdateItem(found.id, itemRow);
      } else {
        await localCreateItem(itemRow);
      }
    }
  }
}

async function importSupabase(categories: JsonCategory[]) {
  const headers = {
    apikey: KEY!,
    Authorization: `Bearer ${KEY!}`,
    "Content-Type": "application/json",
  };

  async function call<T>(pathname: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${URL_}/rest/v1/${pathname}`, {
      ...init,
      headers: { ...headers, ...(init.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`${res.status} ${pathname}: ${(await res.text()).slice(0, 300)}`);
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  console.log(`${dryRun ? "DRY RUN — " : ""}${categories.length} categories from ${file} → Supabase`);

  if (replace && !dryRun) {
    // items first: categories are referenced by a foreign key
    await call("menu_items?id=not.is.null", { method: "DELETE" });
    await call("menu_categories?id=not.is.null", { method: "DELETE" });
    console.log("cleared the existing menu");
  }

  const existingCats = await call<Array<{ id: string; name: string }>>("menu_categories?select=id,name");
  const catId = new Map(existingCats.map((c) => [c.name.toLowerCase(), c.id]));

  for (const c of categories) {
    let id = catId.get(c.name.toLowerCase());
    const row = {
      name: c.name,
      kicker: c.kicker ?? "",
      note: c.note ?? "",
      price_label: c.price_label ?? "",
      secondary_price_label: c.secondary_price_label ?? "",
      image_url: c.image_url ?? "",
      sort_order: c.sort_order ?? 100,
      is_active: true,
    };
    if (dryRun) {
      console.log(`  ${id ? "update" : "create"} category: ${c.name}`);
    } else if (id) {
      await call(`menu_categories?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(row) });
    } else {
      const created = await call<Array<{ id: string }>>("menu_categories?select=id", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(row),
      });
      id = created[0].id;
      catId.set(c.name.toLowerCase(), id);
    }

    for (const it of c.items ?? []) {
      const itemRow = {
        category_id: id,
        group_name: it.group_name ?? "",
        name: it.name,
        description: it.description ?? "",
        price_cents: cents(it.price),
        secondary_price_cents: cents(it.secondary_price ?? it.price2),
        happy_hour_price_cents: cents(it.happy_hour_price ?? it.price_happy),
        price_note: it.price_note ?? "",
        badge: it.badge ?? "",
        is_signature: Boolean(it.signature ?? it.is_signature),
        is_available: it.available ?? true,
        sort_order: it.sort_order ?? 100,
      };
      if (dryRun) {
        console.log(
          `      item: ${it.group_name ? `[${it.group_name}] ` : ""}${it.name} — ${formatDryPrice(itemRow.price_cents, itemRow.secondary_price_cents, itemRow.happy_hour_price_cents)}`,
        );
        continue;
      }
      const found = await call<Array<{ id: string }>>(
        `menu_items?select=id&category_id=eq.${id}&name=ilike.${encodeURIComponent(it.name)}&group_name=ilike.${encodeURIComponent(itemRow.group_name)}`,
      );
      if (found.length) {
        await call(`menu_items?id=eq.${found[0].id}`, { method: "PATCH", body: JSON.stringify(itemRow) });
      } else {
        await call("menu_items", { method: "POST", body: JSON.stringify(itemRow) });
      }
    }
  }
}

async function main() {
  const payload = JSON.parse(readFileSync(file!, "utf8")) as { categories?: JsonCategory[] } | JsonCategory[];
  const categories = Array.isArray(payload) ? payload : (payload.categories ?? []);
  if (!categories.length) {
    console.error("No categories found in the file.");
    process.exit(1);
  }

  if (useLocal) {
    await importLocal(categories);
  } else {
    await importSupabase(categories);
  }

  console.log(dryRun ? "nothing written" : "done — reload the site and the admin menu");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
