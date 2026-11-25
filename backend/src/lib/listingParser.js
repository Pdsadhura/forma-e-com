export const SPEC_LABELS = [
  "Fabric",
  "Type",
  "Quality",
  "Print or Pattern Type",
  "No. of Pillow Covers",
  "Brand",
  "Ideal For",
  "Ideal Season",
  "Occasion Type",
  "Thread Count",
  "Size",
  "Pillow Cover Size",
  "Net Quantity",
  "Country of Origin",
];

const TOKENS = [
  { label: "Print or Pattern Type", source: "Print or Pattern Type" },
  { label: "No. of Pillow Covers", source: "No\\.?\\s*Of Pillow Covers?" },
  { label: "Country of Origin", source: "Country of Origin" },
  { label: "Pillow Cover Size", source: "Pillow Cover Size" },
  { label: "Net Quantity", source: "Net Quantity(?:\\s*\\(N\\))?" },
  { label: "Occasion Type", source: "Occas+ion Type" },
  { label: "Ideal Season", source: "Ideal Season" },
  { label: "Thread Count", source: "Thread Count" },
  { label: "Ideal For", source: "Ideal For" },
  { label: "Quality", source: "Quality" },
  { label: "Fabric", source: "Fabric" },
  { label: "Brand", source: "Brand" },
  { label: "Type", source: "Type" },
  { label: "Size", source: "Size" },
  { label: "Name", source: "Name" },
];

const TOKEN_PATTERN = new RegExp(`(?:^|(?<=[\\s.]))(${TOKENS.map((token) => token.source).join("|")}):\\s*`, "gi");

export function canonicalSpecLabel(label) {
  const raw = String(label || "").replace(/\s+/g, " ").trim();
  if (!raw) return null;
  const match = TOKENS.find((token) => new RegExp(`^${token.source}$`, "i").test(raw));
  return match?.label || null;
}

export function cleanSpecifications(items) {
  const values = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const label = canonicalSpecLabel(item?.label);
    const value = cleanValue(item?.value);
    if (!label || !value || values.has(label)) continue;
    values.set(label, value);
  }
  return SPEC_LABELS.filter((label) => values.has(label)).map((label) => ({
    label,
    value: values.get(label),
  }));
}

export function specificationValue(product, label) {
  const specs = cleanSpecifications(product?.specifications);
  return specs.find((item) => item.label === label)?.value || null;
}

export function parseListing(text) {
  const flat = String(text || "").replace(/\s+/g, " ").trim();
  const matches = [...flat.matchAll(TOKEN_PATTERN)];
  const secondName = matches.filter((match) => canonicalSpecLabel(match[1]) === "Name")[1];
  const limit = secondName ? secondName.index : flat.length;
  const blockMatches = matches.filter((match) => match.index < limit);
  const values = new Map();
  let fullName = "";

  for (let index = 0; index < blockMatches.length; index += 1) {
    const label = canonicalSpecLabel(blockMatches[index][1]);
    const start = blockMatches[index].index + blockMatches[index][0].length;
    const stop = index + 1 < blockMatches.length ? blockMatches[index + 1].index : limit;
    const value = cleanValue(flat.slice(start, stop));
    if (!label || !value) continue;
    if (label === "Name") {
      if (!fullName) fullName = value;
      continue;
    }
    if (!values.has(label)) values.set(label, value);
  }

  if (!fullName && blockMatches[0]) {
    const lead = cleanValue(flat.slice(0, blockMatches[0].index));
    if (lead) fullName = lead;
  }

  if (!values.has("Pillow Cover Size") && fullName) {
    const pillow = fullName.match(/pillow cover size\s+(\d+\s*[*x×]\s*\d+)/i);
    if (pillow) values.set("Pillow Cover Size", pillow[1].replace(/\s/g, ""));
  }

  if (!values.has("Country of Origin")) {
    const origin = flat.match(/Country of Origin:\s*([A-Za-z][A-Za-z ]{1,40})/i);
    if (origin) values.set("Country of Origin", cleanValue(origin[1]));
  }

  const specifications = SPEC_LABELS.filter((label) => values.has(label)).map((label) => ({
    label,
    value: values.get(label),
  }));
  const type = values.get("Type") || "";
  return {
    name: clip(fullName, 160),
    description: clip(fullName, 5000),
    category: /sheet/i.test(type) ? "Bedsheets" : null,
    pid: extractPid(flat.slice(0, limit)),
    specifications,
  };
}

export function extractPid(text) {
  const source = String(text || "");
  const labeled = source.match(/(?:^|[\s.])(?:PID|Product\s*ID)\s*[:#-]?\s*(\d{4,20})\b/i);
  if (labeled) return labeled[1];
  const image = source.match(/images\.meesho\.com\/images\/products\/(\d{4,20})\b/i);
  return image?.[1] || null;
}

function cleanValue(value) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const [first] = normalized.split(/\.\s+(?=[A-Z0-9/])/);
  return first.replace(/[.\s]+$/g, "").trim().slice(0, 200);
}

function clip(value, max) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trim()}…`;
}
