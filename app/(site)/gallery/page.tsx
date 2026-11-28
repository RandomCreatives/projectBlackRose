import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GalleryShowcase from "@/components/GalleryShowcase";
import { getGallery } from "@/lib/gallery";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gallery & Socials",
  description:
    "Inside Black Rose Lounge — real photographs of Suite 201 on Djibouti Street alongside our latest socials, dispatches, and reviews.",
  alternates: { canonical: "/gallery" },
};

export default async function GalleryPage() {
  const { photos, socials, posts } = await getGallery();

  return (
    <>
      <Header />
      <main id="main">
        <GalleryShowcase photos={photos} socials={socials} posts={posts} />
      </main>
      <Footer />
      <Link className="pill" href="/visit" id="pill">
        Reserve a table
      </Link>
    </>
  );
}
