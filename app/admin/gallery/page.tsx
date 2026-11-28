import Link from "next/link";
import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/auth";
import { getGalleryForAdmin } from "@/lib/gallery";
import ConfirmButton from "../ConfirmButton";
import {
  addGalleryPhoto,
  addSocialLink,
  addSocialPost,
  removeGalleryPhoto,
  removeSocialLink,
  removeSocialPost,
  saveGalleryPhoto,
  saveSocialLink,
  saveSocialPost,
  toggleGalleryPhoto,
} from "./actions";

export const dynamic = "force-dynamic";

const GALLERY_PRESETS = [
  { label: "Room candlelight", path: "/img/room.jpg" },
  { label: "Corner banquette", path: "/img/gallery/banquette-corner.jpg" },
  { label: "Velvet & terracotta", path: "/img/gallery/velvet-tables.jpg" },
  { label: "Table for two", path: "/img/gallery/table-for-two.jpg" },
  { label: "Mosaic & Ge'ez", path: "/img/gallery/mosaic-geez.jpg" },
  { label: "Across the salon", path: "/img/gallery/main-lounge.jpg" },
  { label: "Friday Happy Hour plate", path: "/img/menu/chapter-happyhour.jpg" },
  { label: "Cocktails plate", path: "/img/menu/chapter-cocktails.jpg" },
];

export default async function AdminGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; err?: string }>;
}) {
  if (!(await isSignedIn())) redirect("/admin/login");
  const [{ photos, socials, posts }, sp] = await Promise.all([
    getGalleryForAdmin(),
    searchParams,
  ]);

  const visiblePhotos = photos.filter((p) => p.is_visible).length;
  const visibleSocials = socials.filter((s) => s.is_visible).length;
  const visiblePosts = posts.filter((p) => p.is_visible).length;

  return (
    <div className="admin-wrap">
      <div className="admin-row">
        <div>
          <h1>Gallery &amp; Socials</h1>
          <p className="admin-muted">
            {visiblePhotos} of {photos.length} photos live · {visibleSocials} social links ·{" "}
            {visiblePosts} featured highlights. Everything here powers the public{" "}
            <code>/gallery</code> tab and the homepage preview strip.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="admin-btn solid" href="/gallery">
            View public gallery →
          </Link>
        </div>
      </div>

      {sp.saved ? (
        <div className="admin-notice ok" role="status">
          Saved {sp.saved === "photo" ? "gallery photograph" : sp.saved === "social" ? "social link" : "social highlight"}.
        </div>
      ) : null}

      {sp.err ? (
        <div className="admin-notice err" role="alert">
          Could not save:{" "}
          {sp.err === "title"
            ? "Please enter a title."
            : sp.err === "image"
              ? "Please upload an image file or provide an image path/URL."
              : sp.err === "social"
                ? "Please provide a valid label and https:// URL."
                : sp.err === "caption"
                  ? "Please enter a caption."
                  : sp.err}
        </div>
      ) : null}

      {/* ==================== 1. GALLERY PHOTOGRAPHS ==================== */}
      <section className="admin-card" style={{ marginBottom: 24 }}>
        <div className="admin-row" style={{ marginBottom: 14 }}>
          <div>
            <h2>Venue Photographs</h2>
            <p className="admin-muted" style={{ marginBottom: 0 }}>
              Upload a JPEG/PNG/WebP directly (up to 8 MB) or paste an existing path like{" "}
              <code>/img/gallery/banquette-corner.jpg</code>.
            </p>
          </div>
        </div>

        <form action={addGalleryPhoto} className="admin-add-box">
          <div className="admin-eyebrow">Add photograph</div>
          <div className="admin-grid">
            <label className="admin-field">
              <span>Caption / title *</span>
              <input name="title" required maxLength={120} placeholder="e.g. Candlelit bar at nine" />
            </label>
            <label className="admin-field">
              <span>Tag</span>
              <input name="tag" maxLength={48} placeholder="e.g. Candlelight, Main room, Suite 201" />
            </label>
            <label className="admin-field">
              <span>Layout size</span>
              <select name="span" defaultValue="wide">
                <option value="wide">Wide (4:3 landscape)</option>
                <option value="tall">Tall (3:4 portrait)</option>
                <option value="square">Square (1:1)</option>
              </select>
            </label>
            <label className="admin-field">
              <span>Sort order</span>
              <input name="sort_order" type="number" defaultValue={(photos.length + 1) * 10} />
            </label>
            <label className="admin-field">
              <span>Upload image file</span>
              <input name="image_file" type="file" accept="image/jpeg,image/png,image/webp" />
            </label>
            <label className="admin-field">
              <span>Or image URL / path</span>
              <input
                name="image_url"
                list="gallery-image-presets"
                maxLength={500}
                placeholder="/img/gallery/banquette-corner.jpg or https://…"
              />
            </label>
          </div>
          <label className="admin-field" style={{ marginTop: 10 }}>
            <span>Accessible description (alt text)</span>
            <input name="alt" maxLength={240} placeholder="Short description of what is in the photo" />
          </label>
          <div style={{ marginTop: 12 }}>
            <button type="submit" className="admin-btn solid">
              + Add photo to gallery
            </button>
          </div>
        </form>

        <datalist id="gallery-image-presets">
          {GALLERY_PRESETS.map((p) => (
            <option key={p.path} value={p.path}>
              {p.label}
            </option>
          ))}
        </datalist>

        <div className="admin-gal-list">
          {photos.map((photo) => (
            <div key={photo.id} className={`admin-gal-item${photo.is_visible ? "" : " is-off"}`}>
              <div className="admin-gal-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.image_url} alt={photo.alt || photo.title} />
              </div>

              <div className="admin-gal-body">
                <form action={saveGalleryPhoto}>
                  <input type="hidden" name="id" value={photo.id} />
                  <div className="admin-grid">
                    <label className="admin-field">
                      <span>Caption / title</span>
                      <input name="title" defaultValue={photo.title} required maxLength={120} />
                    </label>
                    <label className="admin-field">
                      <span>Tag</span>
                      <input name="tag" defaultValue={photo.tag} maxLength={48} />
                    </label>
                    <label className="admin-field">
                      <span>Layout size</span>
                      <select name="span" defaultValue={photo.span}>
                        <option value="wide">Wide (4:3)</option>
                        <option value="tall">Tall (3:4)</option>
                        <option value="square">Square (1:1)</option>
                      </select>
                    </label>
                    <label className="admin-field">
                      <span>Order</span>
                      <input name="sort_order" type="number" defaultValue={photo.sort_order} />
                    </label>
                    <label className="admin-field">
                      <span>Image path / URL</span>
                      <input name="image_url" defaultValue={photo.image_url} list="gallery-image-presets" maxLength={500} />
                    </label>
                    <label className="admin-field">
                      <span>Replace with upload</span>
                      <input name="image_file" type="file" accept="image/jpeg,image/png,image/webp" />
                    </label>
                  </div>
                  <label className="admin-field" style={{ marginTop: 8 }}>
                    <span>Alt text</span>
                    <input name="alt" defaultValue={photo.alt} maxLength={240} />
                  </label>
                  <div className="admin-gal-foot">
                    <label className="admin-check">
                      <input type="checkbox" name="is_visible" defaultChecked={photo.is_visible} />
                      <span>Show on site</span>
                    </label>
                    <button type="submit" className="admin-btn solid">
                      Save changes
                    </button>
                  </div>
                </form>

                <div className="admin-gal-quick">
                  <form action={toggleGalleryPhoto}>
                    <input type="hidden" name="id" value={photo.id} />
                    <input type="hidden" name="is_visible" value={photo.is_visible ? "false" : "true"} />
                    <button type="submit" className="admin-btn ghost">
                      {photo.is_visible ? "Hide" : "Show"}
                    </button>
                  </form>
                  <form action={removeGalleryPhoto}>
                    <input type="hidden" name="id" value={photo.id} />
                    <ConfirmButton
                      className="admin-btn danger"
                      message={`Remove "${photo.title}" from the gallery?`}
                    >
                      Delete
                    </ConfirmButton>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== 2. OFFICIAL SOCIAL PROFILES ==================== */}
      <section className="admin-card" style={{ marginBottom: 24 }}>
        <h2>Social Profiles</h2>
        <p className="admin-muted">
          These appear as interactive profile badges on <code>/gallery</code> and in the site footer.
        </p>

        <form action={addSocialLink} className="admin-add-box">
          <div className="admin-eyebrow">Add social channel</div>
          <div className="admin-grid">
            <label className="admin-field">
              <span>Platform</span>
              <select name="platform" defaultValue="instagram">
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="tiktok">TikTok</option>
                <option value="tripadvisor">Tripadvisor</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="admin-field">
              <span>Display label *</span>
              <input name="label" required maxLength={60} placeholder="e.g. Instagram" />
            </label>
            <label className="admin-field">
              <span>Handle / subtitle</span>
              <input name="handle" maxLength={80} placeholder="e.g. @blackroselounge.et" />
            </label>
            <label className="admin-field">
              <span>Profile URL *</span>
              <input name="url" type="url" required maxLength={500} placeholder="https://instagram.com/…" />
            </label>
            <label className="admin-field">
              <span>Order</span>
              <input name="sort_order" type="number" defaultValue={(socials.length + 1) * 10} />
            </label>
          </div>
          <div style={{ marginTop: 12 }}>
            <button type="submit" className="admin-btn solid">
              + Add social link
            </button>
          </div>
        </form>

        <div className="admin-social-list">
          {socials.map((s) => (
            <div key={s.id} className={`admin-social-row${s.is_visible ? "" : " is-off"}`}>
              <form action={saveSocialLink} style={{ flex: 1 }}>
                <input type="hidden" name="id" value={s.id} />
                <div className="admin-grid">
                  <label className="admin-field">
                    <span>Platform</span>
                    <select name="platform" defaultValue={s.platform}>
                      <option value="instagram">Instagram</option>
                      <option value="facebook">Facebook</option>
                      <option value="tiktok">TikTok</option>
                      <option value="tripadvisor">Tripadvisor</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="admin-field">
                    <span>Label</span>
                    <input name="label" defaultValue={s.label} required maxLength={60} />
                  </label>
                  <label className="admin-field">
                    <span>Handle</span>
                    <input name="handle" defaultValue={s.handle} maxLength={80} />
                  </label>
                  <label className="admin-field">
                    <span>URL</span>
                    <input name="url" type="url" defaultValue={s.url} required maxLength={500} />
                  </label>
                  <label className="admin-field">
                    <span>Order</span>
                    <input name="sort_order" type="number" defaultValue={s.sort_order} />
                  </label>
                </div>
                <div className="admin-gal-foot">
                  <label className="admin-check">
                    <input type="checkbox" name="is_visible" defaultChecked={s.is_visible} />
                    <span>Show on site</span>
                  </label>
                  <button type="submit" className="admin-btn solid">
                    Save
                  </button>
                </div>
              </form>
              <form action={removeSocialLink} style={{ alignSelf: "flex-end" }}>
                <input type="hidden" name="id" value={s.id} />
                <ConfirmButton
                  className="admin-btn danger"
                  message={`Delete social link "${s.label}"?`}
                >
                  Delete
                </ConfirmButton>
              </form>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== 3. FEATURED SOCIAL HIGHLIGHTS ==================== */}
      <section className="admin-card">
        <h2>Social Showcase Highlights</h2>
        <p className="admin-muted">
          Feature posts, DJ announcements, Happy Hour promos, or guest reviews right inside the{" "}
          <code>/gallery</code> page.
        </p>

        <form action={addSocialPost} className="admin-add-box">
          <div className="admin-eyebrow">Add social highlight</div>
          <div className="admin-grid">
            <label className="admin-field">
              <span>Platform</span>
              <select name="platform" defaultValue="instagram">
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="tiktok">TikTok</option>
                <option value="tripadvisor">Tripadvisor</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="admin-field">
              <span>Label / date tag</span>
              <input name="posted_label" maxLength={60} placeholder="e.g. This Friday · 10 pm" />
            </label>
            <label className="admin-field">
              <span>Link URL (or /menu, /week)</span>
              <input name="post_url" maxLength={500} placeholder="https://instagram.com/p/… or /week" />
            </label>
            <label className="admin-field">
              <span>Order</span>
              <input name="sort_order" type="number" defaultValue={(posts.length + 1) * 10} />
            </label>
            <label className="admin-field">
              <span>Upload cover image</span>
              <input name="image_file" type="file" accept="image/jpeg,image/png,image/webp" />
            </label>
            <label className="admin-field">
              <span>Or image path / URL</span>
              <input
                name="image_url"
                list="gallery-image-presets"
                maxLength={500}
                placeholder="/img/gallery/velvet-tables.jpg"
              />
            </label>
          </div>
          <label className="admin-field" style={{ marginTop: 10 }}>
            <span>Caption *</span>
            <textarea name="caption" required rows={2} maxLength={400} placeholder="Short caption for the social card…" />
          </label>
          <div style={{ marginTop: 12 }}>
            <button type="submit" className="admin-btn solid">
              + Add highlight card
            </button>
          </div>
        </form>

        <div className="admin-gal-list">
          {posts.map((post) => (
            <div key={post.id} className={`admin-gal-item${post.is_visible ? "" : " is-off"}`}>
              <div className="admin-gal-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.image_url} alt={post.caption} />
              </div>

              <div className="admin-gal-body">
                <form action={saveSocialPost}>
                  <input type="hidden" name="id" value={post.id} />
                  <div className="admin-grid">
                    <label className="admin-field">
                      <span>Platform</span>
                      <select name="platform" defaultValue={post.platform}>
                        <option value="instagram">Instagram</option>
                        <option value="facebook">Facebook</option>
                        <option value="tiktok">TikTok</option>
                        <option value="tripadvisor">Tripadvisor</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                    <label className="admin-field">
                      <span>Date / kicker label</span>
                      <input name="posted_label" defaultValue={post.posted_label} maxLength={60} />
                    </label>
                    <label className="admin-field">
                      <span>Link URL</span>
                      <input name="post_url" defaultValue={post.post_url} maxLength={500} />
                    </label>
                    <label className="admin-field">
                      <span>Order</span>
                      <input name="sort_order" type="number" defaultValue={post.sort_order} />
                    </label>
                    <label className="admin-field">
                      <span>Image path / URL</span>
                      <input name="image_url" defaultValue={post.image_url} list="gallery-image-presets" maxLength={500} />
                    </label>
                    <label className="admin-field">
                      <span>Replace with upload</span>
                      <input name="image_file" type="file" accept="image/jpeg,image/png,image/webp" />
                    </label>
                  </div>
                  <label className="admin-field" style={{ marginTop: 8 }}>
                    <span>Caption</span>
                    <textarea name="caption" defaultValue={post.caption} required rows={2} maxLength={400} />
                  </label>
                  <div className="admin-gal-foot">
                    <label className="admin-check">
                      <input type="checkbox" name="is_visible" defaultChecked={post.is_visible} />
                      <span>Show on site</span>
                    </label>
                    <button type="submit" className="admin-btn solid">
                      Save changes
                    </button>
                  </div>
                </form>

                <div className="admin-gal-quick">
                  <form action={removeSocialPost}>
                    <input type="hidden" name="id" value={post.id} />
                    <ConfirmButton
                      className="admin-btn danger"
                      message="Delete this social highlight card?"
                    >
                      Delete
                    </ConfirmButton>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
