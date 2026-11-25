import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";
import { log } from "../lib/logger.js";

const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/avif", "avif"],
]);
const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadProductImage(file) {
  if (!file?.buffer?.length) throw new AppError(400, "FILE_REQUIRED", "Choose an image to upload");
  const extension = ALLOWED.get(file.mimetype);
  if (!extension) {
    throw new AppError(400, "INVALID_FILE_TYPE", "Upload a JPEG, PNG, WebP, GIF, or AVIF image");
  }
  if (file.size > MAX_BYTES) throw new AppError(400, "FILE_TOO_LARGE", "Images must be 5 MB or smaller");
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new AppError(
      503,
      "STORAGE_NOT_CONFIGURED",
      "Image upload needs Supabase Storage. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET. In the Supabase dashboard create a public bucket named product-images (Storage → New bucket). You can still save a product by pasting an HTTPS image URL.",
    );
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const path = `products/${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${extension}`;
  const { error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });
  if (error) {
    log("error", "image upload failed", { message: error.message });
    throw new AppError(502, "UPLOAD_FAILED", "The image could not be uploaded. Check the bucket name and service role key.");
  }
  const { data } = supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
