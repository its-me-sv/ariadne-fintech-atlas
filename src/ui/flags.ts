// Jurisdiction code to flag mapping. Images are served by flagcdn.com, keyed by lowercase ISO 3166 code.

const ISO: Record<string, string> = { IN: "in", UK: "gb", GB: "gb", US: "us", EU: "eu", EA: "eu", SG: "sg", CN: "cn" };
const NAME: Record<string, string> = {
  IN: "India", UK: "United Kingdom", GB: "United Kingdom", US: "United States", EU: "European Union", EA: "Euro area",
  SG: "Singapore", CN: "China",
};

export type FlagPart = { kind: "global"; code: "GLOBAL"; name: string } | { kind: "flag"; code: string; iso: string; name: string };

function countryName(code: string) {
  if (NAME[code]) return NAME[code];
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Splits a jurisdiction code ("IN", "EA", "GLOBAL", "UK-IN") into the flags to show. */
export function flagParts(code: string | null | undefined): FlagPart[] {
  if (!code) return [];
  return code.toUpperCase().split("-").filter(Boolean).flatMap((c): FlagPart[] => {
    if (c === "GLOBAL") return [{ kind: "global", code: "GLOBAL", name: "Global" }];
    const iso = ISO[c] ?? (/^[A-Z]{2}$/.test(c) ? c.toLowerCase() : null);
    return iso ? [{ kind: "flag", code: c, iso, name: countryName(c) }] : [];
  });
}

export const flagSrc = (iso: string) => `https://flagcdn.com/w40/${iso}.png`;
export const flagSrcSet = (iso: string) => `https://flagcdn.com/w80/${iso}.png 2x`;
