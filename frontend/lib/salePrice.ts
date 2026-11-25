export function suggestListPrice(meeshoPrice: string) {
  const cost = Number(meeshoPrice);
  if (!(cost > 0)) return "";
  return String(Math.round(cost * 2));
}

export function suggestCustomerPrice(meeshoPrice: string, listPrice: string) {
  const cost = Number(meeshoPrice);
  const list = Number(listPrice);
  if (!(cost > 0) || !(list > cost)) return "";
  const target = Math.round(cost * 1.5);
  const sale = Math.min(Math.floor(list) - 1, Math.max(Math.floor(cost) + 1, target));
  if (!(sale > cost) || !(sale < list)) return "";
  return String(sale);
}

export function driveImageUrl(value: string) {
  const trimmed = value.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (host === "drive.google.com" || host === "docs.google.com") {
    const fromPath = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
    const id = fromPath || url.searchParams.get("id");
    return id ? `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}` : null;
  }
  if (host.endsWith("googleusercontent.com")) return trimmed;
  return null;
}
