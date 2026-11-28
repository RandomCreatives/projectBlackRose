/**
 * Plain-node assertions for the local dev store (menu + bookings).
 * Run: npx tsx lib/local-store.test.ts   (or `npm run test:local`)
 */
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  localCreateCategory,
  localCreateGalleryPhoto,
  localCreateItem,
  localCreateSocialLink,
  localCreateSocialPost,
  localDeleteCategory,
  localDeleteGalleryPhoto,
  localDeleteItem,
  localDeleteReservation,
  localDeleteSocialLink,
  localDeleteSocialPost,
  localListReservations,
  localPurgeOldReservations,
  localReadGallery,
  localReadMenuData,
  localReadUploadedImage,
  localSaveReservation,
  localSaveUploadedImage,
  localUpdateCategory,
  localUpdateGalleryPhoto,
  localUpdateItem,
  localUpdateReservation,
  localUpdateSocialLink,
  localUpdateSocialPost,
} from "./local-store";

async function run() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "blackrose-local-test-"));
  process.env.LOCAL_DATA_DIR = dir;

  try {
    // 1. Auto-seeds the unified 6-chapter, 125-item Black Rose menu from content/blackrose-menu.json
    const seeded = await localReadMenuData();
    assert.equal(seeded.categories.length, 6, "should seed 6 Black Rose chapters");
    assert.equal(seeded.items.length, 125, "should seed 125 unique Black Rose items");

    const cocktails = seeded.categories.find((c) => c.name === "Cocktails");
    assert.ok(cocktails, "Cocktails chapter should exist");
    assert.equal(cocktails.image_url, "/img/menu/chapter-cocktails.jpg");

    const blackRose = seeded.items.find(
      (i) => i.category_id === cocktails.id && i.name === "Black Rose" && i.is_signature === true,
    );
    assert.ok(blackRose, "Black Rose signature cocktail should be seeded");
    assert.equal(blackRose.price_cents, 44500, "Black Rose regular price should be 445 ETB");
    assert.equal(blackRose.happy_hour_price_cents, 35600, "Black Rose Fri HH price should be 356 ETB");

    const wine = seeded.categories.find((c) => c.name === "Wine");
    assert.ok(wine, "Wine chapter should exist");
    const acaciaRows = seeded.items.filter(
      (i) => i.category_id === wine.id && i.name === "Acacia Medium Sweet Red / Rosé",
    );
    assert.equal(
      acaciaRows.length,
      2,
      "same wine in Local wine and By the glass should be two distinct rows",
    );

    const whisky = seeded.categories.find((c) => c.name === "Whisky & Cognac");
    assert.ok(whisky, "Whisky & Cognac chapter should exist");
    assert.equal(whisky.price_label, "Shot");
    assert.equal(whisky.secondary_price_label, "Bottle");
    assert.equal(whisky.image_url, "/img/menu/chapter-whisky.jpg");

    const glenfiddich18 = seeded.items.find((i) => i.name === "Glenfiddich 18");
    assert.ok(glenfiddich18, "Glenfiddich 18 should be seeded");
    assert.equal(glenfiddich18.group_name, "Single malt");
    assert.equal(glenfiddich18.price_cents, 302000, "shot price should be 3,020 ETB");
    assert.equal(glenfiddich18.secondary_price_cents, 5654000, "bottle price should be 56,540 ETB");

    const cheeseSteak = seeded.items.find((i) => i.name === "Cheese Steak");
    assert.ok(cheeseSteak, "Cheese Steak should be seeded");
    assert.equal(cheeseSteak.price_cents, 279500, "Cheese Steak full should be 2,795 ETB");
    assert.equal(cheeseSteak.secondary_price_cents, 147000, "Cheese Steak half should be 1,470 ETB");

    // 2. Create, update, and delete category (orphaning items rather than deleting them)
    const cat = await localCreateCategory({
      name: "Imported Cellar",
      kicker: "By the glass & bottle",
      note: "Poured cold",
      price_label: "Glass",
      secondary_price_label: "Bottle",
      image_url: "/img/menu/chapter-wine.jpg",
      sort_order: 200,
      is_active: true,
    });
    assert.equal(cat.price_label, "Glass");
    assert.equal(cat.secondary_price_label, "Bottle");
    assert.equal(cat.image_url, "/img/menu/chapter-wine.jpg");

    const updatedCat = await localUpdateCategory(cat.id, {
      name: "Reserve Cellar",
      is_active: false,
    });
    assert.equal(updatedCat?.name, "Reserve Cellar");
    assert.equal(updatedCat?.is_active, false);

    // 3. Create dual-price + happy-hour item + enforce unique (category_id, name, group_name)
    const syrahBottle = await localCreateItem({
      category_id: cat.id,
      group_name: "Bottles",
      name: "Reserve Syrah",
      description: "Dry red",
      price_cents: 85000,
      secondary_price_cents: 420000,
      happy_hour_price_cents: 70000,
      price_note: "",
      badge: "Cellar",
      is_signature: false,
      is_available: true,
      sort_order: 10,
    });
    assert.equal(syrahBottle.secondary_price_cents, 420000);
    assert.equal(syrahBottle.happy_hour_price_cents, 70000);

    // Same name in a DIFFERENT group_name is allowed
    const syrahGlass = await localCreateItem({
      category_id: cat.id,
      group_name: "By the glass",
      name: "Reserve Syrah",
      description: "Single glass",
      price_cents: 85000,
      secondary_price_cents: null,
      happy_hour_price_cents: null,
      price_note: "",
      badge: "",
      is_signature: false,
      is_available: true,
      sort_order: 20,
    });
    assert.equal(syrahGlass.group_name, "By the glass");

    // Same name in the SAME group_name fails with 23505
    await assert.rejects(
      () =>
        localCreateItem({
          category_id: cat.id,
          group_name: "bottles",
          name: "reserve syrah",
          description: "Duplicate",
          price_cents: 85000,
          secondary_price_cents: 420000,
          happy_hour_price_cents: null,
          price_note: "",
          badge: "",
          is_signature: false,
          is_available: true,
          sort_order: 30,
        }),
      /23505/,
      "duplicate name in same category + group should fail with 23505",
    );

    const hidden = await localUpdateItem(syrahBottle.id, {
      is_available: false,
      secondary_price_cents: 450000,
    });
    assert.equal(hidden?.is_available, false);
    assert.equal(hidden?.secondary_price_cents, 450000);

    // Deleting category keeps items as uncategorised (category_id = null)
    await localDeleteCategory(cat.id);
    const afterCatDelete = await localReadMenuData();
    const orphaned = afterCatDelete.items.find((i) => i.id === syrahBottle.id);
    assert.ok(orphaned, "item should survive category deletion");
    assert.equal(orphaned.category_id, null, "item should become uncategorised");

    await localDeleteItem(syrahBottle.id);
    await localDeleteItem(syrahGlass.id);
    const afterItemDelete = await localReadMenuData();
    assert.equal(
      afterItemDelete.items.find((i) => i.id === syrahBottle.id),
      undefined,
    );

    // 4. Reservations CRUD + purge
    const now = new Date();
    const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    await localSaveReservation({
      reference: "BR-OLD01",
      created_at: oldDate.toISOString(),
      name: "Old Guest",
      phone: "+251911000001",
      guests: "2 guests",
      night: "Friday",
      time: "Around 7:30pm",
      notes: "",
      status: "requested",
      source: "web",
      handled_at: null,
    });
    await localSaveReservation({
      reference: "BR-NEW01",
      created_at: now.toISOString(),
      name: "Selam Tesfaye",
      phone: "+251911000002",
      guests: "4 guests",
      night: "Thursday — the salon",
      time: "Around 9:00pm",
      notes: "Corner sofa",
      status: "requested",
      source: "web",
      handled_at: null,
    });

    const list = await localListReservations();
    assert.equal(list.length, 2);
    assert.equal(list[0].reference, "BR-NEW01", "newest reservation should appear first");

    await localUpdateReservation("BR-NEW01", {
      status: "confirmed",
      notes: "Confirmed by phone",
      handled_at: now.toISOString(),
    });
    const afterUpdate = await localListReservations();
    assert.equal(afterUpdate[0].status, "confirmed");
    assert.equal(afterUpdate[0].notes, "Confirmed by phone");

    const purged = await localPurgeOldReservations(45);
    assert.equal(purged, 1, "should purge only the 60-day-old reservation");
    assert.equal((await localListReservations()).length, 1);

    await localDeleteReservation("BR-NEW01");
    assert.equal((await localListReservations()).length, 0);

    // 5. Legacy JSONL migration
    const legacyDir = await mkdtemp(path.join(os.tmpdir(), "blackrose-jsonl-test-"));
    try {
      process.env.LOCAL_DATA_DIR = legacyDir;
      await writeFile(
        path.join(legacyDir, "reservations.jsonl"),
        `${JSON.stringify({
          reference: "BR-LEG01",
          created_at: now.toISOString(),
          name: "Legacy Guest",
          phone: "+251911000003",
          guests: "2 guests",
          night: "Tuesday — vinyl",
          time: "Around 7:30pm",
          notes: "",
          source: "web",
          status: "requested",
        })}\n`,
        "utf8",
      );
      const migrated = await localListReservations();
      assert.equal(migrated.length, 1);
      assert.equal(migrated[0].reference, "BR-LEG01");
    } finally {
      await rm(legacyDir, { recursive: true, force: true });
    }

    // 6. Gallery & Socials store + uploaded image lifecycle
    process.env.LOCAL_DATA_DIR = dir;
    const seededGallery = await localReadGallery();
    assert.equal(seededGallery.photos.length, 6, "should seed 6 real Black Rose venue photos");
    assert.equal(seededGallery.socials.length, 2, "should seed 2 verified social profiles");
    assert.equal(seededGallery.posts.length, 3, "should seed 3 social showcase highlights");

    // Upload a valid JPEG buffer + reject invalid data
    const fakeJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9,
    ]);
    const uploadedPath = await localSaveUploadedImage(fakeJpeg);
    assert.match(uploadedPath, /^\/api\/media\/[a-z0-9-]+\.jpg$/);
    const filename = uploadedPath.slice("/api/media/".length);
    const loadedUpload = await localReadUploadedImage(filename);
    assert.ok(loadedUpload, "uploaded image should be readable");
    assert.equal(loadedUpload.contentType, "image/jpeg");
    assert.equal(await localReadUploadedImage("../etc/passwd"), null, "path traversal must return null");
    await assert.rejects(
      () => localSaveUploadedImage(Buffer.from("not-an-image-at-all")),
      /Unsupported image format/,
    );

    // Photo CRUD + automatic upload cleanup on delete
    const createdPhoto = await localCreateGalleryPhoto({
      title: "Bar counter",
      tag: "Night",
      alt: "Bar counter",
      image_url: uploadedPath,
      span: "wide",
      sort_order: 99,
      is_visible: true,
    });
    const updatedPhoto = await localUpdateGalleryPhoto(createdPhoto.id, {
      is_visible: false,
      tag: "Hidden",
    });
    assert.equal(updatedPhoto?.is_visible, false);
    assert.equal(updatedPhoto?.tag, "Hidden");

    await localDeleteGalleryPhoto(createdPhoto.id);
    assert.equal(
      await localReadUploadedImage(filename),
      null,
      "deleting sole photo referencing upload should clean up file",
    );

    // Social link + post CRUD
    const ig = await localCreateSocialLink({
      platform: "instagram",
      label: "Instagram",
      handle: "@blackroselounge.et",
      url: "https://instagram.com/blackroselounge.et",
      sort_order: 30,
      is_visible: true,
    });
    const igUpdated = await localUpdateSocialLink(ig.id, { handle: "@blackroseaddis" });
    assert.equal(igUpdated?.handle, "@blackroseaddis");
    await localDeleteSocialLink(ig.id);

    const post = await localCreateSocialPost({
      platform: "instagram",
      caption: "Jazz night in Suite 201",
      image_url: "/img/gallery/banquette-corner.jpg",
      post_url: "/week",
      posted_label: "This Friday",
      sort_order: 40,
      is_visible: true,
    });
    const postUpdated = await localUpdateSocialPost(post.id, { is_visible: false });
    assert.equal(postUpdated?.is_visible, false);
    await localDeleteSocialPost(post.id);

    const finalGallery = await localReadGallery();
    assert.equal(finalGallery.photos.length, 6);
    assert.equal(finalGallery.socials.length, 2);
    assert.equal(finalGallery.posts.length, 3);

    console.log("all local-store cases pass");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
