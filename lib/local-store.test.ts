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
  localCreateItem,
  localDeleteCategory,
  localDeleteItem,
  localDeleteReservation,
  localListReservations,
  localPurgeOldReservations,
  localReadMenuData,
  localSaveReservation,
  localUpdateCategory,
  localUpdateItem,
  localUpdateReservation,
} from "./local-store";

async function run() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "blackrose-local-test-"));
  process.env.LOCAL_DATA_DIR = dir;

  try {
    // 1. Auto-seeds the full Black Rose menu from content/blackrose-menu.json
    const seeded = await localReadMenuData();
    assert.equal(seeded.categories.length, 16, "should seed 16 Black Rose chapters");
    assert.equal(seeded.items.length, 169, "should seed 169 Black Rose items");

    const singleMalt = seeded.categories.find((c) => c.name === "Single Malt Whisky");
    assert.ok(singleMalt, "Single Malt Whisky chapter should exist");
    assert.equal(singleMalt.price_label, "Shot");
    assert.equal(singleMalt.secondary_price_label, "Bottle");

    const glenfiddich18 = seeded.items.find((i) => i.name === "Glenfiddich 18yr (70cl)");
    assert.ok(glenfiddich18, "Glenfiddich 18yr should be seeded");
    assert.equal(glenfiddich18.price_cents, 302000, "shot price should be 3,020 ETB");
    assert.equal(glenfiddich18.secondary_price_cents, 5654000, "bottle price should be 56,540 ETB");

    const cocktails = seeded.categories.find((c) => c.name === "Cocktails");
    assert.ok(cocktails, "Cocktails chapter should exist");
    const blackRose = seeded.items.find(
      (i) => i.category_id === cocktails.id && i.name === "Black Rose" && i.is_signature === true,
    );
    assert.ok(blackRose, "Black Rose signature cocktail should be seeded in Cocktails");
    assert.equal(blackRose.price_cents, 44500, "Black Rose price should be 445 ETB");

    const happyHour = seeded.categories.find(
      (c) => c.name === "Friday Happy Hour — Cocktails & Kitchen",
    );
    assert.ok(happyHour, "Friday Happy Hour chapter should exist");
    const happyBlackRose = seeded.items.find(
      (i) => i.category_id === happyHour.id && i.name === "Black Rose",
    );
    assert.ok(happyBlackRose, "Black Rose should appear on Friday Happy Hour");
    assert.equal(happyBlackRose.price_cents, 35600, "Happy Hour Black Rose should be 356 ETB");

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
      image_url: "/img/room.jpg",
      sort_order: 200,
      is_active: true,
    });
    assert.equal(cat.price_label, "Glass");
    assert.equal(cat.secondary_price_label, "Bottle");
    assert.equal(cat.image_url, "/img/room.jpg");

    const updatedCat = await localUpdateCategory(cat.id, {
      name: "Reserve Cellar",
      is_active: false,
    });
    assert.equal(updatedCat?.name, "Reserve Cellar");
    assert.equal(updatedCat?.is_active, false);

    // 3. Create dual-price item + enforce case-insensitive unique (category_id, name)
    const wine = await localCreateItem({
      category_id: cat.id,
      name: "Reserve Syrah",
      description: "Dry red",
      price_cents: 85000,
      secondary_price_cents: 420000,
      price_note: "",
      badge: "Cellar",
      is_signature: false,
      is_available: true,
      sort_order: 10,
    });
    assert.equal(wine.secondary_price_cents, 420000);

    await assert.rejects(
      () =>
        localCreateItem({
          category_id: cat.id,
          name: "reserve syrah",
          description: "Duplicate",
          price_cents: 85000,
          secondary_price_cents: 420000,
          price_note: "",
          badge: "",
          is_signature: false,
          is_available: true,
          sort_order: 20,
        }),
      /23505/,
      "duplicate name in same category should fail with 23505",
    );

    const hidden = await localUpdateItem(wine.id, {
      is_available: false,
      secondary_price_cents: 450000,
    });
    assert.equal(hidden?.is_available, false);
    assert.equal(hidden?.secondary_price_cents, 450000);

    // Deleting category keeps item as uncategorised (category_id = null)
    await localDeleteCategory(cat.id);
    const afterCatDelete = await localReadMenuData();
    const orphaned = afterCatDelete.items.find((i) => i.id === wine.id);
    assert.ok(orphaned, "item should survive category deletion");
    assert.equal(orphaned.category_id, null, "item should become uncategorised");

    await localDeleteItem(wine.id);
    const afterItemDelete = await localReadMenuData();
    assert.equal(
      afterItemDelete.items.find((i) => i.id === wine.id),
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

    console.log("all local-store cases pass");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
