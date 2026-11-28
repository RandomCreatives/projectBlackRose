import type { Metadata, Viewport } from "next";
import "./globals.css";
import { venue, openingHoursSpec } from "@/content/site";
import PwaManager from "@/components/PwaManager";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.blkrose.online";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Black Rose Lounge — an after-dark salon on Djibouti Street",
    template: "%s · Black Rose Lounge",
  },
  description: venue.positioning,
  applicationName: venue.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Black Rose",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  keywords: [
    "Black Rose Lounge",
    "cocktail bar Addis Ababa",
    "Djibouti Street bar",
    "Yegemiya Plaza",
    "lounge Addis Ababa",
    "nightlife Addis Ababa",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: venue.name,
    locale: "en_ET",
    url: "/",
    title: "Black Rose Lounge — Addis Ababa",
    description:
      "Candlelight, a properly made cocktail, and a conversation you can actually hear. Djibouti Street, 2nd floor, open from 5pm.",
    images: [
      {
        url: "/img/og-preview.jpg",
        width: 1200,
        height: 630,
        alt: "Black Rose Lounge — Djibouti Street, Addis Ababa",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/img/og-preview.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon/favicon.ico", sizes: "any" },
      { url: "/favicon/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon/favicon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/favicon/favicon-180.png", sizes: "180x180" }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#150F0A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BarOrPub",
  "@id": `${SITE_URL}/#venue`,
  name: venue.name,
  description: venue.positioning,
  url: SITE_URL,
  image: [`${SITE_URL}/img/room.jpg`, `${SITE_URL}/img/watermark.jpg`],
  telephone: venue.phones.map((p) => p.tel),
  email: venue.email,
  priceRange: "$$",
  servesCuisine: ["Cocktails", "Wine", "Spirits"],
  currenciesAccepted: "ETB",
  smokingAllowed: false,
  address: {
    "@type": "PostalAddress",
    streetAddress: `${venue.address.line1}, ${venue.address.line2}`,
    addressLocality: venue.address.city,
    addressCountry: "ET",
  },
  // NOTE: geo coordinates are deliberately omitted — the plus code is public but the
  // lat/lng pair has not been confirmed against the premises. Add once verified.
  openingHoursSpecification: openingHoursSpec,
  sameAs: venue.socials.map((s) => s.href),
  amenityFeature: [
    { "@type": "LocationFeatureSpecification", name: "Second floor, lift access", value: true },
    { "@type": "LocationFeatureSpecification", name: "Reservations", value: true },
  ],
  // No aggregateRating: the 4.4/133 figure is Google's, not ours, and Google requires
  // first-party reviews in review snippets. Revisit when the owners collect their own.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PwaManager />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
