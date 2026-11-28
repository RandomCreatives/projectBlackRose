"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Pointer light, reveal-on-scroll, card spotlight, header state, mobile pill, parallax. */
export default function ScrollEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isHome = pathname === "/";

    /* header + reserve pill */
    const hdr = document.getElementById("hdr");
    const pill = document.getElementById("pill");
    const visit = document.getElementById("visit");

    const onScroll = () => {
      const y = window.scrollY;
      hdr?.classList.toggle("scrolled", !isHome || y > 40);
      if (pill) {
        const near = visit ? visit.getBoundingClientRect().top < window.innerHeight * 0.9 : false;
        pill.classList.toggle("hide", pathname === "/visit" || y < 220 || near);
      }
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    cleanups.push(() => removeEventListener("scroll", onScroll));

    /* reveal */
    const els = Array.from(document.querySelectorAll<HTMLElement>(".rv"));
    if (reduce) {
      els.forEach((el) => el.classList.add("in"));
    } else if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("in");
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -4% 0px" },
      );
      els.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.96) {
          el.classList.add("in");
        } else {
          io.observe(el);
        }
      });
      document.querySelectorAll<HTMLElement>(".hero .rv").forEach((el) => el.classList.add("in"));
      cleanups.push(() => io.disconnect());
    } else {
      els.forEach((el) => el.classList.add("in"));
    }

    /* hero headline lines */
    const readyFrame = requestAnimationFrame(() => {
      document.querySelector(".hero")?.classList.add("ready");
      document.querySelectorAll<HTMLElement>(".hero .line > span").forEach((l, i) => {
        l.style.transitionDelay = `${130 + i * 105}ms`;
      });
    });
    cleanups.push(() => cancelAnimationFrame(readyFrame));

    if (!reduce) {
      /* pointer light + card spotlight — rAF lerp */
      const glow = document.getElementById("glow");
      if (glow && matchMedia("(pointer: fine)").matches) {
        let tx = innerWidth * 0.6;
        let ty = 200;
        let cx = tx;
        let cy = ty;
        const move = (e: MouseEvent) => {
          tx = e.clientX;
          ty = e.clientY;
          document.body.classList.add("pointer");
        };
        addEventListener("mousemove", move, { passive: true });
        let raf = 0;
        const loop = () => {
          cx += (tx - cx) * 0.12;
          cy += (ty - cy) * 0.12;
          glow.style.setProperty("--mx", `${cx}px`);
          glow.style.setProperty("--my", `${cy}px`);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        cleanups.push(() => {
          cancelAnimationFrame(raf);
          removeEventListener("mousemove", move);
        });

        /* card radial spotlight follows pointer within each card */
        const cards = Array.from(document.querySelectorAll<HTMLElement>(".card"));
        const cardListeners: Array<[HTMLElement, (e: MouseEvent) => void]> = [];
        for (const card of cards) {
          const onCardMove = (e: MouseEvent) => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty("--cx", `${e.clientX - rect.left}px`);
            card.style.setProperty("--cy", `${e.clientY - rect.top}px`);
          };
          card.addEventListener("mousemove", onCardMove, { passive: true });
          cardListeners.push([card, onCardMove]);
        }
        cleanups.push(() => {
          for (const [card, fn] of cardListeners) {
            card.removeEventListener("mousemove", fn);
          }
        });
      }

      /* hero watermark parallax on desktop */
      const wm = document.querySelector<HTMLElement>(".hero-wm img.wm-wide");
      if (wm) {
        const parallax = () => {
          if (!matchMedia("(min-width:981px)").matches) {
            wm.style.translate = "";
            return;
          }
          const y = window.scrollY;
          if (y < innerHeight * 1.1) wm.style.translate = `0 ${y * 0.12}px`;
        };
        addEventListener("scroll", parallax, { passive: true });
        cleanups.push(() => removeEventListener("scroll", parallax));
      }
    }

    return () => {
      for (const fn of cleanups) fn();
    };
  }, [pathname]);

  return null;
}
