import { requireSession } from "@/lib/auth";
import {
  getMenuAdmin,
  formatPrice,
  type MenuCategory,
  type MenuItem,
} from "@/lib/menu";
import { storageMode } from "@/lib/supabase";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createItem,
  updateItem,
  toggleItem,
  deleteItem,
} from "../actions";
import ConfirmButton from "../ConfirmButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Menu", robots: { index: false, follow: false } };

const priceText = (cents: number | null, currency: string) =>
  formatPrice(cents, currency) ?? "—";

const IMAGE_PRESETS = [
  { value: "", label: "Default chapter plate" },
  { value: "/img/menu/chapter-cocktails.jpg", label: "Plate — Cocktails" },
  { value: "/img/menu/chapter-wine.jpg", label: "Plate — Wine" },
  { value: "/img/menu/chapter-spirits.jpg", label: "Plate — Spirits" },
  { value: "/img/menu/chapter-whisky.jpg", label: "Plate — Whisky & Cognac" },
  { value: "/img/menu/chapter-food.jpg", label: "Plate — Kitchen / Food" },
  { value: "/img/menu/chapter-beer.jpg", label: "Plate — Beer & Soft Drinks" },
  { value: "/img/menu/chapter-happyhour.jpg", label: "Plate — Friday Happy Hour" },
  { value: "/img/menu/cover-pour.jpg", label: "Cover — Cocktail Pour" },
  { value: "/img/menu/cover-table.jpg", label: "Cover — Candlelit Table" },
  { value: "/img/room.jpg", label: "Venue — Lounge room" },
  { value: "/img/figure.jpg", label: "Mural — Figure" },
];

function MenuItemRow({
  item,
  catOptions,
  primaryLabel,
  secondaryLabel,
}: {
  item: MenuItem;
  catOptions: Array<{ id: string; name: string }>;
  primaryLabel: string;
  secondaryLabel: string;
}) {
  const hasSecondary = Boolean(secondaryLabel) || item.secondary_price_cents !== null;

  return (
    <div className={`item${item.is_available ? "" : " paused"}`}>
      <div>
        <p className="name">
          {item.name}{" "}
          {item.group_name ? <span className="chip">{item.group_name}</span> : null}
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
            <div>
              {hasSecondary && primaryLabel ? (
                <small className="price-lbl">{primaryLabel}: </small>
              ) : null}
              {priceText(item.price_cents, item.currency)}
            </div>
            {item.secondary_price_cents !== null ? (
              <div className="price-sub">
                {secondaryLabel ? (
                  <small className="price-lbl">{secondaryLabel}: </small>
                ) : null}
                {priceText(item.secondary_price_cents, item.currency)}
              </div>
            ) : null}
            {item.happy_hour_price_cents !== null ? (
              <div className="price-sub">
                <small className="price-lbl">Fri HH: </small>
                {priceText(item.happy_hour_price_cents, item.currency)}
              </div>
            ) : null}
            {item.price_note ? <span>{item.price_note}</span> : null}
          </>
        )}
      </div>

      <div>
        <details className="editor">
          <summary>Edit</summary>
          <form action={updateItem} className="admin-form" style={{ marginTop: 8 }}>
            <input type="hidden" name="id" value={item.id} />
            <div className="admin-grid2">
              <label className="admin-field">
                <span>Name</span>
                <input name="name" defaultValue={item.name} required maxLength={80} />
              </label>
              <label className="admin-field">
                <span>Sub-heading (group)</span>
                <input
                  name="group_name"
                  defaultValue={item.group_name}
                  maxLength={40}
                  placeholder="Vodka / Single malt / By the glass"
                />
              </label>
            </div>
            <label className="admin-field">
              <span>Description</span>
              <textarea name="description" defaultValue={item.description} maxLength={300} />
            </label>
            <div className="admin-grid3">
              <label className="admin-field">
                <span>{primaryLabel || "Price"} ({item.currency})</span>
                <input
                  name="price"
                  inputMode="decimal"
                  defaultValue={item.price_cents === null ? "" : item.price_cents / 100}
                  placeholder="445"
                />
              </label>
              <label className="admin-field">
                <span>{secondaryLabel || "Bottle / Half"} ({item.currency})</span>
                <input
                  name="secondary_price"
                  inputMode="decimal"
                  defaultValue={
                    item.secondary_price_cents === null
                      ? ""
                      : item.secondary_price_cents / 100
                  }
                  placeholder="optional"
                />
              </label>
              <label className="admin-field">
                <span>Fri Happy Hour ({item.currency})</span>
                <input
                  name="happy_hour_price"
                  inputMode="decimal"
                  defaultValue={
                    item.happy_hour_price_cents === null
                      ? ""
                      : item.happy_hour_price_cents / 100
                  }
                  placeholder="optional"
                />
              </label>
            </div>
            <div className="admin-grid3">
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
                <input name="badge" defaultValue={item.badge} maxLength={40} placeholder="Signature / Fasting" />
              </label>
              <label className="admin-field">
                <span>Price note</span>
                <input
                  name="price_note"
                  defaultValue={item.price_note}
                  maxLength={60}
                  placeholder="optional"
                />
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
            <ConfirmButton
              className="admin-btn danger sm"
              message={`Delete "${item.name}" from the menu?`}
            >
              Delete
            </ConfirmButton>
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
  );
}

function categoryPriceSummary(cat: MenuCategory) {
  if (cat.price_label && cat.secondary_price_label) {
    return `${cat.price_label} / ${cat.secondary_price_label}`;
  }
  return cat.price_label || "";
}

export default async function MenuPage() {
  await requireSession();

  let menuData: Awaited<ReturnType<typeof getMenuAdmin>> = {
    categories: [],
    uncategorised: [],
  };
  let failure: string | null = null;
  if (storageMode !== "none") {
    try {
      menuData = await getMenuAdmin();
    } catch (err) {
      failure = err instanceof Error ? err.message : "Could not read the menu.";
    }
  }

  const { categories, uncategorised } = menuData;
  const catOptions = categories.map((c) => ({ id: c.id, name: c.name }));
  const totalItems =
    categories.reduce((sum, c) => sum + c.items.length, 0) + uncategorised.length;

  return (
    <div className="admin-wrap">
      <div className="admin-row">
        <div>
          <h1>Menu</h1>
          <p className="admin-muted">
            {categories.length} chapters · {totalItems} items. Edits here update both the homepage menu book
            and the standalone table menu at <code>/menu</code>. Untick <b>Show on site</b> to hide an item
            without deleting it.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a className="admin-btn solid" href="/menu" target="_blank" rel="noopener">
            Open digital menu ↗
          </a>
          <a className="admin-btn" href="/#menu" target="_blank" rel="noopener">
            See on homepage ↗
          </a>
        </div>
      </div>

      {categories.length > 0 ? (
        <div className="admin-filters" aria-label="Jump to category">
          {categories.map((cat) => (
            <a key={cat.id} href={`#cat-${cat.id}`}>
              {cat.name} ({cat.items.length})
            </a>
          ))}
        </div>
      ) : null}

      {failure ? (
        <div className="admin-card" style={{ marginBottom: 18 }}>
          <p className="admin-error">Could not reach the store: {failure}</p>
        </div>
      ) : null}

      {categories.length === 0 && !failure ? (
        <div className="admin-card" style={{ marginBottom: 18 }}>
          <p className="admin-muted">No categories yet. Add one below — “Cocktails” is a good first.</p>
        </div>
      ) : null}

      {categories.map((cat) => {
        const priceSummary = categoryPriceSummary(cat);
        return (
          <section className="cat" key={cat.id} id={`cat-${cat.id}`}>
            <div className="cat-head">
              <div>
                <h3>
                  {cat.name} {cat.is_active ? null : <span className="chip hidden">Hidden</span>}
                </h3>
                <div className="meta">
                  {cat.kicker ? `${cat.kicker} · ` : ""}
                  {priceSummary ? `${priceSummary} · ` : ""}
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
                  <div className="admin-grid3">
                    <label className="admin-field">
                      <span>Price col 1 label</span>
                      <input
                        name="price_label"
                        defaultValue={cat.price_label}
                        maxLength={30}
                        placeholder="Shot / Full / Bottle"
                      />
                    </label>
                    <label className="admin-field">
                      <span>Price col 2 label</span>
                      <input
                        name="secondary_price_label"
                        defaultValue={cat.secondary_price_label}
                        maxLength={30}
                        placeholder="Bottle / Half (optional)"
                      />
                    </label>
                    <label className="admin-field">
                      <span>Chapter image</span>
                      <select name="image_url" defaultValue={cat.image_url}>
                        {IMAGE_PRESETS.map((p) => (
                          <option key={p.value || "default"} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                        {cat.image_url && !IMAGE_PRESETS.some((p) => p.value === cat.image_url) ? (
                          <option value={cat.image_url}>{cat.image_url}</option>
                        ) : null}
                      </select>
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
                  <ConfirmButton
                    className="admin-btn danger sm"
                    message={`Delete category "${cat.name}"? Items inside will move to Uncategorised.`}
                  >
                    Delete category
                  </ConfirmButton>
                  <p className="admin-hint">Items inside are kept and moved to Uncategorised.</p>
                </form>
              </details>
            </div>

            {cat.items.map((item) => (
              <MenuItemRow
                key={item.id}
                item={item}
                catOptions={catOptions}
                primaryLabel={cat.price_label}
                secondaryLabel={cat.secondary_price_label}
              />
            ))}

            <div className="item-form">
              <form action={createItem} style={{ display: "contents" }}>
                <input type="hidden" name="category_id" value={cat.id} />
                <label className="admin-field">
                  <span>New item</span>
                  <input name="name" required maxLength={80} placeholder="Name" />
                </label>
                <label className="admin-field">
                  <span>Sub-heading</span>
                  <input name="group_name" maxLength={40} placeholder="Optional group" />
                </label>
                <label className="admin-field">
                  <span>Description</span>
                  <input name="description" maxLength={300} placeholder="Optional" />
                </label>
                <label className="admin-field">
                  <span>{cat.price_label || "Price"}</span>
                  <input name="price" inputMode="decimal" placeholder="445" />
                </label>
                {cat.secondary_price_label ? (
                  <label className="admin-field">
                    <span>{cat.secondary_price_label}</span>
                    <input name="secondary_price" inputMode="decimal" placeholder="optional" />
                  </label>
                ) : null}
                <label className="admin-field">
                  <span>Fri HH</span>
                  <input name="happy_hour_price" inputMode="decimal" placeholder="optional" />
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
        );
      })}

      {uncategorised.length > 0 ? (
        <section className="cat">
          <div className="cat-head">
            <div>
              <h3>
                Uncategorised <span className="chip hidden">Not shown on site</span>
              </h3>
              <div className="meta">
                {uncategorised.length} item{uncategorised.length === 1 ? "" : "s"} — edit an item to assign it
                to a category
              </div>
            </div>
          </div>
          {uncategorised.map((item) => (
            <MenuItemRow
              key={item.id}
              item={item}
              catOptions={catOptions}
              primaryLabel=""
              secondaryLabel=""
            />
          ))}
        </section>
      ) : null}

      <section className="admin-card" style={{ marginTop: 24 }}>
        <h2>Add a category</h2>
        <form action={createCategory} className="admin-form" style={{ maxWidth: 640 }}>
          <div className="admin-grid2">
            <label className="admin-field">
              <span>Name</span>
              <input name="name" required maxLength={60} placeholder="Cocktails" />
            </label>
            <label className="admin-field">
              <span>Kicker</span>
              <input name="kicker" maxLength={60} placeholder="House & classic serves" />
            </label>
          </div>
          <div className="admin-grid3">
            <label className="admin-field">
              <span>Price col 1 label</span>
              <input name="price_label" maxLength={30} placeholder="Shot / Full / Bottle" />
            </label>
            <label className="admin-field">
              <span>Price col 2 label</span>
              <input name="secondary_price_label" maxLength={30} placeholder="Bottle / Half (optional)" />
            </label>
            <label className="admin-field">
              <span>Chapter image</span>
              <select name="image_url" defaultValue="">
                {IMAGE_PRESETS.map((p) => (
                  <option key={p.value || "default"} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
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
