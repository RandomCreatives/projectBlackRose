"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Mark from "./Mark";
import { venue } from "@/content/site";
import type { MenuCategoryWithItems, MenuItem } from "@/lib/menu";
import "./digital-menu.css";

const FALLBACK_PLATES = [
  "/img/menu/chapter-cocktails.jpg",
  "/img/menu/chapter-wine.jpg",
  "/img/menu/chapter-spirits.jpg",
  "/img/menu/chapter-whisky.jpg",
  "/img/menu/chapter-food.jpg",
  "/img/menu/chapter-beer.jpg",
  "/img/menu/chapter-happyhour.jpg",
];

function toRoman(num: number): string {
  const pairs: Array<[number, string]> = [
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let n = Math.max(1, Math.floor(num));
  let out = "";
  for (const [val, sym] of pairs) {
    while (n >= val) {
      out += sym;
      n -= val;
    }
  }
  return out;
}

function fmtNum(cents: number | null | undefined): string | null {
  if (cents === null || cents === undefined) return null;
  const major = cents / 100;
  return Number.isInteger(major)
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(major)
    : new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(major);
}

function fmtBirr(cents: number | null | undefined, currency = "ETB"): string | null {
  const n = fmtNum(cents);
  return n === null ? null : `${currency} ${n}`;
}

function itemUnitNoun(cat: BookChapter): string {
  if (cat.isHappyHourChapter) return "Friday specials";
  const lower = cat.name.toLowerCase();
  if (lower.includes("food") || lower.includes("kitchen")) return "plates";
  if (lower.includes("wine") || lower.includes("champagne")) return "bottles & glasses";
  if (lower.includes("beer")) return "selections";
  if (cat.secondary_price_label) return "pours & bottles";
  return "serves";
}

type BookChapter = MenuCategoryWithItems & {
  isHappyHourChapter?: boolean;
};

type FlipState = {
  direction: "next" | "prev";
  from: number;
  to: number;
  progress: number;
  dragging: boolean;
  label: string;
  eyebrow: string;
};

type Props = {
  categories: MenuCategoryWithItems[];
  variant?: "embedded" | "standalone";
  hoursSummary?: string;
};

export default function DigitalMenuBook({
  categories,
  variant = "embedded",
  hoursSummary = "Sun–Mon 5pm–12:30am · Tue–Sat 5pm–2am",
}: Props) {
  // Real live chapters + dynamically derived Chapter VII (Friday Happy Hour) from the single source of truth
  const chapters = useMemo<BookChapter[]>(() => {
    const base: BookChapter[] = categories.filter((c) => c.items.length > 0);
    const happyItems: MenuItem[] = [];
    for (const cat of base) {
      for (const item of cat.items) {
        const isFridayOnly = item.badge.toLowerCase() === "friday only";
        if (item.happy_hour_price_cents !== null || isFridayOnly) {
          happyItems.push({
            ...item,
            id: `hh-${item.id}`,
            group_name: item.group_name || cat.name,
          });
        }
      }
    }
    if (happyItems.length > 0) {
      base.push({
        id: "chapter-friday-happy-hour",
        name: "Friday Happy Hour",
        kicker: "Fridays — selected pours & kitchen",
        note: "Compiled live from the house list. Single serves, shots, beers, soft drinks, and Zilzil Tibs at Friday Happy Hour pricing.",
        price_label: "Happy Hour",
        secondary_price_label: "",
        image_url: "/img/menu/chapter-happyhour.jpg",
        sort_order: 999,
        is_active: true,
        items: happyItems,
        isHappyHourChapter: true,
      });
    }
    return base;
  }, [categories]);

  // 0 = Front Cover, 1..chapters.length = Chapters, chapters.length + 1 = Back Cover
  const backCoverIndex = chapters.length + 1;

  // Count unique items across real (non-derived) chapters
  const totalUniqueItems = useMemo(
    () =>
      categories
        .filter((c) => c.items.length > 0)
        .reduce((acc, c) => acc + c.items.length, 0),
    [categories],
  );

  const [spread, setSpread] = useState(0);
  const [flip, setFlip] = useState<FlipState | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startTime: number;
    fromCorner: "next" | "prev" | null;
    active: boolean;
    direction: "next" | "prev" | null;
  } | null>(null);
  const animTimerRef = useRef<number | null>(null);
  const midTimerRef = useRef<number | null>(null);

  const spreadMeta = useCallback(
    (idx: number): { eyebrow: string; label: string } => {
      if (idx <= 0) return { eyebrow: "Black Rose Lounge", label: "Cover" };
      if (idx >= backCoverIndex)
        return { eyebrow: "Since 2003", label: "Back Cover" };
      const c = chapters[idx - 1];
      return {
        eyebrow: `Chapter ${toRoman(idx)}`,
        label: c?.name ?? "",
      };
    },
    [backCoverIndex, chapters],
  );

  const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clearTurnTimers = () => {
    if (animTimerRef.current) {
      window.clearTimeout(animTimerRef.current);
      animTimerRef.current = null;
    }
    if (midTimerRef.current) {
      window.clearTimeout(midTimerRef.current);
      midTimerRef.current = null;
    }
  };

  const commitTurn = useCallback(
    (target: number) => {
      const clamped = Math.max(0, Math.min(backCoverIndex, target));
      if (clamped === spread) {
        setFlip(null);
        return;
      }
      clearTurnTimers();

      if (prefersReducedMotion()) {
        setSpread(clamped);
        setFlip(null);
        listScrollRef.current?.scrollTo({ top: 0 });
        return;
      }

      const direction: "next" | "prev" = clamped > spread ? "next" : "prev";
      const meta = spreadMeta(clamped);
      setFlip({
        direction,
        from: spread,
        to: clamped,
        progress: 0.02,
        dragging: false,
        eyebrow: meta.eyebrow,
        label: meta.label,
      });

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setFlip((curr) =>
            curr ? { ...curr, progress: 1, dragging: false } : null,
          );
        });
      });

      midTimerRef.current = window.setTimeout(() => {
        setSpread(clamped);
        listScrollRef.current?.scrollTo({ top: 0 });
      }, 220);

      animTimerRef.current = window.setTimeout(() => {
        setSpread(clamped);
        setFlip(null);
      }, 460);
    },
    [backCoverIndex, spread, spreadMeta],
  );

  useEffect(() => clearTurnTimers, []);

  // Support optional deep-link ?chapter=whisky / ?chapter=happy-hour on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("chapter");
    if (!raw) return;
    const needle = raw.trim().toLowerCase().replace(/[-_]+/g, " ");
    const idx = chapters.findIndex(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        c.items.some((it) => it.group_name.toLowerCase().includes(needle)),
    );
    if (idx >= 0) setSpread(idx + 1);
  }, [chapters]);

  // Keep active ribbon pill scrolled into view
  useEffect(() => {
    const el = ribbonRef.current?.querySelector<HTMLElement>(
      `[data-spread="${spread}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [spread]);

  // Keyboard navigation on standalone /menu or when book is focused
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (variant === "embedded") {
        if (!stageRef.current?.contains(document.activeElement)) return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        commitTurn(spread + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        commitTurn(spread - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commitTurn, spread, variant]);

  // Interactive pointer drag / corner peel / horizontal swipe
  const onPointerDown = (
    e: React.PointerEvent,
    fromCorner: "next" | "prev" | null = null,
  ) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const targetEl = e.target as HTMLElement | null;
    if (
      !fromCorner &&
      targetEl?.closest("button, a, input, select, textarea")
    ) {
      return;
    }
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTime: performance.now(),
      fromCorner,
      active: false,
      direction: fromCorner,
    };
    if (fromCorner) {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.active) {
      const horizontalIntent =
        drag.fromCorner !== null
          ? Math.abs(dx) > 6 || Math.abs(dy) > 6
          : Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.35;

      if (!horizontalIntent) {
        if (!drag.fromCorner && Math.abs(dy) > 14) {
          dragRef.current = null;
        }
        return;
      }

      const dir: "next" | "prev" =
        drag.fromCorner ?? (dx < 0 ? "next" : "prev");
      const to = dir === "next" ? spread + 1 : spread - 1;
      if (to < 0 || to > backCoverIndex) {
        dragRef.current = null;
        return;
      }
      drag.active = true;
      drag.direction = dir;
    }

    if (!drag.direction) return;
    const to = drag.direction === "next" ? spread + 1 : spread - 1;
    const width = Math.max(
      260,
      (stageRef.current?.clientWidth ?? 560) * 0.55,
    );
    const raw =
      drag.direction === "next"
        ? (-dx + (drag.fromCorner ? 18 : 0)) / width
        : (dx + (drag.fromCorner ? 18 : 0)) / width;
    const progress = Math.max(0.02, Math.min(0.98, raw));
    const meta = spreadMeta(to);

    setFlip({
      direction: drag.direction,
      from: spread,
      to,
      progress,
      dragging: true,
      eyebrow: meta.eyebrow,
      label: meta.label,
    });
  };

  const finishDrag = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;

    if (!drag.active) {
      if (drag.fromCorner === "next") commitTurn(spread + 1);
      if (drag.fromCorner === "prev") commitTurn(spread - 1);
      return;
    }

    const dx = e.clientX - drag.startX;
    const elapsed = Math.max(1, performance.now() - drag.startTime);
    const velocity = Math.abs(dx) / elapsed;
    const currentProgress = flip?.progress ?? 0;
    const shouldTurn = currentProgress > 0.22 || velocity > 0.45;

    if (shouldTurn && flip) {
      const target = flip.to;
      clearTurnTimers();
      setFlip((curr) => (curr ? { ...curr, progress: 1, dragging: false } : null));
      midTimerRef.current = window.setTimeout(() => {
        setSpread(target);
        listScrollRef.current?.scrollTo({ top: 0 });
      }, 140);
      animTimerRef.current = window.setTimeout(() => {
        setSpread(target);
        setFlip(null);
      }, 320);
    } else {
      clearTurnTimers();
      setFlip((curr) => (curr ? { ...curr, progress: 0, dragging: false } : null));
      animTimerRef.current = window.setTimeout(() => {
        setFlip(null);
      }, 280);
    }
  };

  // Search across all real chapters (avoid duplicating Happy Hour matches in search)
  const searchMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const results: Array<{
      spreadIndex: number;
      category: BookChapter;
      item: MenuItem;
    }> = [];
    chapters.forEach((cat, idx) => {
      if (cat.isHappyHourChapter) return;
      const catHit = cat.name.toLowerCase().includes(q);
      for (const item of cat.items) {
        if (
          catHit ||
          item.name.toLowerCase().includes(q) ||
          item.group_name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.badge.toLowerCase().includes(q) ||
          (q.includes("happy") && item.happy_hour_price_cents !== null)
        ) {
          results.push({ spreadIndex: idx + 1, category: cat, item });
        }
      }
    });
    return results.slice(0, 24);
  }, [chapters, query]);

  const jumpToItem = (spreadIndex: number, itemId: string) => {
    setSearchOpen(false);
    setQuery("");
    setHighlightedId(itemId);
    if (spreadIndex !== spread) {
      commitTurn(spreadIndex);
    }
    window.setTimeout(
      () => {
        const row = document.getElementById(`bm-item-${itemId}`);
        row?.scrollIntoView({ behavior: "smooth", block: "center" });
      },
      spreadIndex !== spread ? 520 : 60,
    );
    window.setTimeout(() => {
      setHighlightedId((curr) => (curr === itemId ? null : curr));
    }, 3200);
  };

  const scrollToGroup = (groupKey: string) => {
    const el = document.getElementById(`bm-grp-${groupKey}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const activeChapter =
    spread >= 1 && spread <= chapters.length ? chapters[spread - 1] : null;
  const isCoverView = spread === 0 || spread === backCoverIndex;
  const hasDualColumns = Boolean(
    activeChapter &&
      !activeChapter.isHappyHourChapter &&
      (activeChapter.secondary_price_label ||
        activeChapter.items.some((i) => i.secondary_price_cents !== null)),
  );
  const hasHappyHourInChapter = Boolean(
    activeChapter &&
      !activeChapter.isHappyHourChapter &&
      activeChapter.items.some((i) => i.happy_hour_price_cents !== null),
  );

  // Distinct sub-headings within the active chapter (for quick jump pills on the left page)
  const chapterGroups = useMemo(() => {
    if (!activeChapter) return [];
    const seen: string[] = [];
    for (const it of activeChapter.items) {
      if (it.group_name && !seen.includes(it.group_name)) {
        seen.push(it.group_name);
      }
    }
    return seen;
  }, [activeChapter]);

  const leafStyle = useMemo(() => {
    if (!flip) return undefined;
    const deg =
      flip.direction === "next"
        ? -180 * flip.progress
        : 180 * flip.progress;
    return {
      transform: `rotateY(${deg}deg)`,
      transition: flip.dragging
        ? "none"
        : "transform 450ms cubic-bezier(.22,.8,.28,1)",
    };
  }, [flip]);

  const pageLabel =
    spread === 0
      ? "Cover"
      : spread === backCoverIndex
        ? "Back Cover"
        : `Chapter ${toRoman(spread)} · ${spread} of ${chapters.length}`;

  const groupSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div className="dmenu">
      {/* Top toolbar: search + full-screen link + chapter ribbon */}
      <div className="dmenu-bar">
        <div className="dmenu-bar-top">
          <div className="dmenu-search-wrap">
            <input
              type="search"
              className="dmenu-search"
              value={query}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => window.setTimeout(() => setSearchOpen(false), 180)}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              placeholder={`Search ${totalUniqueItems} cocktails, wines, spirits, dishes…`}
              aria-label="Search the menu"
            />
            {query ? (
              <button
                type="button"
                className="dmenu-search-clear"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  setSearchOpen(false);
                }}
              >
                ×
              </button>
            ) : null}

            {searchOpen && query.trim().length > 0 ? (
              <div className="dmenu-results" role="listbox" aria-label="Menu matches">
                {searchMatches.length === 0 ? (
                  <div className="dmenu-results-empty">
                    Nothing matched “{query.trim()}”. Try a spirit, cocktail, “fasting”, or “happy hour”.
                  </div>
                ) : (
                  searchMatches.map(({ spreadIndex, category, item }) => {
                    const p1 = fmtBirr(item.price_cents, item.currency);
                    const p2 = fmtBirr(item.secondary_price_cents, item.currency);
                    const hh = fmtBirr(item.happy_hour_price_cents, item.currency);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        className="dmenu-result-btn"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => jumpToItem(spreadIndex, item.id)}
                      >
                        <span>
                          <span className="dmenu-result-name">{item.name}</span>
                          <span className="dmenu-result-cat">
                            Ch. {toRoman(spreadIndex)} · {category.name}
                            {item.group_name ? ` · ${item.group_name}` : ""}
                            {item.badge ? ` · ${item.badge}` : ""}
                          </span>
                        </span>
                        <span className="dmenu-result-price">
                          {p1 && p2
                            ? `${category.price_label || "1"} ${fmtNum(item.price_cents)} · ${category.secondary_price_label || "2"} ${fmtNum(item.secondary_price_cents)}`
                            : p1 ?? item.price_note ?? "Ask at bar"}
                          {hh ? <span className="dmenu-result-hh">{hh} Fri HH</span> : null}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>

          <div className="dmenu-bar-actions">
            <span className="dmenu-meta-pill">
              {chapters.length} chapters · {totalUniqueItems} items · VAT &amp; SC incl.
            </span>
            {variant === "embedded" ? (
              <Link href="/menu" className="dmenu-fullscreen-link">
                Full-screen flipbook →
              </Link>
            ) : null}
          </div>
        </div>

        {/* Chapter jump strip */}
        <div
          className="dmenu-ribbon"
          ref={ribbonRef}
          role="tablist"
          aria-label="Menu chapters"
        >
          <button
            type="button"
            className="dmenu-chip"
            data-spread={0}
            aria-current={spread === 0 ? "page" : undefined}
            onClick={() => commitTurn(0)}
          >
            Cover
          </button>
          {chapters.map((cat, idx) => {
            const sp = idx + 1;
            return (
              <button
                type="button"
                key={cat.id}
                className={`dmenu-chip${cat.isHappyHourChapter ? " is-hh" : ""}`}
                data-spread={sp}
                aria-current={spread === sp ? "page" : undefined}
                onClick={() => commitTurn(sp)}
              >
                <span className="roman">{toRoman(sp)}</span>
                <span>{cat.name}</span>
              </button>
            );
          })}
          <button
            type="button"
            className="dmenu-chip"
            data-spread={backCoverIndex}
            aria-current={spread === backCoverIndex ? "page" : undefined}
            onClick={() => commitTurn(backCoverIndex)}
          >
            Notes
          </button>
        </div>
      </div>

      {/* Interactive 3D Book */}
      <div
        className="dmenu-stage"
        ref={stageRef}
        tabIndex={0}
        aria-label="Interactive Black Rose digital menu flipbook. Use left and right arrow keys or swipe to turn pages."
        onPointerDown={(e) => onPointerDown(e, null)}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <div className={`dmenu-book ${isCoverView ? "is-cover" : "is-spread"}`}>
          <div className="dmenu-shell">
            {/* ---- FRONT COVER ---- */}
            {spread === 0 ? (
              <article
                className="bm-cover is-clickable"
                onClick={(e) => {
                  if ((e.target as HTMLElement | null)?.closest("button, a")) return;
                  commitTurn(1);
                }}
              >
                <div className="bm-cover-bg" aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/img/menu/cover-pour.jpg"
                    alt=""
                    width={1400}
                    height={933}
                  />
                </div>
                <div className="bm-cover-veil" aria-hidden="true" />
                <div className="bm-cover-frame" aria-hidden="true" />
                <div className="bm-cover-spine" aria-hidden="true" />

                <div>
                  <p className="bm-cover-kicker">
                    Menu · {venue.address.city} · Since {venue.since}
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div className="bm-monogram" aria-hidden="true">
                    <Mark />
                  </div>
                  <h3 className="bm-cover-title">{venue.name}</h3>
                  <p className="bm-cover-sub">{venue.tagline}</p>
                  <p className="bm-cover-body">
                    Candlelight, a properly made cocktail, and a cellar of Ethiopian wines, single malts, and
                    late-night plates — poured the same way on Djibouti Street.
                  </p>
                  <div className="bm-cover-stats">
                    <span>{chapters.length} chapters</span>
                    <span>Shot &amp; bottle prices</span>
                    <span>Friday happy hour</span>
                  </div>
                  <button
                    type="button"
                    className="btn solid"
                    onClick={() => commitTurn(1)}
                  >
                    Open the menu <span className="arw">→</span>
                  </button>
                </div>

                <p className="bm-cover-foot">
                  All prices in ETB · 15% VAT &amp; 5% Service Charge included
                </p>
              </article>
            ) : null}

            {/* ---- CHAPTER SPREAD ---- */}
            {activeChapter ? (
              <article className="bm-spread" key={activeChapter.id}>
                {/* Left page: Chapter cover with bespoke house plate */}
                <div className="bm-left">
                  <div className="bm-roman-bg" aria-hidden="true">
                    {toRoman(spread)}
                  </div>

                  <div>
                    <div className="bm-page-top">
                      <span>Chapter {toRoman(spread)}</span>
                      <span className="bm-page-num">
                        {String(spread).padStart(2, "0")} / {String(chapters.length).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="bm-chap-title">{activeChapter.name}</h3>
                    {activeChapter.kicker ? (
                      <p className="bm-chap-kicker">{activeChapter.kicker}</p>
                    ) : null}
                  </div>

                  <figure className="bm-chap-photo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        activeChapter.image_url ||
                        FALLBACK_PLATES[(spread - 1) % FALLBACK_PLATES.length]
                      }
                      alt={activeChapter.name}
                      loading="lazy"
                    />
                    <figcaption>
                      <span>{venue.name}</span>
                      <b>{venue.address.city}</b>
                    </figcaption>
                  </figure>

                  {activeChapter.note ? (
                    <p className="bm-chap-note">{activeChapter.note}</p>
                  ) : null}

                  {chapterGroups.length > 1 ? (
                    <div className="bm-subnav" aria-label="Jump to section in this chapter">
                      {chapterGroups.map((grp) => (
                        <button
                          type="button"
                          key={grp}
                          className="bm-subnav-btn"
                          onClick={() => scrollToGroup(groupSlug(grp))}
                        >
                          {grp}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="bm-key" aria-label="Menu key">
                    {hasHappyHourInChapter ? (
                      <span className="bm-key-item is-ochre">
                        <span className="bm-key-badge ochre">HH</span> Ochre = Friday Happy Hour
                      </span>
                    ) : null}
                    <span className="bm-key-item">
                      <span className="bm-key-badge">✦</span> Signature
                    </span>
                    <span className="bm-key-item">
                      <span className="bm-key-badge">F</span> Fasting
                    </span>
                    {hasDualColumns ? (
                      <span className="bm-key-item">
                        <span className="bm-key-badge">2×</span>{" "}
                        {activeChapter.price_label || "Shot"} &amp;{" "}
                        {activeChapter.secondary_price_label || "Bottle"}
                      </span>
                    ) : null}
                    <span className="bm-key-item">15% VAT &amp; 5% SC incl.</span>
                  </div>
                </div>

                {/* Right page: Menu rows with sub-headings & inline ochre Happy Hour */}
                <div className="bm-right">
                  <div className="bm-right-head">
                    <div>
                      <h4 className="bm-right-title">{activeChapter.name}</h4>
                      <div className="bm-right-count">
                        {activeChapter.items.length} {itemUnitNoun(activeChapter)}
                      </div>
                    </div>

                    {hasDualColumns ? (
                      <div className="bm-col-heads" aria-hidden="true">
                        <div className="bm-col-head">
                          {activeChapter.price_label || "Shot"}
                          <small>ETB</small>
                        </div>
                        <div className="bm-col-head wide">
                          {activeChapter.secondary_price_label || "Bottle"}
                          <small>ETB</small>
                        </div>
                      </div>
                    ) : (
                      <div className="bm-col-heads" aria-hidden="true">
                        <div className="bm-col-head wide">
                          {activeChapter.price_label || "Price"}
                          <small>ETB</small>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bm-list-scroll" ref={listScrollRef}>
                    {activeChapter.items.map((item, idx) => {
                      const prevGroup =
                        idx > 0 ? activeChapter.items[idx - 1].group_name : "";
                      const showGroupHeader =
                        Boolean(item.group_name) && item.group_name !== prevGroup;

                      const p1 = fmtNum(item.price_cents);
                      const p2 = fmtNum(item.secondary_price_cents);
                      const hh = fmtNum(item.happy_hour_price_cents);

                      const isFasting =
                        item.badge.toLowerCase() === "fasting" ||
                        item.name.toLowerCase().includes("fasting");
                      const isFridayOnly =
                        item.badge.toLowerCase() === "friday only";
                      const isHighlighted = highlightedId === item.id;

                      return (
                        <div key={item.id}>
                          {showGroupHeader ? (
                            <div
                              id={`bm-grp-${groupSlug(item.group_name)}`}
                              className="bm-group-head"
                            >
                              {item.group_name}
                            </div>
                          ) : null}

                          <div
                            id={`bm-item-${item.id}`}
                            className={`bm-row${item.is_signature ? " is-signature" : ""}${isHighlighted ? " is-highlighted" : ""}`}
                          >
                            <div className="bm-row-main">
                              <div className="bm-row-name-line">
                                <span className="bm-row-name">{item.name}</span>
                                {item.is_signature ? (
                                  <span className="bm-tag">✦ Signature</span>
                                ) : null}
                                {item.badge &&
                                item.badge.toLowerCase() !== "signature" ? (
                                  <span
                                    className={`bm-tag${isFasting ? " fasting" : isFridayOnly ? " friday" : " sub"}`}
                                  >
                                    {item.badge}
                                  </span>
                                ) : null}
                              </div>
                              {item.description ? (
                                <p className="bm-row-desc">{item.description}</p>
                              ) : null}
                            </div>

                            <div className="bm-row-prices">
                              {activeChapter.isHappyHourChapter ? (
                                <span className="bm-price-cell hh-main">
                                  {hh
                                    ? `${item.currency} ${hh}`
                                    : p1
                                      ? `${item.currency} ${p1}`
                                      : "Ask at bar"}
                                  {hh && p1 ? (
                                    <span className="bm-reg-sub">
                                      {item.currency} {p1}
                                    </span>
                                  ) : null}
                                </span>
                              ) : hasDualColumns ? (
                                <>
                                  <span
                                    className={`bm-price-cell${p1 === null ? " empty" : ""}`}
                                    aria-label={`${activeChapter.price_label || "Shot"}: ${p1 ? `ETB ${p1}` : "not available"}`}
                                  >
                                    {p1 ?? "—"}
                                    {hh ? (
                                      <span className="bm-hh-sub">{hh} HH</span>
                                    ) : null}
                                  </span>
                                  <span
                                    className={`bm-price-cell secondary${p2 === null ? " empty" : ""}`}
                                    aria-label={`${activeChapter.secondary_price_label || "Bottle"}: ${p2 ? `ETB ${p2}` : "single portion only"}`}
                                  >
                                    {p2 ?? "—"}
                                  </span>
                                </>
                              ) : (
                                <span className="bm-price-cell single">
                                  {p1 ? `${item.currency} ${p1}` : item.price_note || "Ask at bar"}
                                  {hh ? (
                                    <span className="bm-hh-sub">
                                      {item.currency} {hh} happy hour
                                    </span>
                                  ) : null}
                                  {p1 && item.price_note ? (
                                    <span className="bm-price-note">{item.price_note}</span>
                                  ) : null}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bm-right-foot">
                    <span>
                      {hasHappyHourInChapter ? (
                        <>
                          <span className="ochre">Ochre</span> — Friday Happy Hour
                        </>
                      ) : activeChapter.isHappyHourChapter ? (
                        <>
                          <span className="ochre">Fridays</span> — regular price struck through
                        </>
                      ) : hasDualColumns ? (
                        `${activeChapter.price_label || "Shot"} & ${activeChapter.secondary_price_label || "Bottle"} prices in ETB`
                      ) : (
                        "Prices in Ethiopian Birr (ETB)"
                      )}
                    </span>
                    <span>
                      {activeChapter.items.length > 10 ? "Scroll list ↓" : "15% VAT & 5% SC incl."}
                    </span>
                  </div>
                </div>
              </article>
            ) : null}

            {/* ---- BACK COVER ---- */}
            {spread === backCoverIndex ? (
              <article className="bm-cover">
                <div className="bm-cover-bg" aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/img/menu/cover-table.jpg"
                    alt=""
                    width={1400}
                    height={933}
                  />
                </div>
                <div className="bm-cover-veil" aria-hidden="true" />
                <div className="bm-cover-frame" aria-hidden="true" />
                <div className="bm-cover-spine" aria-hidden="true" />

                <div>
                  <p className="bm-cover-kicker">
                    {venue.address.line1} · {venue.address.line2}
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div className="bm-monogram" aria-hidden="true">
                    <Mark />
                  </div>
                  <h3 className="bm-cover-title">Until last orders.</h3>
                  <p className="bm-cover-sub">{hoursSummary}</p>
                  <p className="bm-cover-body">
                    All prices are in Ethiopian Birr (ETB) and include 15% VAT &amp; 5% Service Charge. Kitchen
                    and bar both stop 30 minutes before close. Imported wines and private salon bookings are
                    available on request.
                  </p>
                  <div className="bm-cover-stats">
                    <span>✦ Signature house serve</span>
                    <span>F Fasting friendly</span>
                    <span>Ochre = Friday Happy Hour</span>
                    <span>Shot / Bottle &amp; Full / Half</span>
                  </div>
                  <div className="bm-cover-actions">
                    <Link href="/visit" className="btn solid">
                      Reserve a table <span className="arw">→</span>
                    </Link>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => commitTurn(0)}
                    >
                      Back to cover
                    </button>
                  </div>
                </div>

                <p className="bm-cover-foot">
                  {venue.name} · {venue.address.city}, {venue.address.country} · {venue.phones[0].label}
                </p>
              </article>
            ) : null}

            {/* Interactive page-turn corner triggers */}
            {spread > 0 ? (
              <button
                type="button"
                className="bm-corner prev"
                aria-label="Turn to previous page"
                title="Drag or click for previous chapter"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onPointerDown(e, "prev");
                }}
              />
            ) : null}
            {spread < backCoverIndex ? (
              <button
                type="button"
                className="bm-corner next"
                aria-label="Turn to next page"
                title="Drag or click for next chapter"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onPointerDown(e, "next");
                }}
              />
            ) : null}

            {/* 3D Turning Page Leaf Overlay */}
            {flip ? (
              <div className="bm-leaf-wrap" aria-hidden="true">
                <div
                  className={`bm-leaf dir-${flip.direction}${isCoverView ? " is-cover-turn" : ""}`}
                  style={leafStyle}
                >
                  <div className="bm-leaf-face front">
                    <div className="bm-leaf-sheen" />
                    <div className="bm-leaf-label">
                      <div>
                        <small>{spreadMeta(flip.from).eyebrow}</small>
                        <span>{spreadMeta(flip.from).label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bm-leaf-face back">
                    <div className="bm-leaf-sheen" />
                    <div className="bm-leaf-label">
                      <div>
                        <small>{flip.eyebrow}</small>
                        <span>{flip.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Bottom flip controls */}
      <div className="dmenu-nav">
        <button
          type="button"
          className="dmenu-nav-btn"
          disabled={spread <= 0}
          onClick={() => commitTurn(spread - 1)}
        >
          ← Previous
        </button>

        <div className="dmenu-nav-center">
          <div className="dmenu-page-status">{pageLabel}</div>
          <div className="dmenu-hint">Swipe or drag a corner to turn the page</div>
        </div>

        <button
          type="button"
          className="dmenu-nav-btn"
          disabled={spread >= backCoverIndex}
          onClick={() => commitTurn(spread + 1)}
        >
          {spread === 0 ? "Open →" : "Next →"}
        </button>
      </div>
    </div>
  );
}
