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
] as const;

export type Specification = { label: string; value: string };

export function specRecord(specifications: Specification[] = []) {
  return Object.fromEntries(specifications.map((item) => [item.label, item.value]));
}
