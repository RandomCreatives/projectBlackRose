import { requireSession } from "@/lib/auth";
import { getMenuAdmin, formatPrice } from "@/lib/menu";
import { supabaseConfigured } from "@/lib/supabase";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createItem,
  updateItem,
  toggleItem,
  deleteItem,
} from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Menu", robots: { index: false, follow: false } };

const priceText = (cents: number | null, currency: string) => formatPrice(cents, currency) ?? "—";

export default async function MenuPage() {
  await requireSession();

  let categories: Awaited<ReturnType<typeof getMenuAdmin>> = [];
  let failure: string | null = null;
  if (supabaseConfigured) {
    try {
      categories = await getMenuAdmin();
    } catch (err) {
      failure = err instanceof Error ? err.message : "Could not read the menu.";
    }
  }

  const catOptions = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="admin-wrap">
      <div className="admin-row">
        <div>
          <h1>Menu</h1>
          <p className="admin-muted">
            What is here is what the site shows, in this order. Untick <b>Show on site</b> to hide an item
            without deleting it — for a serve you have run out of, that is the one to use.
          </p>
        </div>
        <a className="admin-btn" href="/#menu" target="_blank" rel="noopener">
          See it on the site ↗
        </a>
      </div>

      {failure ? (
        <div className="admin-card" style={{ marginBottom: 18 }}>
          <p className="admin-error">Could not reach the database: {failure}</p>
        </div>
      ) : null}

      {categories.length === 0 && !failure ? (
        <div className="admin-card" style={{ marginBottom: 18 }}>
          <p className="admin-muted">No categories yet. Add one below — “Cocktails” is a good first.</p>
        </div>
      ) : null}

      {categories.map((cat) => (
        <section className="cat" key={cat.id}>
          <div className="cat-head">
            <div>
              <h3>
                {cat.name} {cat.is_active ? null : <span className="chip hidden">Hidden</span>}
              </h3>
              <div className="meta">
                {cat.kicker ? `${cat.kicker} · ` : ""}
                {cat.items.length} item{cat.items.length === 1 ? "" : "s"} · order {cat.sort_order}
              </div>
            </div>

            <details className="editor">
              <summary>Edit category</summary>
              <form action={updateCategory} className="admin-form" style={{ marginTop: 10 }}>
                <input type="hidden" name="id" value={cat.id} />
                <div className="admin-grid3">
                  <label className="admin-field">
                    <span>Name</span>
                    <input name="name" defaultValue={cat.name} required maxLength={60} />
                  </label>
                  <label className="admin-field">
                    <span>Kicker</span>
                    <input name="kicker" defaultValue={cat.kicker} maxLength={60} />
                  </label>
                  <label className="admin-field">
                    <span>Order</span>
                    <input name="sort_order" type="number" defaultValue={cat.sort_order} step={10} />
                  </label>
                </div>
                <label className="admin-field">
                  <span>Note under the heading</span>
                  <input name="note" defaultValue={cat.note} maxLength={200} />
                </label>
                <label className="admin-check">
                  <input type="checkbox" name="is_active" defaultChecked={cat.is_active} /> Show on site
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="admin-btn solid sm" type="submit">
                    Save category
                  </button>
                </div>
              </form>
              <form action={deleteCategory} style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={cat.id} />
                <button className="admin-btn danger sm" type="submit">
                  Delete category
                </button>
                <p className="admin-hint">Items inside are kept but become uncategorised.</p>
              </form>
            </details>
          </div>

          {cat.items.map((item) => (
            <div className={`item${item.is_available ? "" : " paused"}`} key={item.id}>
              <div>
                <p className="name">
                  {item.name}{" "}
                  {item.badge ? <span className="chip">{item.badge}</span> : null}
                  {item.is_signature && item.badge.toLowerCase() !== "signature" ? (
                    <span className="chip requested">Signature</span>
                  ) : null}
                  {item.is_available ? null : <span className="chip hidden">Hidden</span>}
                </p>
                {item.description ? <p className="desc">{item.description}</p> : null}
              </div>

              <div className="price">
                {item.price_cents === null ? (
                  <>
                    Ask at bar<span>{item.price_note}</span>
                  </>
                ) : (
                  <>
                    {priceText(item.price_cents, item.currency)}
                    <span>{item.price_note}</span>
                  </>
                )}
              </div>

              <div>
                <details className="editor">
                  <summary>Edit</summary>
                    <form action={updateItem} className="admin-form" style={{ marginTop: 8 }}>
                      <input type="hidden" name="id" value={item.id} />
                      <label className="admin-field">
                        <span>Name</span>
                        <input name="name" defaultValue={item.name} required maxLength={80} />
                      </label>
                      <label className="admin-field">
                        <span>Description</span>
                        <textarea name="description" defaultValue={item.description} maxLength={300} />
                      </label>
                      <div className="admin-grid2">
                        <label className="admin-field">
                          <span>Price ({item.currency})</span>
                          <input
                            name="price"
                            inputMode="decimal"
                            defaultValue={item.price_cents === null ? "" : item.price_cents / 100}
                            placeholder="445"
                          />
                        </label>
                        <label className="admin-field">
                          <span>Price note</span>
                          <input name="price_note" defaultValue={item.price_note} maxLength={60} placeholder="Ask at the bar" />
                        </label>
                      </div>
                      <div className="admin-grid2">
                        <label className="admin-field">
                          <span>Category</span>
                          <select name="category_id" defaultValue={item.category_id ?? ""}>
                            <option value="">— uncategorised —</option>
                            {catOptions.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="admin-field">
                          <span>Badge</span>
                          <input name="badge" defaultValue={item.badge} maxLength={40} placeholder="New" />
                        </label>
                      </div>
                      <div className="admin-grid2">
                        <label className="admin-field">
                          <span>Order</span>
                          <input name="sort_order" type="number" defaultValue={item.sort_order} step={10} />
                        </label>
                        <div style={{ display: "grid", gap: 6 }}>
                          <label className="admin-check">
                            <input type="checkbox" name="is_signature" defaultChecked={item.is_signature} /> Signature
                          </label>
                          <label className="admin-check">
                            <input type="checkbox" name="is_available" defaultChecked={item.is_available} /> Show on site
                          </label>
                        </div>
                      </div>
                      <button className="admin-btn solid sm" type="submit">
                        Save item
                      </button>
                    </form>
                  <form action={deleteItem} style={{ marginTop: 6 }}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="admin-btn danger sm" type="submit">
                      Delete
                    </button>
                  </form>
                </details>
              </div>

              <div className="acts">
                <form action={toggleItem}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="is_available" value={item.is_available ? "false" : "true"} />
                  <button className="admin-btn sm" type="submit">
                    {item.is_available ? "Hide" : "Show"}
                  </button>
                </form>
              </div>
            </div>
          ))}

          <div className="item-form">
            <form action={createItem} style={{ display: "contents" }}>
              <input type="hidden" name="category_id" value={cat.id} />
              <label className="admin-field">
                <span>New item</span>
                <input name="name" required maxLength={80} placeholder="Name" />
              </label>
              <label className="admin-field">
                <span>Description</span>
                <input name="description" maxLength={300} placeholder="Optional" />
              </label>
              <label className="admin-field">
                <span>Price</span>
                <input name="price" inputMode="decimal" placeholder="445" />
              </label>
              <label className="admin-field">
                <span>Price note</span>
                <input name="price_note" maxLength={60} placeholder="optional" />
              </label>
              <label className="admin-field">
                <span>Badge</span>
                <input name="badge" maxLength={40} placeholder="optional" />
              </label>
              <label className="admin-field">
                <span>Order</span>
                <input name="sort_order" type="number" defaultValue={100} step={10} />
              </label>
              <button className="admin-btn solid" type="submit">
                Add item
              </button>
            </form>
          </div>
        </section>
      ))}

      <section className="admin-card" style={{ marginTop: 24 }}>
        <h2>Add a category</h2>
        <form action={createCategory} className="admin-form" style={{ maxWidth: 560 }}>
          <div className="admin-grid2">
            <label className="admin-field">
              <span>Name</span>
              <input name="name" required maxLength={60} placeholder="Cocktails" />
            </label>
            <label className="admin-field">
              <span>Kicker</span>
              <input name="kicker" maxLength={60} placeholder="The house serve" />
            </label>
          </div>
          <label className="admin-field">
            <span>Note under the heading</span>
            <input name="note" maxLength={200} placeholder="Optional line under the category name" />
          </label>
          <label className="admin-field">
            <span>Order</span>
            <input name="sort_order" type="number" defaultValue={100} step={10} />
          </label>
          <button className="admin-btn solid sm" type="submit" style={{ justifySelf: "start" }}>
            Add category
          </button>
        </form>
      </section>
    </div>
  );
}
