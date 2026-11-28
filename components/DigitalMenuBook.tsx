"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { PageFlip, Orientation } from "page-flip";
import Mark from "./Mark";
import { MenuPhotoViewer, type MenuViewerPhoto } from "./MenuPhotoViewer";
import { venue } from "@/content/site";
import type { MenuCategoryWithItems, MenuItem } from "@/lib/menu";
import "./digital-menu.css";

function formatPriceNumber(cents: number | null | undefined): string | null {
  if (cents === null || cents === undefined) return null;
  const major = cents / 100;
  return Number.isInteger(major)
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(major)
    : new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(major);
}

/* ------------------------------------------------------------------ */
/* Helpers & Book Pagination                                          */
/* ------------------------------------------------------------------ */

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const roman = (i: number) => ROMAN[i] ?? String(i + 1);

const DEFAULT_PLATES: Record<string, string> = {
  cocktails: "/img/menu/chapter-cocktails.jpg",
  wine: "/img/menu/chapter-wine.jpg",
  spirits: "/img/menu/chapter-spirits.jpg",
  whisky: "/img/menu/chapter-whisky.jpg",
  food: "/img/menu/chapter-food.jpg",
  beer: "/img/menu/chapter-beer.jpg",
  "happy hour": "/img/menu/chapter-happyhour.jpg",
};

function plateFor(category: MenuCategoryWithItems): string {
  if (category.image_url?.trim()) return category.image_url.trim();
  const key = category.name.toLowerCase();
  for (const [needle, path] of Object.entries(DEFAULT_PLATES)) {
    if (key.includes(needle)) return path;
  }
  return "/img/room.jpg";
}

type ItemRowEntry =
  | { kind: "group"; label: string }
  | { kind: "item"; item: MenuItem };

type BookPage =
  | {
      kind: "cover";
      id: string;
      sectionLabel: string;
      railKey: string;
    }
  | {
      kind: "chapter-plate";
      id: string;
      sectionLabel: string;
      railKey: string;
      numeral: string;
      category: MenuCategoryWithItems;
      photoSrc: string;
      photoIndex: number;
      showKey: boolean;
      hasHappyHour: boolean;
      hasSecondary: boolean;
    }
  | {
      kind: "chapter-list";
      id: string;
      sectionLabel: string;
      railKey: string;
      numeral: string;
      category: MenuCategoryWithItems;
      entries: ItemRowEntry[];
      partIndex: number;
      partCount: number;
      hasSecondary: boolean;
      hasHappyHour: boolean;
      itemIds: string[];
    }
  | {
      kind: "hh-plate";
      id: string;
      sectionLabel: string;
      railKey: string;
      photoIndex: number;
      totalHappyHourItems: number;
    }
  | {
      kind: "hh-list";
      id: string;
      sectionLabel: string;
      railKey: string;
      title: string;
      subtitle: string;
      groups: Array<{
        heading: string;
        items: Array<{
          id: string;
          name: string;
          regular: number | null;
          happy: number;
          isSignature: boolean;
        }>;
      }>;
      partIndex: number;
      partCount: number;
    }
  | {
      kind: "house-notes";
      id: string;
      sectionLabel: string;
      railKey: string;
    }
  | {
      kind: "back-cover";
      id: string;
      sectionLabel: string;
      railKey: string;
    };

interface RailChapter {
  key: string;
  numeral: string;
  label: string;
  pageIndex: number;
  count: number;
}

const MAX_UNITS_PER_PAGE = 15.8;

function rowWeight(entry: ItemRowEntry): number {
  if (entry.kind === "group") return 1.2;
  let w = entry.item.name.length > 36 ? 1.4 : 1.0;
  if (entry.item.description?.trim()) w += 0.65;
  return w;
}

function paginateCategoryItems(items: MenuItem[]): ItemRowEntry[][] {
  // Flatten into ordered group headers + items
  const flat: ItemRowEntry[] = [];
  let currentGroup = "";
  for (const item of items) {
    const g = (item.group_name ?? "").trim();
    if (g && g !== currentGroup) {
      flat.push({ kind: "group", label: g });
      currentGroup = g;
    } else if (!g) {
      currentGroup = "";
    }
    flat.push({ kind: "item", item });
  }

  if (flat.length === 0) return [[]];

  const totalUnits = flat.reduce((sum, e) => sum + rowWeight(e), 0);
  const targetPages = Math.max(1, Math.ceil(totalUnits / MAX_UNITS_PER_PAGE));
  const softTarget = totalUnits / targetPages;

  const pages: ItemRowEntry[][] = [];
  let bucket: ItemRowEntry[] = [];
  let units = 0;

  for (let i = 0; i < flat.length; i++) {
    const entry = flat[i];
    const w = rowWeight(entry);

    // Keep a group header attached to at least its first item
    const needed =
      entry.kind === "group" && flat[i + 1]
        ? w + rowWeight(flat[i + 1])
        : w;

    const remainingPages = targetPages - pages.length - 1;
    const hitHardCap = bucket.length > 0 && units + needed > MAX_UNITS_PER_PAGE;
    const hitBalancedBreak =
      remainingPages > 0 &&
      bucket.length > 0 &&
      units >= softTarget - 0.5 &&
      units + needed > softTarget + 0.55;

    if (hitHardCap || hitBalancedBreak) {
      pages.push(bucket);
      bucket = [];
      units = 0;
    }

    bucket.push(entry);
    units += w;
  }

  if (bucket.length > 0) pages.push(bucket);
  return pages;
}

function buildBook(categories: MenuCategoryWithItems[]) {
  const photos: MenuViewerPhoto[] = [];
  const registerPhoto = (src: string, title: string, subtitle: string) => {
    const idx = photos.length;
    photos.push({ src, title, subtitle });
    return idx;
  };

  const pages: BookPage[] = [
    {
      kind: "cover",
      id: "cover",
      sectionLabel: `${venue.name} — The Menu`,
      railKey: "cover",
    },
  ];

  const rail: RailChapter[] = [];
  const itemPageMap = new Map<string, number>();

  // Collect Friday Happy Hour items grouped by chapter
  const hhByChapter: Array<{
    heading: string;
    items: Array<{
      id: string;
      name: string;
      regular: number | null;
      happy: number;
      isSignature: boolean;
    }>;
  }> = [];

  categories.forEach((cat, idx) => {
    const numeral = roman(idx);
    const railKey = `cat-${cat.id}`;
    const photoSrc = plateFor(cat);
    const photoIndex = registerPhoto(
      photoSrc,
      cat.name,
      `Chapter ${numeral}${cat.kicker ? ` · ${cat.kicker}` : ""}`,
    );

    const hasSecondary =
      Boolean(cat.secondary_price_label?.trim()) ||
      cat.items.some((i) => i.secondary_price_cents != null);
    const hasHappyHour = cat.items.some((i) => i.happy_hour_price_cents != null);

    const chapterStartPage = pages.length;
    rail.push({
      key: railKey,
      numeral,
      label: cat.name,
      pageIndex: chapterStartPage,
      count: cat.items.length,
    });

    pages.push({
      kind: "chapter-plate",
      id: `plate-${cat.id}`,
      sectionLabel: `${numeral} · ${cat.name}`,
      railKey,
      numeral,
      category: cat,
      photoSrc,
      photoIndex,
      showKey: idx === 0,
      hasHappyHour,
      hasSecondary,
    });

    const itemPages = paginateCategoryItems(cat.items);
    itemPages.forEach((entries, pIdx) => {
      const pageIndex = pages.length;
      const itemIds: string[] = [];
      for (const e of entries) {
        if (e.kind === "item") {
          itemIds.push(e.item.id);
          if (!itemPageMap.has(e.item.id)) {
            itemPageMap.set(e.item.id, pageIndex);
          }
        }
      }
      pages.push({
        kind: "chapter-list",
        id: `list-${cat.id}-${pIdx}`,
        sectionLabel: `${numeral} · ${cat.name}`,
        railKey,
        numeral,
        category: cat,
        entries,
        partIndex: pIdx,
        partCount: itemPages.length,
        hasSecondary,
        hasHappyHour,
        itemIds,
      });
    });

    const hhItems = cat.items
      .filter((i) => i.happy_hour_price_cents != null)
      .map((i) => ({
        id: i.id,
        name: i.name,
        regular: i.price_cents,
        happy: i.happy_hour_price_cents as number,
        isSignature: i.is_signature,
      }));
    if (hhItems.length > 0) {
      hhByChapter.push({ heading: cat.name, items: hhItems });
    }
  });

  // Add Friday Happy Hour feature spread when happy-hour prices exist
  const totalHappyHourItems = hhByChapter.reduce(
    (sum, g) => sum + g.items.length,
    0,
  );
  let happyHourPageIndex: number | null = null;

  if (totalHappyHourItems > 0) {
    const hhPhotoIndex = registerPhoto(
      "/img/menu/chapter-happyhour.jpg",
      "Friday Happy Hour",
      "Every Friday · 5:00 pm – 7:30 pm",
    );
    happyHourPageIndex = pages.length;
    rail.push({
      key: "happy-hour",
      numeral: "✦",
      label: "Friday HH",
      pageIndex: happyHourPageIndex,
      count: totalHappyHourItems,
    });

    pages.push({
      kind: "hh-plate",
      id: "hh-plate",
      sectionLabel: "✦ · Friday Happy Hour",
      railKey: "happy-hour",
      photoIndex: hhPhotoIndex,
      totalHappyHourItems,
    });

    // Split Happy Hour groups cleanly across compact 2-column leaves (<= 24 items per leaf)
    const hhBuckets: Array<typeof hhByChapter> = [];
    let currentBucket: typeof hhByChapter = [];
    let currentCount = 0;

    for (const grp of hhByChapter) {
      if (currentBucket.length > 0 && currentCount + grp.items.length > 24) {
        hhBuckets.push(currentBucket);
        currentBucket = [];
        currentCount = 0;
      }
      currentBucket.push(grp);
      currentCount += grp.items.length;
    }
    if (currentBucket.length > 0) hhBuckets.push(currentBucket);

    hhBuckets.forEach((groups, idx) => {
      const headings = groups.map((g) => g.heading).join(" & ");
      pages.push({
        kind: "hh-list",
        id: `hh-list-${idx}`,
        sectionLabel: "✦ · Friday Happy Hour",
        railKey: "happy-hour",
        title: headings,
        subtitle: "Every Friday · 5:00 pm – 7:30 pm · ETB",
        groups,
        partIndex: idx,
        partCount: hhBuckets.length,
      });
    });
  }

  // Ensure total page count (including back cover) is ALWAYS EVEN so the
  // front and back hard covers sit solo on desktop two-page spreads.
  if (pages.length % 2 === 0) {
    pages.push({
      kind: "house-notes",
      id: "house-notes",
      sectionLabel: "House Notes · Salon & Cellar",
      railKey: "notes",
    });
  }

  pages.push({
    kind: "back-cover",
    id: "back-cover",
    sectionLabel: "Until last orders",
    railKey: "back",
  });

  return { pages, rail, photos, itemPageMap, happyHourPageIndex };
}

/* ------------------------------------------------------------------ */
/* Printed Book Page Renderer                                         */
/* ------------------------------------------------------------------ */

function PageFrame({
  children,
  runningHead,
  runningMeta,
  folio,
  variant = "paper",
}: {
  children: ReactNode;
  runningHead?: ReactNode;
  runningMeta?: ReactNode;
  folio?: string;
  variant?: "paper" | "cover";
}) {
  const isCover = variant === "cover";
  return (
    <div
      className={`bmk-page ${isCover ? "bmk-page--cover" : "bmk-page--paper"}`}
    >
      <div className="bmk-frame-outer" aria-hidden="true" />
      <div className="bmk-frame-inner" aria-hidden="true" />
      <div className="bmk-spine-shade" aria-hidden="true" />

      {runningHead ? (
        <header className="bmk-runhead">
          <span className="bmk-runhead-title">{runningHead}</span>
          <span className="bmk-runhead-rule" aria-hidden="true" />
          {runningMeta ? (
            <span className="bmk-runhead-meta">{runningMeta}</span>
          ) : null}
        </header>
      ) : null}

      <div className="bmk-body">{children}</div>

      {folio ? (
        <footer className="bmk-folio">
          <span className="bmk-folio-rule" aria-hidden="true" />
          <span>{folio}</span>
          <span className="bmk-folio-rule" aria-hidden="true" />
        </footer>
      ) : null}
    </div>
  );
}

function renderBookPage(
  page: BookPage,
  pageIndex: number,
  totalChapters: number,
  totalItems: number,
): ReactNode {
  const folio = String(pageIndex + 1).padStart(2, "0");

  if (page.kind === "cover") {
    return (
      <PageFrame variant="cover">
        <div className="bmk-cover-bg" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/menu/cover-table.jpg" alt="" />
          <div className="bmk-cover-veil" />
        </div>

        <div className="bmk-cover-center">
          <div className="bmk-cover-medallion" aria-hidden="true">
            <Mark className="bmk-cover-mark" />
          </div>

          <h2 className="bmk-foil-title">BLACK ROSE</h2>
          <p className="bmk-cover-kicker">Lounge · Addis Ababa</p>

          <div className="bmk-cover-est">
            <span />
            <b>EST. {venue.since}</b>
            <span />
          </div>

          <p className="bmk-cover-italic">The Menu</p>
          <p className="bmk-cover-stats">
            {totalChapters} Chapters · {totalItems} Serves · Friday Happy Hour
          </p>
        </div>

        <div className="bmk-cover-bottom">
          <button
            type="button"
            data-action="open-menu"
            className="bmk-cover-cta"
          >
            <span>Open the menu</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 12h15M13 6l6 6-6 6" />
            </svg>
          </button>

          <div className="bmk-cover-loc">
            <span>Suite 201 · Djibouti Street</span>
            <i aria-hidden="true" />
            <span>Every day from 5pm</span>
          </div>
        </div>
      </PageFrame>
    );
  }

  if (page.kind === "chapter-plate") {
    const { category, numeral, photoSrc, photoIndex, showKey, hasHappyHour, hasSecondary } =
      page;
    const pricingTag = hasSecondary
      ? `ETB · ${category.price_label || "Shot"} & ${category.secondary_price_label || "Bottle"}`
      : `ETB · ${category.price_label || "Serve"}`;

    return (
      <PageFrame
        runningHead={`Chapter ${numeral}`}
        runningMeta={`${category.items.length} serves`}
        folio={folio}
      >
        <div className="bmk-plate-wrap">
          <div className="bmk-plate-head">
            <div className="bmk-plate-titles">
              <p className="bmk-plate-eyebrow">Chapter {numeral}</p>
              <h3 className="bmk-plate-title">{category.name}</h3>
            </div>
            <span className="bmk-plate-roman" aria-hidden="true">
              {numeral}
            </span>
          </div>

          {category.kicker ? (
            <div className="bmk-plate-tag">
              <span className="bmk-plate-tag-line" aria-hidden="true" />
              <p>{category.kicker}</p>
            </div>
          ) : null}

          <figure
            className="bmk-plate-figure"
            data-photo-index={photoIndex}
            role="button"
            tabIndex={0}
            aria-label={`View full-screen photograph for ${category.name}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoSrc} alt={category.name} loading="lazy" />
            <div className="bmk-plate-scrim" aria-hidden="true" />
            <figcaption className="bmk-plate-cap">
              <span>{pricingTag}</span>
              <span className="bmk-plate-zoom-hint">Tap to inspect</span>
            </figcaption>
          </figure>

          {category.note ? (
            <p className="bmk-plate-note">{category.note}</p>
          ) : null}

          <div className="bmk-plate-legend">
            {showKey ? (
              <>
                <span className="bmk-key-label">Key</span>
                <span>
                  <b>✦</b> Signature
                </span>
                <span>
                  <b>F</b> Fasting
                </span>
                <span className="bmk-key-hh">
                  <b>Ochre</b> Fri Happy Hour
                </span>
              </>
            ) : (
              <>
                <span>All prices in ETB · 15% VAT &amp; 5% SC incl.</span>
                {hasHappyHour ? (
                  <span className="bmk-key-hh">
                    <b>Ochre</b> Fri HH (5–7:30pm)
                  </span>
                ) : null}
              </>
            )}
          </div>
        </div>
      </PageFrame>
    );
  }

  if (page.kind === "chapter-list") {
    const {
      category,
      numeral,
      entries,
      partIndex,
      partCount,
      hasSecondary,
      hasHappyHour,
    } = page;

    const col1Label = category.price_label || "ETB";
    const col2Label = category.secondary_price_label || "Bottle";

    return (
      <PageFrame
        runningHead={`${numeral} · ${category.name}`}
        runningMeta={partCount > 1 ? `Page ${partIndex + 1} of ${partCount}` : `${category.items.length} serves`}
        folio={folio}
      >
        <div className="bmk-list-wrap">
          <div className="bmk-list-head">
            <h3 className="bmk-list-title">{category.name}</h3>
            <div
              className={`bmk-col-heads${hasSecondary ? " has-sec" : ""}${hasHappyHour ? " has-hh" : ""}`}
            >
              <span>{col1Label}</span>
              {hasSecondary ? <span>{col2Label}</span> : null}
              {hasHappyHour ? <span className="is-hh">Fri HH</span> : null}
            </div>
          </div>

          <div className="bmk-items">
            {entries.map((entry, idx) => {
              if (entry.kind === "group") {
                return (
                  <div key={`g-${idx}-${entry.label}`} className="bmk-group-head">
                    <span>{entry.label}</span>
                    <i aria-hidden="true" />
                  </div>
                );
              }

              const it = entry.item;
              const p1 = formatPriceNumber(it.price_cents);
              const p2 = formatPriceNumber(it.secondary_price_cents);
              const ph = formatPriceNumber(it.happy_hour_price_cents);
              const isFasting =
                it.badge?.toLowerCase() === "fasting" ||
                it.badge?.toUpperCase() === "F";

              return (
                <article
                  key={it.id}
                  className={`bmk-item${it.is_signature ? " is-sig" : ""}`}
                >
                  <div className="bmk-item-main">
                    <div className="bmk-item-name-row">
                      <span className="bmk-item-name">
                        {it.is_signature ? (
                          <span className="bmk-sig-star" title="House signature">
                            ✦{" "}
                          </span>
                        ) : null}
                        {it.name}
                      </span>
                      {isFasting ? (
                        <span className="bmk-badge bmk-badge-f" title="Fasting friendly">
                          F
                        </span>
                      ) : it.badge && !it.is_signature ? (
                        <span className="bmk-badge">{it.badge}</span>
                      ) : null}
                      <span className="bmk-leader" aria-hidden="true" />
                    </div>

                    <div
                      className={`bmk-prices${hasSecondary ? " has-sec" : ""}${hasHappyHour ? " has-hh" : ""}`}
                    >
                      <span className="bmk-p1">
                        {p1 ?? (it.price_note ? it.price_note : "—")}
                      </span>
                      {hasSecondary ? (
                        <span className="bmk-p2">{p2 ?? "—"}</span>
                      ) : null}
                      {hasHappyHour ? (
                        <span className={`bmk-ph${ph ? "" : " is-empty"}`}>
                          {ph ?? "·"}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {it.description ? (
                    <p className="bmk-item-desc">{it.description}</p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </PageFrame>
    );
  }

  if (page.kind === "hh-plate") {
    return (
      <PageFrame
        runningHead="Every Friday"
        runningMeta="5:00 pm – 7:30 pm"
        folio={folio}
      >
        <div className="bmk-plate-wrap">
          <div className="bmk-plate-head">
            <div className="bmk-plate-titles">
              <p className="bmk-plate-eyebrow">Weekly Ritual</p>
              <h3 className="bmk-plate-title">Friday Happy Hour</h3>
            </div>
            <span className="bmk-plate-roman" aria-hidden="true">
              ✦
            </span>
          </div>

          <div className="bmk-plate-tag">
            <span className="bmk-plate-tag-line" aria-hidden="true" />
            <p>Every Friday · 5:00 pm to 7:30 pm</p>
          </div>

          <figure
            className="bmk-plate-figure"
            data-photo-index={page.photoIndex}
            role="button"
            tabIndex={0}
            aria-label="View full-screen Friday Happy Hour photograph"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/menu/chapter-happyhour.jpg"
              alt="Friday Happy Hour at Black Rose Lounge"
              loading="lazy"
            />
            <div className="bmk-plate-scrim" aria-hidden="true" />
            <figcaption className="bmk-plate-cap">
              <span>{page.totalHappyHourItems} Friday pours</span>
              <span className="bmk-plate-zoom-hint">Tap to inspect</span>
            </figcaption>
          </figure>

          <p className="bmk-plate-note">
            Two and a half hours before the weekend picks up — selected house cocktails,
            single shots, and cold Ethiopian beers at special Friday prices.
          </p>

          <div className="bmk-plate-legend">
            <span className="bmk-key-hh">
              <b>Turn page →</b> Complete Friday Happy Hour list (ETB)
            </span>
          </div>
        </div>
      </PageFrame>
    );
  }

  if (page.kind === "hh-list") {
    const allRows: Array<
      | { kind: "head"; label: string }
      | {
          kind: "row";
          id: string;
          name: string;
          regular: number | null;
          happy: number;
          isSignature: boolean;
        }
    > = [];
    for (const grp of page.groups) {
      allRows.push({ kind: "head", label: grp.heading });
      for (const item of grp.items) {
        allRows.push({ kind: "row", ...item });
      }
    }

    return (
      <PageFrame
        runningHead="Friday Happy Hour"
        runningMeta={
          page.partCount > 1
            ? `Guide ${page.partIndex + 1} of ${page.partCount}`
            : "5:00 pm – 7:30 pm"
        }
        folio={folio}
      >
        <div className="bmk-list-wrap">
          <div className="bmk-list-head">
            <h3 className="bmk-list-title">{page.title}</h3>
            <div className="bmk-col-heads has-hh">
              <span>Reg</span>
              <span className="is-hh">Fri HH</span>
            </div>
          </div>

          <div className="bmk-hh-grid">
            {allRows.map((row, i) =>
              row.kind === "head" ? (
                <div key={`hhg-${i}-${row.label}`} className="bmk-hh-group">
                  <span>{row.label}</span>
                  <i aria-hidden="true" />
                </div>
              ) : (
                <div key={row.id} className="bmk-hh-row">
                  <span className="bmk-hh-name">
                    {row.isSignature ? <b className="bmk-sig-star">✦ </b> : null}
                    {row.name}
                  </span>
                  <span className="bmk-hh-nums">
                    <s className="bmk-hh-reg">
                      {formatPriceNumber(row.regular) ?? ""}
                    </s>
                    <strong className="bmk-hh-price">
                      {formatPriceNumber(row.happy)}
                    </strong>
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </PageFrame>
    );
  }

  if (page.kind === "house-notes") {
    return (
      <PageFrame
        runningHead="House Notes"
        runningMeta="Suite 201"
        folio={folio}
      >
        <div className="bmk-notes-wrap">
          <p className="bmk-plate-eyebrow">The Salon</p>
          <h3 className="bmk-plate-title">Salon &amp; Cellar Notes</h3>
          <div className="bmk-notes-rule" aria-hidden="true" />

          <div className="bmk-notes-blocks">
            <div>
              <h4>Pricing &amp; Taxes</h4>
              <p>
                All menu prices are listed in Ethiopian Birr (ETB) and include 15% VAT and
                5% Service Charge. Dual-column chapters show Shot / Bottle or Full / Half
                portions.
              </p>
            </div>
            <div>
              <h4>Bottle Service &amp; Imported Cellar</h4>
              <p>
                Selected imported wines, reserve single malts, and private corner banquette
                tables are available on request. Ask your host or call ahead for groups of
                six or more.
              </p>
            </div>
            <div>
              <h4>Kitchen &amp; Last Orders</h4>
              <p>
                Open every evening from 5:00 pm — Tuesday to Saturday until 2:00 am, Sunday
                and Monday until 12:30 am. Both kitchen and bar call last orders 30 minutes
                before close.
              </p>
            </div>
            <div>
              <h4>Dress &amp; Atmosphere</h4>
              <p>
                {venue.dress.short}. A quiet, candlelit room designed for unhurried drinks
                and conversation you can actually hear.
              </p>
            </div>
          </div>
        </div>
      </PageFrame>
    );
  }

  // Back Cover
  return (
    <PageFrame variant="cover">
      <div className="bmk-cover-bg" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/menu/cover-pour.jpg" alt="" />
        <div className="bmk-cover-veil bmk-cover-veil--back" />
      </div>

      <div className="bmk-cover-center">
        <div className="bmk-cover-medallion bmk-cover-medallion--sm" aria-hidden="true">
          <Mark className="bmk-cover-mark" />
        </div>
        <p className="bmk-cover-italic bmk-back-title">Until last orders.</p>

        <div className="bmk-cover-est">
          <span />
          <i aria-hidden="true" />
          <span />
        </div>

        <p className="bmk-back-body">
          All prices are in Ethiopian Birr (ETB) and include 15% VAT &amp; 5% Service
          Charge. Kitchen and bar stop 30 minutes before close. Imported wines and corner
          banquette reservations are available on request.
        </p>

        <div className="bmk-back-actions">
          <a href="/visit" data-action="reserve" className="bmk-cover-cta bmk-cover-cta--solid">
            <span>Reserve a table →</span>
          </a>
          <button type="button" data-action="back-to-cover" className="bmk-cover-cta">
            <span>Back to cover</span>
          </button>
        </div>
      </div>

      <div className="bmk-back-foot">
        <span>Tue–Sat 5pm–2am · Sun &amp; Mon 5pm–12:30am</span>
        <span>
          {venue.address.line1} · {venue.address.line2}
        </span>
        <span>
          {venue.phones.map((p) => p.label).join(" · ")}
        </span>
      </div>
    </PageFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Main Interactive 3D Touch-Sensing Digital Menu Component           */
/* ------------------------------------------------------------------ */

export default function DigitalMenuBook({
  categories,
  variant = "standalone",
}: {
  categories: MenuCategoryWithItems[];
  variant?: "embedded" | "standalone";
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const flipRef = useRef<PageFlip | null>(null);

  const totalItems = useMemo(
    () => categories.reduce((sum, c) => sum + c.items.length, 0),
    [categories],
  );

  const book = useMemo(() => buildBook(categories), [categories]);

  const [ready, setReady] = useState(false);
  const [position, setPosition] = useState<{
    index: number;
    total: number;
    orientation: Orientation;
  }>({
    index: 0,
    total: book.pages.length,
    orientation: "landscape",
  });
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  /* ---- Build printed DOM nodes once per menu dataset ---------------- */
  const renderedPages = useMemo<ReactNode[]>(() => {
    pageRefs.current = [];
    return book.pages.map((page, index) => (
      <div
        key={page.id}
        ref={(el) => {
          pageRefs.current[index] = el;
        }}
        className="bmk-leaf"
        data-density={
          page.kind === "cover" || page.kind === "back-cover" ? "hard" : "soft"
        }
      >
        {renderBookPage(page, index, categories.length, totalItems)}
      </div>
    ));
  }, [book.pages, categories.length, totalItems]);

  /* ---- Initialise StPageFlip (touch-sensing 3D page curl physics) --- */
  useEffect(() => {
    const element = bookRef.current;
    if (!element) return;

    let cancelled = false;
    let instance: PageFlip | null = null;
    setReady(false);

    const mount = async () => {
      const { PageFlip: PageFlipCtor } = await import("page-flip");
      if (cancelled || !bookRef.current) return;

      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const flip = new PageFlipCtor(element, {
        width: 550,
        height: 800,
        size: "stretch",
        minWidth: 260,
        maxWidth: 540,
        minHeight: 340,
        maxHeight: 820,
        drawShadow: true,
        flippingTime: reduceMotion ? 0 : 1050,
        usePortrait: true,
        startZIndex: 20,
        startPage: 0,
        autoSize: true,
        maxShadowOpacity: 0.46,
        showCover: true,
        mobileScrollSupport: true,
        swipeDistance: 20,
        clickEventForward: true,
        useMouseEvents: true,
        disableFlipByClick: false,
        showPageCorners: true,
      });

      instance = flip;
      flipRef.current = flip;

      const publish = () => {
        if (cancelled) return;
        setPosition({
          index: flip.getCurrentPageIndex(),
          total: flip.getPageCount(),
          orientation: flip.getOrientation(),
        });
      };

      flip.on("init", () => {
        if (cancelled) return;
        setReady(true);
        publish();
      });
      flip.on("flip", publish);
      flip.on("changeOrientation", publish);

      const items = pageRefs.current.filter(Boolean) as HTMLElement[];
      if (items.length > 0) {
        flip.loadFromHTML(items);
        setReady(true);
        publish();
      }
    };

    void mount();

    return () => {
      cancelled = true;
      flipRef.current = null;

      const printed = pageRefs.current.filter(Boolean) as HTMLElement[];
      const parent = element.parentNode;
      const sibling = element.nextSibling;

      try {
        instance?.destroy();
      } catch {
        /* already destroyed */
      }

      /* Hand printed page DOM nodes back to React cleanly (StrictMode safe) */
      printed.forEach((page) => {
        if (page.parentNode !== element) element.appendChild(page);
      });
      element
        .querySelectorAll(
          ".stf__outerShadow, .stf__innerShadow, .stf__hardShadow, .stf__hardInnerShadow",
        )
        .forEach((node) => node.remove());
      if (parent && element.parentNode !== parent) {
        parent.insertBefore(element, sibling);
      }
    };
  }, [renderedPages]);

  /* ---- Book navigation helpers ------------------------------------- */
  const turnNext = useCallback(() => {
    flipRef.current?.flipNext("bottom");
  }, []);

  const turnPrev = useCallback(() => {
    flipRef.current?.flipPrev("bottom");
  }, []);

  const goToPage = useCallback((targetIndex: number) => {
    const flip = flipRef.current;
    if (!flip) return;
    const clamped = Math.max(0, Math.min(targetIndex, book.pages.length - 1));
    if (flip.getState() === "flipping") {
      flip.turnToPage(clamped);
      return;
    }
    try {
      flip.flip(clamped, "bottom");
    } catch {
      flip.turnToPage(clamped);
    }
  }, [book.pages.length]);

  /* ---- Native click delegation inside cloned StPageFlip pages ------ */
  useEffect(() => {
    const element = bookRef.current;
    if (!element) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest) return;

      const opener = target.closest("[data-action='open-menu']");
      if (opener) {
        event.preventDefault();
        event.stopPropagation();
        flipRef.current?.flipNext("bottom");
        return;
      }

      const toCover = target.closest("[data-action='back-to-cover']");
      if (toCover) {
        event.preventDefault();
        event.stopPropagation();
        try {
          flipRef.current?.flip(0, "bottom");
        } catch {
          flipRef.current?.turnToPage(0);
        }
        return;
      }

      const reserve = target.closest("a[data-action='reserve']") as HTMLAnchorElement | null;
      if (reserve) {
        event.stopPropagation();
        return;
      }

      const photo = target.closest("[data-photo-index]");
      if (photo) {
        event.preventDefault();
        event.stopPropagation();
        const idx = Number(photo.getAttribute("data-photo-index"));
        if (!Number.isNaN(idx) && idx >= 0) {
          setViewerIndex(idx);
        }
      }
    };

    element.addEventListener("click", handleClick);
    return () => element.removeEventListener("click", handleClick);
  }, []);

  /* ---- Fullscreen toggle ------------------------------------------- */
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (stageRef.current) {
        await stageRef.current.requestFullscreen();
      }
    } catch {
      /* fullscreen not supported */
    }
  }, []);

  /* ---- Keyboard arrow navigation ----------------------------------- */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (viewerIndex !== null) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.key === "ArrowRight") turnNext();
      if (event.key === "ArrowLeft") turnPrev();
      if (event.key === "Home") goToPage(0);
      if (event.key === "End") goToPage(book.pages.length - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerIndex, turnNext, turnPrev, goToPage, book.pages.length]);

  /* ---- Search across all 125 items (click result → flip to page) --- */
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: Array<{
      item: MenuItem;
      categoryName: string;
      pageIndex: number;
    }> = [];
    for (const cat of categories) {
      for (const item of cat.items) {
        const hay =
          `${item.name} ${item.description} ${item.group_name} ${item.badge} ${cat.name}`.toLowerCase();
        if (hay.includes(q)) {
          out.push({
            item,
            categoryName: cat.name,
            pageIndex: book.itemPageMap.get(item.id) ?? 1,
          });
        }
      }
    }
    return out;
  }, [query, categories, book.itemPageMap]);

  /* ---- Current spread label & active rail chapter ------------------ */
  const currentPage = book.pages[position.index] ?? book.pages[0];

  const { pageLabel, sectionTitle, activeRailKey } = useMemo(() => {
    const { index, total, orientation } = position;
    const active = book.pages[index] ?? book.pages[0];

    if (index === 0) {
      return {
        pageLabel: `Cover · 1 / ${total}`,
        sectionTitle: `${venue.name} — The Menu`,
        activeRailKey: "cover",
      };
    }
    if (index >= total - 1) {
      return {
        pageLabel: `Back Cover · ${total} / ${total}`,
        sectionTitle: "Until last orders",
        activeRailKey: "back",
      };
    }

    if (orientation === "portrait") {
      return {
        pageLabel: `Page ${index + 1} / ${total}`,
        sectionTitle: active.sectionLabel,
        activeRailKey: active.railKey,
      };
    }

    const leftIdx = index % 2 === 1 ? index : Math.max(1, index - 1);
    const rightIdx = Math.min(total - 1, leftIdx + 1);
    const leftPage = book.pages[leftIdx] ?? active;

    return {
      pageLabel: `Pages ${leftIdx + 1}–${rightIdx + 1} / ${total}`,
      sectionTitle: leftPage.sectionLabel,
      activeRailKey: leftPage.railKey,
    };
  }, [position, book.pages]);

  const atStart = position.index <= 0;
  const atEnd = position.index >= position.total - 1;

  return (
    <div
      ref={stageRef}
      className={`dmenu-stage dmenu-stage--${variant}${isFullscreen ? " is-fullscreen" : ""}`}
      data-current-section={currentPage?.sectionLabel ?? ""}
    >
      <div className="dmenu-glow dmenu-glow--top" aria-hidden="true" />
      <div className="dmenu-glow dmenu-glow--bottom" aria-hidden="true" />

      {/* ---- Top bar: search + quick jumps + fullscreen ---- */}
      <div className="dmenu-topbar">
        <div className="dmenu-search-box">
          <svg
            viewBox="0 0 24 24"
            className="dmenu-search-ico"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
            placeholder={`Search all ${totalItems} drinks & dishes…`}
            aria-label="Search the Black Rose menu"
          />
          {query ? (
            <button
              type="button"
              className="dmenu-search-clear"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              ✕
            </button>
          ) : null}

          {searchFocused && query.trim() ? (
            <div className="dmenu-search-results" role="listbox">
              {searchResults.length === 0 ? (
                <div className="dmenu-search-empty">
                  No match for “{query.trim()}”.
                </div>
              ) : (
                <>
                  <div className="dmenu-search-count">
                    {searchResults.length} result{searchResults.length === 1 ? "" : "s"} — tap to flip to page
                  </div>
                  {searchResults.slice(0, 12).map(({ item, categoryName, pageIndex }) => (
                    <button
                      key={item.id}
                      type="button"
                      className="dmenu-search-hit"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        goToPage(pageIndex);
                        setQuery("");
                        setSearchFocused(false);
                      }}
                    >
                      <span className="dmenu-hit-left">
                        <strong>
                          {item.is_signature ? "✦ " : ""}
                          {item.name}
                        </strong>
                        <small>
                          {categoryName}
                          {item.group_name ? ` · ${item.group_name}` : ""} · p.{pageIndex + 1}
                        </small>
                      </span>
                      <span className="dmenu-hit-right">
                        {formatPriceNumber(item.price_cents)
                          ? `ETB ${formatPriceNumber(item.price_cents)}`
                          : item.price_note || "Ask bar"}
                        {item.happy_hour_price_cents != null ? (
                          <em>Fri HH {formatPriceNumber(item.happy_hour_price_cents)}</em>
                        ) : null}
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          ) : null}
        </div>

        <div className="dmenu-top-actions">
          <button
            type="button"
            className={`dmenu-pill-btn${activeRailKey === "cover" ? " is-active" : ""}`}
            onClick={() => goToPage(0)}
          >
            Cover
          </button>
          {book.happyHourPageIndex !== null ? (
            <button
              type="button"
              className={`dmenu-pill-btn dmenu-pill-btn--hh${activeRailKey === "happy-hour" ? " is-active" : ""}`}
              onClick={() => goToPage(book.happyHourPageIndex!)}
            >
              ✦ Fri HH
            </button>
          ) : null}
          <button
            type="button"
            className="dmenu-icon-btn"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "View menu fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M9 3v6H3M15 21v-6h6" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M3 9V3h6M21 15v6h-6" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ---- Tactile 3D Book Stage (StPageFlip) ---- */}
      <div className="dmenu-book-viewport">
        <div className="dmenu-book-frame">
          <div
            ref={bookRef}
            className={`dmenu-book-host${ready ? " is-ready" : ""}`}
            aria-label="Black Rose Lounge interactive 3D menu book"
          >
            {renderedPages}
          </div>
        </div>
      </div>

      {/* ---- Bottom Dock: Chapter Rail + Page Turn Controls ---- */}
      <div className="dmenu-dock">
        <div className="dmenu-rail" role="tablist" aria-label="Menu chapters">
          {book.rail.map((ch) => {
            const isActive = activeRailKey === ch.key;
            return (
              <button
                key={ch.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`dmenu-rail-btn${isActive ? " is-active" : ""}${ch.key === "happy-hour" ? " is-hh" : ""}`}
                onClick={() => goToPage(ch.pageIndex)}
              >
                <span className="dmenu-rail-num">{ch.numeral}</span>
                <span>{ch.label}</span>
                <span className="dmenu-rail-count">{ch.count}</span>
              </button>
            );
          })}
        </div>

        <div className="dmenu-controls">
          <button
            type="button"
            className="dmenu-turn-btn"
            onClick={turnPrev}
            disabled={atStart}
            aria-label="Previous page"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
            <span>Previous</span>
          </button>

          <div className="dmenu-pos">
            <p className="dmenu-pos-section">{sectionTitle}</p>
            <p className="dmenu-pos-folio">{pageLabel}</p>
            <p className="dmenu-pos-tip">Drag a corner, swipe, or tap to turn</p>
          </div>

          <button
            type="button"
            className="dmenu-turn-btn"
            onClick={turnNext}
            disabled={atEnd}
            aria-label="Next page"
          >
            <span>Next</span>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* ---- Full-screen Pinch-Zoom Chapter Plate Lightbox ---- */}
      {viewerIndex !== null ? (
        <MenuPhotoViewer
          photos={book.photos}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </div>
  );
}
