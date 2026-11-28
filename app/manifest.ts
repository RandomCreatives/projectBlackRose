import type { MetadataRoute } from "next";
import { venue } from "@/content/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: venue.name,
    short_name: "Black Rose",
    description:
      "An after-dark cocktail salon in Suite 201 on Djibouti Street, Addis Ababa. Browse our interactive flipbook menu, weekly nights, gallery, and reserve a table.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#150F0A",
    theme_color: "#150F0A",
    lang: "en",
    categories: ["food", "lifestyle", "entertainment"],
    icons: [
      {
        src: "/favicon/favicon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon/favicon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/favicon/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Digital Menu",
        short_name: "Menu",
        description: "Open the 125-item interactive flipbook menu",
        url: "/menu",
        icons: [{ src: "/favicon/favicon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Reserve a Table",
        short_name: "Reserve",
        description: "Hold a table for the evening in Suite 201",
        url: "/visit",
        icons: [{ src: "/favicon/favicon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "The Week",
        short_name: "The Week",
        description: "Weekly nights, Friday Happy Hour & special sessions",
        url: "/week",
        icons: [{ src: "/favicon/favicon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Gallery & Socials",
        short_name: "Gallery",
        description: "Photos from Suite 201 & latest dispatches",
        url: "/gallery",
        icons: [{ src: "/favicon/favicon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
