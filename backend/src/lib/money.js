export function toPaise(value) {
  if (value == null || value === "") return null;
  const raw = typeof value === "object" && typeof value.toFixed === "function"
    ? value.toFixed(2)
    : String(value).trim();
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [whole, frac = ""] = unsigned.split(".");
  if (!/^\d+$/.test(whole) || (frac && !/^\d+$/.test(frac)) || unsigned.split(".").length > 2) {
    throw new Error(`Invalid money value: ${raw}`);
  }
  const paise = BigInt(whole) * 100n + BigInt((frac + "00").slice(0, 2));
  return negative ? -paise : paise;
}

export function formatPaise(paise) {
  const negative = paise < 0n;
  const absolute = negative ? -paise : paise;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${whole.toString()}.${fraction}`;
}

export function paiseToNumber(paise) {
  return Number(formatPaise(paise));
}
