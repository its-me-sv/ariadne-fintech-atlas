# Ariadne - Fintech Atlas

Like Ariadne's thread through the Labyrinth, the traces follow a single payment through banks, switches and rules.

For education and research, not legal or financial advice. Evidence as of 15 October 2026.

Built for laptop and desktop screens. On phones the app shows a short notice asking you to open the same link on a larger screen.

A source-backed, explorable map of how money, messages, data and rules move through financial infrastructure in India, the UK, the US, the EU, Singapore and China, plus global layers (card networks, SWIFT, CLS, standards bodies) and CBDC work.

Every system, link and rule in the app comes from the evidence package in `evidence/` (as of 15 October 2026). Gaps stay visible: anything a source does not specify is shown as "Not stated", "Not publicly specified" or "Needs verification" rather than filled in.

## Views

| Route | View |
| --- | --- |
| `#overview-in`, `#overview-uk`, `#overview-us`, `#overview-eu`, `#overview-sg`, `#overview-cn` | 3D clay city per market with its hero transaction animated |
| `#overview-global` | Clay globe with the six markets highlighted and a pin at each financial capital; select a pin or country to fly into its city |
| `#traces`, `#trace-<scenario id>` | Step-by-step transaction traces with rules, sources and illustrative ledger entries; filter by market or by traces that have a 3D view |
| `#graph-<market>` | Architecture graph (React Flow + ELK) filtered by flow type and kind of institution |
| `#compare` | Market comparison matrix and rails side by side |
| `#rules` | Standards and rules registry with a dated "coming up" timeline |
| `#money` | Ten money types compared by issuer, claim, backing, finality and protection |
| `#blueprint-<product>` | What a product (neobank, wallet, merchant acquiring and others) has to plug into |
| `#module-cbdc`, `#module-insurance`, `#module-markets`, `#module-crypto` | Module pages |
| `#node-<id>` | Deep link that opens a system's detail panel |

Routes are plain hash tokens, so the app runs from any static host or subpath without server rewrites.

## Run, build, test

Node 20 or newer.

```bash
npm ci
npm run dev        # generates public/data first, then http://localhost:5173
npm run build      # data, type check, production build into dist/
npm test           # vitest: world integrity, routes, flags, traces filter, copy rules
```

`npm run build` writes `dist/`, a normal static site you can deploy anywhere. Optionally, `npm run build:artifact` also writes `artifact/`, the same build with the page skeleton stripped, for hosts that supply their own.

## Project layout

```
evidence/            research dataset (nodes, edges, rules, scenarios, claims, sources, ...) and schema.ts
scripts/build-data.ts  trims evidence/ into public/data/core.json and evidence.json (loaded at runtime)
src/data/            types, Zustand store, indexes, search
src/router.ts        hash routes
src/world/           3D: worlds.ts (layouts and step maps), Scene.tsx (clay buildings, routes, vehicles), Globe.tsx (global view)
src/views/           one file per view
src/ui/              top bar, dock, detail panel, flags, phone notice, shared bits, kind colours
tests/               vitest suites
```

Bundles are split so the first load is small: three.js loads only on the 3D overview, the world map data and d3-geo only on the globe, and React Flow only on the graph. Phones never load any of them. ELK layout runs in a Web Worker (results cached per filter), so large graphs never freeze the page, and the 3D scene drops to 1x resolution on devices that cannot hold a smooth frame rate.

## Updating the data

1. Edit or replace the files in `evidence/`. Keep the shapes in `evidence/schema.ts`; every node, edge and rule should cite claim ids, and every claim a source id.
2. Run `npm run build` (or `npm run data` while `npm run dev` is running, then reload).
3. Run `npm test`. The world tests fail if a 3D building points at a node id that no longer exists, or a step map refers to a step a scenario no longer has.

Change `asOf` in `evidence/manifest.json` when the evidence date moves; the rules timeline uses it to decide what is "coming up".

## Adding things

**A rail, institution or other system.** Add a node to `evidence/nodes.json` (id, canonicalName, type, jurisdictions, status, purpose, claims) and its links to `evidence/edges.json` (from, to, verb, flowClass). It appears in search, the graph, comparison and detail panels automatically. Its colour comes from its type via `src/ui/kinds.ts`.

**A rule.** Add it to `evidence/rules.json` with instrumentType, bindingLevel, effectiveStatus, dates and `affects` (node ids). Proposals stay `proposed`; a standard is binding only through a law or scheme rule that references it.

**A CBDC.** Add a node with type `cbdc` (or `cbdc_project` for an experiment) and a status from the sources (production, pilot, design_phase, research, concluded, prohibited). Never type a stablecoin or tokenised deposit as a CBDC. It shows on the CBDC module, the money page and the market's comparison column.

**A scenario (trace).** Add it to `evidence/scenarios.json` with numbered steps; each step names actors, the message or instruction, the rail, the settlement asset and claim ids. Ledger entries go in `evidence/journal-entries.json` keyed by scenario and step.

**A market (country).**
1. Add its nodes, edges, rules and scenarios with the new jurisdiction code, and a coverage record in `evidence/coverage.json`.
2. Add the code to `Jur` in `src/data/types.ts`, to `JURS` in `src/data/store.ts`, to `JUR_TOKENS` in `src/router.ts` and to `MARKETS` in `src/ui/bits.tsx`.
3. For a 3D world, add an entry to `WORLDS` in `src/world/worlds.ts`: a hero `scenarioId`, `buildings` (each in one slot, pointing at a real `nodeId` or carrying actor text) and a `steps` map from scenario step number to the slots in focus and the `PATHS` routes to animate. Add a pin (capital coordinates and colour) to `GLOBE_MARKETS` and its country ids to `COUNTRY_MARKET` in `src/world/Globe.tsx`.
4. Run `npm test`.

## Copy rules

No em or en dashes in any user-facing text; a test enforces this for the main source files. Status labels follow the sources exactly.

## License

- Code: MIT, see [LICENSE](LICENSE).
- Evidence dataset (`evidence/`): CC BY 4.0, see [evidence/LICENSE](evidence/LICENSE).
- Quoted excerpts and linked documents belong to their original publishers and are cited by source.
- Flag images are served by [flagcdn.com](https://flagcdn.com). Country outlines come from [world-atlas](https://github.com/topojson/world-atlas) (Natural Earth).
