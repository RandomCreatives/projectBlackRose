"use client";
import { useEffect } from "react";

/** Pointer light, reveal-on-scroll, card spotlight, header state, mobile pill. */
export default function ScrollEffects() {
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* header + reserve pill */
    const hdr = document.getElementById("hdr");
    const pill = document.getElementById("pill");
    const visit = document.getElementById("visit");

    const onScroll = () => {
      const y = window.scrollY;
      hdr?.classList.toggle("scrolled", y > 40);
      if (pill) {
        const near = visit ? visit.getBoundingClientRect().top < window.innerHeight * 0.9 : false;
        pill.classList.toggle("hide", y < 220 || near);
      }
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });

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
        { threshold: 0.14, rootMargin: "0px 0px -7% 0px" },
      );
      els.forEach((el) => io.observe(el));
      document.querySelectorAll<HTMLElement>(".hero .rv").forEach((el) => el.classList.add("in"));
    } else {
      els.forEach((el) => el.classList.add("in"));
    }

    /* hero headline lines */
    requestAnimationFrame(() => {
      document.querySelector(".hero")?.classList.add("ready");
      document.querySelectorAll<HTMLElement>(".hero .line > span").forEach((l, i) => {
        l.style.transitionDelay = `${130 + i * 105}ms`;
      });
    });

    if (reduce) return;

    /* pointer light — rAF lerp */
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
      return () => {
        cancelAnimationFrame(raf);
        removeEventListener("mousemove", move);
        removeEventListener("scroll", onScroll);
      };
    }

    /* hero watermark parallax on desktop */
    const wm = document.querySelector<HTMLElement>(".hero-wm img.wm-wide");
    const parallax = () => {
      if (!wm || !matchMedia("(min-width:981px)").matches) return;
      const y = window.scrollY;
      if (y < innerHeight * 1.1) wm.style.translate = `0 ${y * 0.12}px`;
    };
    addEventListener("scroll", parallax, { passive: true });

    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("scroll", parallax);
    };
  }, []);

  return null;
}
