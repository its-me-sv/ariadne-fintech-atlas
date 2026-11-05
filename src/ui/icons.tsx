// Small stroke icon set, drawn for this app (24px grid, currentColor).
import type { ReactElement } from "react";

const P: Record<string, ReactElement> = {
  overview: <><path d="M3 18 12 22l9-4V8l-9-4-9 4z" /><path d="M3 8l9 4 9-4M12 12v10" /></>,
  graph: <><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="7" r="2.5" /><circle cx="8" cy="18" r="2.5" /><circle cx="18" cy="17" r="2.5" /><path d="M8.3 7 15.6 7M7 8.4 7.6 15.6M10.4 17.8 15.5 17.2M17.8 9.5 18 14.5" /></>,
  traces: <><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /><path d="M7 12h3M14 12h3" /><path d="M5 5v3M19 16v3" /></>,
  compare: <><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M3 9.5h18M9 4v16M15 4v16" /></>,
  rules: <><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 11h7M9 14.5h7M9 18h4" /></>,
  money: <><ellipse cx="12" cy="6.5" rx="7" ry="2.8" /><path d="M5 6.5v5c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-5" /><path d="M5 11.5v5c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-5" /></>,
  blueprint: <><rect x="3" y="3" width="18" height="18" rx="2.5" /><path d="M3 9h7v12M10 13h11M15 3v10" /></>,
  cbdc: <><circle cx="12" cy="12" r="8.5" /><path d="M9 9.5h4.5a2 2 0 0 1 0 4H9V8M9 13.5h5a2 2 0 0 1 0 4H9v-4M11 6.5v2M11 17.5v2" /></>,
  insurance: <><path d="M12 3 4.5 6v6c0 4.4 3.2 7.8 7.5 9 4.3-1.2 7.5-4.6 7.5-9V6z" /><path d="m8.8 12 2.3 2.3 4.2-4.6" /></>,
  markets: <><path d="M4 20V10M10 20V5M16 20v-8M22 20H2" /><path d="M2.5 13.5 9 8l6 4 6.5-6" /></>,
  crypto: <><path d="M12 2.8 20 7.4v9.2l-8 4.6-8-4.6V7.4z" /><path d="M12 7.5v9M8.2 9.7l7.6 4.6M15.8 9.7l-7.6 4.6" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  rotl: <><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4.5h4.5" /></>,
  rotr: <><path d="M20 12a8 8 0 1 1-2.4-5.7" /><path d="M20 4v4.5h-4.5" /></>,
  home: <><path d="M3.5 11 12 4l8.5 7" /><path d="M6 9.5V20h12V9.5" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevron: <path d="m7 10 5 5 5-5" />,
  play: <path d="M8 5.5v13l10.5-6.5z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  prev: <path d="M15 5 8 12l7 7" />,
  next: <path d="m9 5 7 7-7 7" />,
  building: <><path d="M4 21V9l5-3 5 3v12M14 21V5l3-2 3 2v16M2 21h20" /></>,
  doc: <><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 12h7M9 16h7" /></>,
  check: <><circle cx="12" cy="12" r="8.5" /><path d="m8.4 12.2 2.5 2.5 4.8-5" /></>,
  van: <><path d="M2.5 7h11v8h-11zM13.5 10h4l3 3v2h-7z" /><circle cx="6.5" cy="16.5" r="1.8" /><circle cx="17" cy="16.5" r="1.8" /></>,
  rail: <><rect x="3.5" y="6" width="17" height="12" rx="3" /><path d="M7.5 10h2M7.5 14h2M12 10h4.5M12 14h4.5" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5s1.2-6.2 3.6-8.5z" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
};

export function Icon({ name, size = 20, stroke = 1.8 }: { name: keyof typeof P | string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name] ?? P.layers}
    </svg>
  );
}
