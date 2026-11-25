import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAttribution } from "../src/services/orderService.js";
import { orderSchema } from "../src/validators/schemas.js";
import { hashPassword } from "../src/services/authService.js";
import { authorizeAdmin, signToken } from "../src/middleware/auth.js";
import { ADMIN_COOKIE } from "../src/lib/cookies.js";
import { uploadProductImage } from "../src/services/storageService.js";

const secret = "test-admin-secret-value";

test("checkout validation accepts a complete Indian address and rejects a bad phone", () => {
  const valid = orderSchema.safeParse({
    body: {
      customer: { name: "Asha Menon", email: "Asha@Example.com", phone: "+91 98765 43210" },
      address: {
        house: "12A",
        street: "Palm Road",
        locality: "Indiranagar",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560038",
        landmark: "",
      },
      items: [{ productId: "prod_1", quantity: 2 }],
      attribution: { utmSource: "facebook", utmCampaign: "spring", fbclid: "IwAR123" },
    },
  });
  assert.equal(valid.success, true);
  assert.equal(valid.data.body.customer.email, "asha@example.com");
  assert.equal(valid.data.body.customer.phone, "9876543210");

  const invalid = orderSchema.safeParse({
    body: {
      customer: { name: "A", email: "not-an-email", phone: "12345" },
      address: {
        house: "",
        street: "Road",
        locality: "Area",
        city: "Pune",
        state: "Atlantis",
        pincode: "000111",
      },
      items: [],
    },
  });
  assert.equal(invalid.success, false);
});

test("marketing parameters are trimmed and empty attribution is dropped", () => {
  assert.equal(normalizeAttribution(undefined, {}), null);
  const stored = normalizeAttribution({
    utmSource: " facebook ",
    utmMedium: "paid",
    utmCampaign: "spring-launch",
    utmContent: "video-1",
    utmTerm: "lamp",
    fbclid: "IwAR123",
    eventId: "11111111-1111-1111-1111-111111111111",
    landingPath: "/products/arc-ceramic-table-lamp?fbclid=IwAR123",
  }, { clientIp: "203.0.113.8", userAgent: "Mozilla" });
  assert.equal(stored.utmSource, "facebook");
  assert.equal(stored.utmCampaign, "spring-launch");
  assert.equal(stored.fbclid, "IwAR123");
  assert.equal(stored.clientIp, "203.0.113.8");
});

test("admin sessions require an admin role and a signed cookie", async () => {
  const passwordHash = await hashPassword("correct-password-1", 4);
  assert.equal(typeof passwordHash, "string");
  const token = signToken({ id: "admin-1", role: "ADMIN", email: "admin@forma.local" }, secret);
  const admin = authorizeAdmin(`${ADMIN_COOKIE}=${token}`, secret);
  assert.equal(admin.email, "admin@forma.local");

  const staff = signToken({ id: "staff-1", role: "STAFF", email: "staff@forma.local" }, secret);
  assert.throws(() => authorizeAdmin(`${ADMIN_COOKIE}=${staff}`, secret), /Admin access required/);
  assert.throws(() => authorizeAdmin("", secret), /Sign in required/);
  assert.throws(() => authorizeAdmin(`${ADMIN_COOKIE}=${token}`, "other-admin-secret"), /Sign in required/);
});

test("image uploads reject unsupported files before storage is contacted", async () => {
  await assert.rejects(
    () => uploadProductImage({ buffer: Buffer.from("hello"), mimetype: "text/plain", size: 5 }),
    /JPEG, PNG, WebP, GIF, or AVIF/,
  );
});
