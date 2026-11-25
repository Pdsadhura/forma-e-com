"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/types";
import { ApiError, apiFetch } from "@/lib/api";
import { driveImageUrl, suggestCustomerPrice, suggestListPrice } from "@/lib/salePrice";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";
import { SPEC_LABELS, specRecord } from "@/lib/specs";
import type { Product } from "@/lib/types";

type ImageDraft = { url: string; alt: string };

const blank = {
  name: "",
  slug: "",
  description: "",
  price: "",
  salePrice: "",
  stockQuantity: "0",
  status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  category: "",
  featured: false,
  meeshoProductId: "",
  pid: "",
  meeshoUrl: "",
  meeshoPrice: "",
  sizes: "",
};

export function ProductForm({ id }: { id?: string }) {
  const router = useRouter();
  const [form, setForm] = useState(blank);
  const [images, setImages] = useState<ImageDraft[]>([]);
  const [specs, setSpecs] = useState<Record<string, string>>({});
  const [listingText, setListingText] = useState("");
  const [urlDraft, setUrlDraft] = useState("");
  const [customPrice, setCustomPrice] = useState(false);
  const [customSale, setCustomSale] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<{ data: Product }>(`/api/admin/products/${id}`).then((result) => {
      const product = result.data;
      setForm({
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        salePrice: product.salePrice || "",
        stockQuantity: String(product.stockQuantity),
        status: product.status || "ACTIVE",
        category: product.category || "",
        featured: product.featured,
        meeshoProductId: product.meeshoProductId || "",
        pid: product.pid || "",
        meeshoUrl: product.meeshoUrl || "",
        meeshoPrice: product.meeshoPrice || "",
        sizes: (product.sizes || []).join(", "),
      });
      setSpecs(specRecord(product.specifications || []));
      const listAuto = suggestListPrice(product.meeshoPrice || "");
      const saleAuto = suggestCustomerPrice(product.meeshoPrice || "", product.price);
      setCustomPrice(Boolean(product.price) && Number(product.price) !== Number(listAuto));
      setCustomSale(Boolean(product.salePrice) && Number(product.salePrice) !== Number(saleAuto));
      setImages(product.images.map((image) => ({ url: image.url, alt: image.alt || "" })));
    }).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load product"));
  }, [id]);

  function set<K extends keyof typeof blank>(key: K, value: (typeof blank)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function upload(file: File) {
    setError("");
    const body = new FormData();
    body.append("file", file);
    const response = await fetch(`${API_URL}/api/admin/uploads`, { method: "POST", credentials: "include", body });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error?.message || "Upload failed");
      return;
    }
    setImages((current) => current.some((image) => image.url === payload.data.url) ? current : [...current, { url: payload.data.url, alt: form.name }]);
    if (fileInput.current) fileInput.current.value = "";
  }

  function addImageUrl() {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    const resolved = driveImageUrl(trimmed) || trimmed;
    const pid = trimmed.match(/images\.meesho\.com\/images\/products\/(\d{4,20})\b/i)?.[1];
    setForm((current) => ({ ...current, pid: current.pid || pid || "" }));
    setImages((current) => current.some((image) => image.url === resolved) ? current : [...current, { url: resolved, alt: form.name }]);
    setUrlDraft("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      price: (customPrice ? form.price : suggestListPrice(form.meeshoPrice)) || form.price,
      salePrice: (customSale ? form.salePrice : suggestCustomerPrice(form.meeshoPrice, customPrice ? form.price : (suggestListPrice(form.meeshoPrice) || form.price))) || null,
      stockQuantity: Number(form.stockQuantity),
      category: form.category || null,
      slug: form.slug || undefined,
      meeshoProductId: form.meeshoProductId || null,
      pid: form.pid || null,
      meeshoUrl: form.meeshoUrl || null,
      meeshoPrice: form.meeshoPrice || null,
      sizes: form.sizes.split(",").map((size) => size.trim()).filter(Boolean),
      specifications: SPEC_LABELS.flatMap((label) => {
        const value = specs[label]?.trim();
        return value ? [{ label, value }] : [];
      }),
      images,
    };
    try {
      if (id) await apiFetch(`/api/admin/products/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      else await apiFetch("/api/admin/products", { method: "POST", body: JSON.stringify(payload) });
      router.push("/admin/products");
      router.refresh();
    } catch (caught) {
      const apiError = caught as ApiError;
      setError(apiError.details?.map((detail) => detail.message).join(". ") || apiError.message);
      setSaving(false);
    }
  }

  async function fillFromListing() {
    setError("");
    try {
      const result = await apiFetch<{ data: { name: string; description: string; category: string | null; pid: string | null; specifications: Array<{ label: string; value: string }> } }>("/api/admin/products/parse", {
        method: "POST",
        body: JSON.stringify({ text: listingText }),
      });
      const parsed = result.data;
      if (!parsed.name && parsed.specifications.length === 0) {
        setError("No product details were found. Paste the Meesho text that includes lines like Fabric: Wool.");
        return;
      }
      setForm((current) => ({
        ...current,
        name: parsed.name || current.name,
        description: parsed.description || current.description,
        category: current.category || parsed.category || "",
        pid: current.pid || parsed.pid || "",
      }));
      setSpecs((current) => ({ ...current, ...specRecord(parsed.specifications) }));
    } catch (caught) {
      const apiError = caught as ApiError;
      setError(apiError.message || "Could not read that listing");
    }
  }

  function onMeeshoUrl(value: string) {
    const match = value.match(/\/p\/([A-Za-z0-9_-]+)/);
    setForm((current) => ({
      ...current,
      meeshoUrl: value,
      meeshoProductId: current.meeshoProductId || match?.[1] || "",
    }));
  }

  const activeList = customPrice ? form.price : (suggestListPrice(form.meeshoPrice) || form.price);
  const activeSale = customSale ? form.salePrice : suggestCustomerPrice(form.meeshoPrice, activeList);
  const selling = Number(activeSale || activeList);
  const supplier = Number(form.meeshoPrice);
  const margin = selling > 0 && supplier > 0 && selling > supplier ? (selling - supplier).toFixed(2) : "";

  return (
    <form onSubmit={save} className="space-y-4 rounded-3xl bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className={labelClass}>Name</span><input className={inputClass} required value={form.name} onChange={(event) => set("name", event.target.value)} /></label>
        <label><span className={labelClass}>Slug</span><input className={inputClass} value={form.slug} onChange={(event) => set("slug", event.target.value)} placeholder="Generated from the name if empty" /></label>
        <label className="sm:col-span-2"><span className={labelClass}>Paste Meesho details</span><textarea className={inputClass} rows={6} value={listingText} onChange={(event) => setListingText(event.target.value)} placeholder={"Name: Winter Woollen Double Bedsheet\nFabric: Wool\nSize: Double Queen\nNo. Of Pillow Covers: 2"} /></label>
        <div className="sm:col-span-2"><button type="button" className="rounded-full border border-stone-300 px-4 py-2 text-sm" onClick={fillFromListing}>Fill common fields</button></div>
        <label className="sm:col-span-2"><span className={labelClass}>Description</span><textarea className={inputClass} required rows={4} value={form.description} onChange={(event) => set("description", event.target.value)} /></label>
        <label className="sm:col-span-2"><span className={labelClass}>Meesho product link</span><input className={inputClass} value={form.meeshoUrl} onChange={(event) => onMeeshoUrl(event.target.value)} placeholder="https://www.meesho.com/product/p/abc123" /></label>
        <label><span className={labelClass}>Meesho product ID</span><input className={inputClass} value={form.meeshoProductId} onChange={(event) => set("meeshoProductId", event.target.value)} placeholder="The ID after /p/" /></label>
        <label><span className={labelClass}>PID</span><input className={inputClass} value={form.pid} onChange={(event) => set("pid", event.target.value)} placeholder="Numeric ID, such as 439688883" /></label>
        <label className="sm:col-span-2"><span className={labelClass}>Meesho price (what you pay)</span><input className={inputClass} value={form.meeshoPrice} onChange={(event) => set("meeshoPrice", event.target.value)} placeholder="246" /></label>
        <div>
          <span className={labelClass}>Selling price (INR)</span>
          <div className="mb-2 flex gap-2">
            <button type="button" className={customPrice ? "rounded-full border border-stone-300 px-4 py-2 text-sm" : "rounded-full bg-emerald-950 px-4 py-2 text-sm text-white"} onClick={() => setCustomPrice(false)}>Auto</button>
            <button type="button" className={customPrice ? "rounded-full bg-emerald-950 px-4 py-2 text-sm text-white" : "rounded-full border border-stone-300 px-4 py-2 text-sm"} onClick={() => { set("price", suggestListPrice(form.meeshoPrice) || form.price); setCustomPrice(true); }}>Custom</button>
          </div>
          <input className={`${inputClass} ${customPrice ? "" : "bg-stone-50"}`} required readOnly={!customPrice} value={activeList} onChange={(event) => set("price", event.target.value)} />
        </div>
        <div>
          <span className={labelClass}>Price customers pay (INR)</span>
          <div className="mb-2 flex gap-2">
            <button type="button" className={customSale ? "rounded-full border border-stone-300 px-4 py-2 text-sm" : "rounded-full bg-emerald-950 px-4 py-2 text-sm text-white"} onClick={() => setCustomSale(false)}>Auto</button>
            <button type="button" className={customSale ? "rounded-full bg-emerald-950 px-4 py-2 text-sm text-white" : "rounded-full border border-stone-300 px-4 py-2 text-sm"} onClick={() => { set("salePrice", suggestCustomerPrice(form.meeshoPrice, activeList) || form.salePrice); setCustomSale(true); }}>Custom</button>
          </div>
          <input className={`${inputClass} ${customSale ? "" : "bg-stone-50"}`} readOnly={!customSale} value={activeSale} onChange={(event) => set("salePrice", event.target.value)} />
        </div>
        <p className="text-sm leading-6 text-stone-600 sm:col-span-2">From the Meesho price, Auto sets the selling price at double and the customer price at one and a half times. Both stay above what you pay.{margin ? ` You keep ₹${margin} on each sale.` : ""} Choose Custom to type either price yourself.</p>
        <label><span className={labelClass}>Choices for the customer</span><input className={inputClass} value={form.sizes} onChange={(event) => set("sizes", event.target.value)} placeholder="Only when they must pick, such as S, M, L" /></label>
        <label><span className={labelClass}>Category</span><input className={inputClass} value={form.category} onChange={(event) => set("category", event.target.value)} placeholder="Kurtis, Sarees, Home" /></label>
        <label><span className={labelClass}>Stock quantity</span><input className={inputClass} required type="number" min={0} value={form.stockQuantity} onChange={(event) => set("stockQuantity", event.target.value)} /></label>
        <label><span className={labelClass}>Website</span>
          <select className={inputClass} value={form.status} onChange={(event) => set("status", event.target.value as "ACTIVE" | "INACTIVE")}>
            <option value="ACTIVE">Live</option>
            <option value="INACTIVE">Hidden</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.featured} onChange={(event) => set("featured", event.target.checked)} /> Featured on the home page</label>
        <p className="text-sm leading-6 text-stone-600 sm:col-span-2">Live products appear in the shop. Hidden products stay in admin only. Tick Featured to also show a product on the home page.</p>
      </div>
      <div>
        <p className={labelClass}>Product details</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {SPEC_LABELS.map((label) => (
            <label key={label}>
              <span className={labelClass}>{label}</span>
              <input className={inputClass} value={specs[label] || ""} onChange={(event) => setSpecs((current) => ({ ...current, [label]: event.target.value }))} />
            </label>
          ))}
        </div>
        <p className="mt-3 text-sm leading-6 text-stone-600">These are the same details on every listing. Leave a field blank when that product does not have it. A single size such as Double Queen stays here, and it is copied onto the order.</p>
      </div>
      <p className="text-sm leading-6 text-stone-600">Live products appear on the website at your price. After a customer pays, you get an email with these details, the Meesho product ID, and the full address.</p>
      <div>
        <p className={labelClass}>Images</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className={inputClass} placeholder="Image URL or Google Drive link" value={urlDraft} onChange={(event) => setUrlDraft(event.target.value)} />
          <button type="button" className="rounded-full border border-stone-300 px-4 py-2 text-sm" onClick={addImageUrl}>Add URL</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="rounded-full border border-stone-300 px-4 py-2 text-sm" onClick={() => fileInput.current?.click()}>Upload from this computer</button>
          <input ref={fileInput} className="hidden" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file); }} />
        </div>
        <p className="mt-2 text-sm leading-6 text-stone-600">Paste a Meesho image link or a Google Drive share link. The file button also opens Google Drive if it is installed on this computer. A Drive file must be shared as anyone with the link.</p>
        <ul className="mt-3 space-y-2">
          {images.map((image) => (
            <li key={image.url} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{image.url}</span>
              <button type="button" className="text-rose-800" onClick={() => setImages((current) => current.filter((item) => item.url !== image.url))}>Remove</button>
            </li>
          ))}
        </ul>
      </div>
      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p> : null}
      <button className={buttonClass} disabled={saving} type="submit">{saving ? "Saving…" : "Save product"}</button>
    </form>
  );
}
