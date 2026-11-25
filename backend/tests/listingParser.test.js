import assert from "node:assert/strict";
import test from "node:test";
import { parseListing } from "../src/lib/listingParser.js";

const polo = `
Winter Woollen Double Bedsheet With 2 Pillow cover (Polo)
Name: Winter Woollen Double Bedsheet With 2 Pillow cover (Polo)
Fabric: Wool
Type: Flat Sheets
Quality: Superfine
Print or Pattern Type: Floral
No. Of Pillow Covers: 2
Ideal For: Adult
Ideal Season: Mild Winter
Occassion Type: Others
Thread Count: 200
Size: Double Queen
Net Quantity (N): 1
`;

const floral = "WOOLLEN DOUBLE BEDSHEET//WARM BEDSHEET FOR DOUBLE BED//BROWN WARM FLORAL BEDSHEET/ bedding set 1+2 with 4 pillow cover size 90*90 Name: WOOLLEN DOUBLE BEDSHEET//WARM BEDSHEET FOR DOUBLE BED//BROWN WARM FLORAL BEDSHEET/ bedding set 1+2 with 4 pillow cover size 90*90 Fabric: Wool Type: Flat Sheets Quality: Superfine Print or Pattern Type: Floral No. Of Pillow Covers: 4 Brand: RPAH CREATIVE Ideal For: Adult Ideal Season: Mild Winter Occassion Type: Others Thread Count: 220 Size: Double Queen Net Quantity (N): 1. WOOLLEN DOUBLE BEDSHEET//WARM BEDSHEET FOR DOUBLE BED//BROWN WARM FLORAL BEDSHEET/ bedding set 1+2 with 2 pillow cover size 90*90 Country of Origin: India";

function value(listing, label) {
  return listing.specifications.find((item) => item.label === label)?.value;
}

test("a labelled bedsheet listing fills the common fields", () => {
  const listing = parseListing(polo);
  assert.equal(listing.name, "Winter Woollen Double Bedsheet With 2 Pillow cover (Polo)");
  assert.equal(listing.category, "Bedsheets");
  assert.equal(value(listing, "Fabric"), "Wool");
  assert.equal(value(listing, "Type"), "Flat Sheets");
  assert.equal(value(listing, "Quality"), "Superfine");
  assert.equal(value(listing, "Print or Pattern Type"), "Floral");
  assert.equal(value(listing, "No. of Pillow Covers"), "2");
  assert.equal(value(listing, "Ideal For"), "Adult");
  assert.equal(value(listing, "Ideal Season"), "Mild Winter");
  assert.equal(value(listing, "Occasion Type"), "Others");
  assert.equal(value(listing, "Thread Count"), "200");
  assert.equal(value(listing, "Size"), "Double Queen");
  assert.equal(value(listing, "Net Quantity"), "1");
  assert.equal(value(listing, "Brand"), undefined);
  assert.equal(listing.pid, null);
});

test("a PID in the first listing is kept and a later product PID is ignored", () => {
  const listing = parseListing(`${polo}\nPID: 439688883\n${floral}\nPID: 111111111`);
  assert.equal(listing.pid, "439688883");
});

test("a Meesho image address supplies the PID", () => {
  const listing = parseListing(`${polo}\nhttps://images.meesho.com/images/products/439688883/rv9pj_512.avif`);
  assert.equal(listing.pid, "439688883");
});

test("a pasted Meesho paragraph keeps the first product and the pillow size", () => {
  const listing = parseListing(`${polo}\n${floral}`);
  assert.equal(listing.name, "Winter Woollen Double Bedsheet With 2 Pillow cover (Polo)");
  assert.equal(value(listing, "No. of Pillow Covers"), "2");
  assert.equal(value(listing, "Thread Count"), "200");
  assert.equal(value(listing, "Country of Origin"), "India");
});

test("a run-on listing keeps brand, pillow size, and stops before the next title", () => {
  const listing = parseListing(floral);
  assert.match(listing.name, /^WOOLLEN DOUBLE BEDSHEET/);
  assert.ok(listing.name.length <= 160);
  assert.equal(value(listing, "No. of Pillow Covers"), "4");
  assert.equal(value(listing, "Brand"), "RPAH CREATIVE");
  assert.equal(value(listing, "Thread Count"), "220");
  assert.equal(value(listing, "Pillow Cover Size"), "90*90");
  assert.equal(value(listing, "Net Quantity"), "1");
  assert.equal(value(listing, "Country of Origin"), "India");
  assert.equal(value(listing, "Size"), "Double Queen");
});
