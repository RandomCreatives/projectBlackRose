/**
 * Bulk-load the menu from a JSON file — for the day the owners hand over their list.
 *
 *   npx tsx scripts/import-menu.ts menu.example.json            # add / update, leave the rest alone
 *   npx tsx scripts/import-menu.ts menu.example.json --replace  # wipe the menu first
 *   npx tsx scripts/import-menu.ts menu.example.json --dry-run  # show what would happen
 *
 * Matching is by name, case-insensitive, within a category — so re-running the same file
 * updates prices instead of duplicating the menu.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

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

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (see .env.example).");
  process.exit(1);
}

type JsonItem = {
  name: string;
  description?: string;
  price?: number | string | null;
  price_note?: string;
  badge?: string;
  signature?: boolean;
  available?: boolean;
  sort_order?: number;
};
type JsonCategory = {
  name: string;
  kicker?: string;
  note?: string;
  sort_order?: number;
  items?: JsonItem[];
};

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const replace = args.includes("--replace");
const dryRun = args.includes("--dry-run");
if (!file) {
  console.error("Usage: npx tsx scripts/import-menu.ts <menu.json> [--replace] [--dry-run]");
  process.exit(1);
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

async function call<T>(pathname: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${URL_}/rest/v1/${pathname}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`${res.status} ${pathname}: ${(await res.text()).slice(0, 300)}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const cents = (p: JsonItem["price"]): number | null => {
  if (p === null || p === undefined || p === "") return null;
  const n = typeof p === "number" ? p : Number.parseFloat(String(p).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};

async function main() {
  const payload = JSON.parse(readFileSync(file!, "utf8")) as { categories?: JsonCategory[] } | JsonCategory[];
  const categories = Array.isArray(payload) ? payload : (payload.categories ?? []);
  if (!categories.length) {
    console.error("No categories found in the file.");
    process.exit(1);
  }

  console.log(`${dryRun ? "DRY RUN — " : ""}${categories.length} categories from ${file}`);

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
        name: it.name,
        description: it.description ?? "",
        price_cents: cents(it.price),
        price_note: it.price_note ?? "",
        badge: it.badge ?? "",
        is_signature: it.signature ?? false,
        is_available: it.available ?? true,
        sort_order: it.sort_order ?? 100,
      };
      if (dryRun) {
        console.log(`      item: ${it.name} — ${itemRow.price_cents === null ? "ask at bar" : `ETB ${itemRow.price_cents / 100}`}`);
        continue;
      }
      const found = await call<Array<{ id: string }>>(
        `menu_items?select=id&category_id=eq.${id}&name=ilike.${encodeURIComponent(it.name)}`,
      );
      if (found.length) {
        await call(`menu_items?id=eq.${found[0].id}`, { method: "PATCH", body: JSON.stringify(itemRow) });
      } else {
        await call("menu_items", { method: "POST", body: JSON.stringify(itemRow) });
      }
    }
  }

  console.log(dryRun ? "nothing written" : "done — reload the site and the admin menu");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
