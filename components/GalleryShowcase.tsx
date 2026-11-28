"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { GalleryPhoto, SocialLink, SocialPost } from "@/lib/gallery";

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  tripadvisor: "Tripadvisor",
  whatsapp: "WhatsApp",
  other: "Social",
};

function PlatformIcon({ platform }: { platform: string }) {
  switch (platform) {
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.6V3.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V10H7.8v3h2.5v8h3.2z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M16.6 5.8A4.4 4.4 0 0 1 15.5 3h-3v11.7a2.5 2.5 0 1 1-1.8-2.4V9.2a5.5 5.5 0 1 0 4.8 5.5V9.1a7.3 7.3 0 0 0 4.3 1.4V7.6a4.4 4.4 0 0 1-3.2-1.8z" />
        </svg>
      );
    case "tripadvisor":
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <circle cx="8" cy="13" r="3.5" />
          <circle cx="16" cy="13" r="3.5" />
          <circle cx="8" cy="13" r="1" fill="currentColor" stroke="none" />
          <circle cx="16" cy="13" r="1" fill="currentColor" stroke="none" />
          <path d="M4 9.5c2.5-1.6 13.5-1.6 16 0" />
          <path d="M12 16l-1.5 2 1.5 1 1.5-1-1.5-2z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3.6 9h16.8M3.6 15h16.8M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18" />
        </svg>
      );
  }
}

export default function GalleryShowcase({
  photos,
  socials,
  posts,
}: {
  photos: GalleryPhoto[];
  socials: SocialLink[];
  posts: SocialPost[];
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (activeIndex === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveIndex(null);
      if (e.key === "ArrowRight") {
        setActiveIndex((i) => (i === null ? null : (i + 1) % photos.length));
      }
      if (e.key === "ArrowLeft") {
        setActiveIndex((i) =>
          i === null ? null : (i - 1 + photos.length) % photos.length,
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [activeIndex, photos.length]);

  const activePhoto = activeIndex !== null ? photos[activeIndex] : null;

  return (
    <>
      {/* ==================== REAL VENUE PHOTOGRAPHY ==================== */}
      <section className="sec page-top">
        <div className="wrap">
          <p className="eyebrow rv">Gallery</p>
          <h1 className="page-title rv">
            Inside <em>Suite 201</em>.
          </h1>
          <p className="lede rv" style={{ marginBottom: 34 }}>
            Velvet chairs, terracotta walls, Turkish mosaic lamps, and candles on every table — photographed inside
            Black Rose Lounge on Djibouti Street. Tap any frame to view full screen.
          </p>

          {photos.length === 0 ? (
            <p className="note rv">
              No gallery photographs are currently published. Add photos from the Admin Gallery tab.
            </p>
          ) : (
            <div className="gal-wall">
              {photos.map((photo, idx) => (
                <button
                  key={photo.id}
                  type="button"
                  className={`frame gal-tile span-${photo.span} rv`}
                  style={{ transitionDelay: `${Math.min(idx * 0.06, 0.36)}s` }}
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`View photograph: ${photo.title}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.image_url}
                    alt={photo.alt || photo.title}
                    loading={idx < 2 ? "eager" : "lazy"}
                  />
                  <span className="cap">
                    <span>{photo.title}</span>
                    {photo.tag ? <b>{photo.tag}</b> : null}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ==================== SOCIALS & HIGHLIGHTS ==================== */}
      <section className="sec" id="socials" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <p className="eyebrow rv">Socials &amp; Dispatches</p>
          <h2 className="rv" style={{ maxWidth: "24ch" }}>
            Evenings, pours &amp; updates from <em>the lounge</em>.
          </h2>
          <p className="lede rv" style={{ marginBottom: 28 }}>
            Follow Black Rose for guest DJ sets, Friday Happy Hour announcements, and snapshots from the room.
          </p>

          {socials.length > 0 ? (
            <div className="social-pills rv">
              {socials.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-pill"
                >
                  <span className="social-ico">
                    <PlatformIcon platform={s.platform} />
                  </span>
                  <span className="social-meta">
                    <b>{s.label}</b>
                    {s.handle ? <small>{s.handle}</small> : null}
                  </span>
                  <span className="arw" aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          ) : null}

          {posts.length > 0 ? (
            <div className="social-grid">
              {posts.map((post, idx) => {
                const isInternal = post.post_url.startsWith("/");
                const cardBody = (
                  <>
                    <div className="social-shot">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={post.image_url} alt={post.caption} loading="lazy" />
                      <span className="social-badge">
                        <PlatformIcon platform={post.platform} />
                        <span>{PLATFORM_LABELS[post.platform] ?? "Social"}</span>
                      </span>
                    </div>
                    <div className="social-body">
                      {post.posted_label ? (
                        <div className="k">{post.posted_label}</div>
                      ) : null}
                      <p>{post.caption}</p>
                      <div className="price">
                        <span>
                          {isInternal ? "Open inside Black Rose" : `View on ${PLATFORM_LABELS[post.platform] ?? "social"}`}
                        </span>
                        <em>{isInternal ? "→" : "↗"}</em>
                      </div>
                    </div>
                  </>
                );

                return isInternal ? (
                  <Link
                    key={post.id}
                    href={post.post_url}
                    className="card social-card rv"
                    style={{ transitionDelay: `${idx * 0.08}s` }}
                  >
                    {cardBody}
                  </Link>
                ) : post.post_url ? (
                  <a
                    key={post.id}
                    href={post.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card social-card rv"
                    style={{ transitionDelay: `${idx * 0.08}s` }}
                  >
                    {cardBody}
                  </a>
                ) : (
                  <article
                    key={post.id}
                    className="card social-card rv"
                    style={{ transitionDelay: `${idx * 0.08}s` }}
                  >
                    {cardBody}
                  </article>
                );
              })}
            </div>
          ) : null}

          <div className="rv" style={{ marginTop: 36, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="btn solid" href="/visit">
              Reserve a table <span className="arw">→</span>
            </Link>
            <Link className="btn" href="/menu">
              Browse the flipbook menu
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== LIGHTBOX ==================== */}
      {activePhoto && activeIndex !== null ? (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={activePhoto.title}
          onClick={() => setActiveIndex(null)}
        >
          <div
            className="lightbox-inner"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null || photos.length <= 1) return;
              const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
              touchStartX.current = null;
              if (Math.abs(dx) > 45) {
                setActiveIndex(
                  dx < 0
                    ? (activeIndex + 1) % photos.length
                    : (activeIndex - 1 + photos.length) % photos.length,
                );
              }
            }}
          >
            <button
              type="button"
              className="lightbox-close"
              onClick={() => setActiveIndex(null)}
              aria-label="Close photograph"
            >
              ✕
            </button>
            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  className="lightbox-nav prev"
                  onClick={() =>
                    setActiveIndex((activeIndex - 1 + photos.length) % photos.length)
                  }
                  aria-label="Previous photograph"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="lightbox-nav next"
                  onClick={() => setActiveIndex((activeIndex + 1) % photos.length)}
                  aria-label="Next photograph"
                >
                  ›
                </button>
              </>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activePhoto.image_url} alt={activePhoto.alt || activePhoto.title} />
            <div className="lightbox-cap">
              <span>
                <b>{activePhoto.title}</b>
                {activePhoto.tag ? ` · ${activePhoto.tag}` : ""}
              </span>
              <small>
                {activeIndex + 1} / {photos.length}
              </small>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
