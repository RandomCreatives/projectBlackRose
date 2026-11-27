import "server-only";

/**
 * Server-side Supabase access.
 *
 * The site never talks to Supabase from the browser: every read and write goes through
 * a route handler or a server component using the service-role key. The anon key is not
 * shipped to the client at all, so there is nothing for a visitor to abuse.
 */

const URL_ = process.env.SUPABASE_URL ?? "";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const supabaseConfigured = Boolean(URL_ && KEY);

export const localStoreAllowed =
  process.env.NODE_ENV !== "production" || process.env.ALLOW_FILE_STORE === "1";

export type StorageMode = "supabase" | "local" | "none";

export const storageMode: StorageMode = supabaseConfigured
  ? "supabase"
  : localStoreAllowed
    ? "local"
    : "none";

type Query = Record<string, string>;

function endpoint(table: string, query: Query = {}) {
  const qs = new URLSearchParams(query).toString();
  return `${URL_}/rest/v1/${table}${qs ? `?${qs}` : ""}`;
}

function headers(extra: Record<string, string> = {}) {
  return {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`supabase ${res.status}: ${detail.slice(0, 400)}`);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function select<T>(
  table: string,
  query: Query = {},
): Promise<T[]> {
  const res = await fetch(endpoint(table, query), {
    headers: headers(),
    cache: "no-store",
  });
  return (await handle<T[]>(res)) ?? [];
}

export async function insert<T>(
  table: string,
  row: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(endpoint(table, { select: "*" }), {
    method: "POST",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(row),
    cache: "no-store",
  });
  const rows = await handle<T[]>(res);
  return rows[0];
}

export async function update<T>(
  table: string,
  match: Query,
  patch: Record<string, unknown>,
): Promise<T[]> {
  const res = await fetch(endpoint(table, { ...match, select: "*" }), {
    method: "PATCH",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(patch),
    cache: "no-store",
  });
  return (await handle<T[]>(res)) ?? [];
}

export async function remove(table: string, match: Query): Promise<void> {
  const res = await fetch(endpoint(table, match), {
    method: "DELETE",
    headers: headers({ Prefer: "return=minimal" }),
    cache: "no-store",
  });
  await handle<unknown>(res);
}

/** RPC for the stored procedures (purge, etc.). */
export async function rpc<T>(
  fn: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(args),
    cache: "no-store",
  });
  return handle<T>(res);
}
