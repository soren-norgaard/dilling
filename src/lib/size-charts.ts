/**
 * Standard Dilling size charts per gender.
 * Body measurements in cm — based on standard EU sizing for underwear/wool clothing.
 * Used by: seed.ts (to generate sizeGuide JSON), agent (size recommendations), PDP (fallback).
 */

export type SizeMeasurements = {
  chest?: string;   // Bryst (cm)
  waist?: string;   // Talje (cm)
  hips?: string;    // Hofte (cm)
  height?: string;  // Højde (cm) — for children/baby
};

export type SizeChart = Record<string, SizeMeasurements>;

// Women's EU sizes (34–46)
export const WOMEN_SIZE_CHART: SizeChart = {
  "34": { chest: "78-82", waist: "62-66", hips: "86-90" },
  "36": { chest: "82-86", waist: "66-70", hips: "90-94" },
  "38": { chest: "86-90", waist: "70-74", hips: "94-98" },
  "40": { chest: "90-94", waist: "74-78", hips: "98-102" },
  "42": { chest: "94-98", waist: "78-82", hips: "102-106" },
  "44": { chest: "98-102", waist: "82-86", hips: "106-110" },
  "46": { chest: "102-107", waist: "86-91", hips: "110-115" },
};

// Men's S–XXL
export const MEN_SIZE_CHART: SizeChart = {
  "S":   { chest: "88-92", waist: "76-80", hips: "90-94" },
  "M":   { chest: "96-100", waist: "84-88", hips: "98-102" },
  "L":   { chest: "104-108", waist: "92-96", hips: "106-110" },
  "XL":  { chest: "112-116", waist: "100-104", hips: "112-116" },
  "XXL": { chest: "120-124", waist: "108-112", hips: "118-122" },
};

// Children's sizes by height (80–164 cm)
export const CHILDREN_SIZE_CHART: SizeChart = {
  "80":  { height: "75-80", chest: "49-51", waist: "48-50" },
  "92":  { height: "87-92", chest: "52-54", waist: "50-52" },
  "104": { height: "99-104", chest: "55-57", waist: "52-54" },
  "116": { height: "111-116", chest: "58-60", waist: "54-56" },
  "128": { height: "123-128", chest: "63-65", waist: "57-59" },
  "140": { height: "135-140", chest: "68-70", waist: "60-62" },
  "152": { height: "147-152", chest: "73-76", waist: "63-66" },
  "164": { height: "159-164", chest: "79-83", waist: "67-71" },
};

// Baby sizes by height (50–86 cm)
export const BABY_SIZE_CHART: SizeChart = {
  "50": { height: "48-50" },
  "56": { height: "51-56" },
  "62": { height: "57-62" },
  "68": { height: "63-68" },
  "74": { height: "69-74" },
  "80": { height: "75-80" },
  "86": { height: "81-86" },
};

/** Map gender → default size chart */
export const SIZE_CHARTS: Record<string, SizeChart> = {
  WOMEN: WOMEN_SIZE_CHART,
  MEN: MEN_SIZE_CHART,
  CHILDREN: CHILDREN_SIZE_CHART,
  BABY: BABY_SIZE_CHART,
};

/** Danish labels for measurement fields */
export const MEASUREMENT_LABELS: Record<string, string> = {
  chest: "Bryst",
  waist: "Talje",
  hips: "Hofte",
  height: "Højde",
};

/**
 * Build a size guide JSON object for a product based on its gender and available sizes.
 * Returns null if no chart is available for the gender.
 */
export function buildSizeGuide(
  gender: string,
  sizes: string[],
): SizeChart | null {
  const chart = SIZE_CHARTS[gender];
  if (!chart) return null;

  const guide: SizeChart = {};
  for (const size of sizes) {
    if (chart[size]) {
      guide[size] = chart[size];
    }
  }
  return Object.keys(guide).length > 0 ? guide : null;
}
