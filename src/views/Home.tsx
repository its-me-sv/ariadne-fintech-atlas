// The Ariadne home page. Light, parchment and Greek key; no 3D, graph or map code is imported here.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAtlas, JURS } from "../data/store";
import { MARKETS } from "../ui/bits";
import { Flag } from "../ui/Flag";
import { Icon } from "../ui/icons";
import { LogoMark } from "../ui/TopBar";
import { useSmallScreen } from "../ui/PhoneNotice";
import { makeLabyrinth } from "../home/labyrinth";
import "./home.css";

export const REPO_URL = "https://github.com/its-me-sv/ariadne-fintech-atlas";
const WIKI = "https://en.wikipedia.org/wiki/";
const ICON = `${import.meta.env.BASE_URL}icon-512.png`;

interface Stats { systems: number; rules: number; sources: number; traces: number; asOf?: string }

/** Numbers come from the loaded atlas data when present, otherwise from the small public/data/stats.json. */
function useStats(): Stats | null {
  const core = useAtlas((s) => s.core);
  const [file, setFile] = useState<Stats | null>(null);
  const fromCore = useMemo<Stats | null>(() => core && {
    systems: core.nodes.filter((n) => !n.stub).length,
    rules: core.rules.length,
    sources: core.counts.sources,
    traces: core.scenarios.length,
    asOf: core.asOf,
  }, [core]);
  useEffect(() => {
    if (fromCore) return;
    let live = true;
    fetch("./data/stats.json").then((r) => (r.ok ? r.json() : null)).then((s) => { if (live && s) setFile(s); }).catch(() => undefined);
    return () => { live = false; };
  }, [fromCore]);
  return fromCore ?? file;
}

/** Fetches the Overview chunk ahead of time, so entering the atlas feels instant. Runs once. */
let prefetched = false;
function prefetchAtlas() {
  if (prefetched) return;
  prefetched = true;
  void import("./Overview");
}

const External = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
);

function Labyrinth() {
  const L = useMemo(() => makeLabyrinth(100), []);
  const wall = L.w * 0.26;
  return (
    <svg className="hm-labyrinth" viewBox="-112 -112 224 236" role="img"
      aria-label="A classical seven-circuit labyrinth. A gold thread runs along its single path from the entrance to the centre.">
      <circle r={L.R + wall / 2} className="lab-walls" />
      <path d={L.path} className="lab-walk" strokeWidth={L.w - wall} />
      <circle r={L.centre - wall / 2} className="lab-centre" />
      <path d={L.path} className="lab-thread" pathLength={1} />
    </svg>
  );
}

const Meander = () => <div className="hm-meander" aria-hidden="true" />;

// small line icons for the mythology mapping (24px grid, currentColor)
const MythIcon = ({ name }: { name: "labyrinth" | "thread" | "minotaur" | "theseus" }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === "labyrinth" && <><circle cx="12" cy="12" r="9" /><path d="M12 21v-4M12 17a5 5 0 1 1 5-5" /><circle cx="12" cy="12" r="1.4" /></>}
    {name === "thread" && <><circle cx="13" cy="9.5" r="6.5" /><path d="M7.5 7.5c3.2-1.2 7.4-.6 10.6 1.8M6.9 11.2c3.4-.4 7 .6 9.8 3M10.5 3.6c-.6 3.4.2 7.2 2.6 10.2" /><path d="M8.4 14.6C6.6 16 8 17.6 6 18.8S3.2 18.6 2 21" /></>}
    {name === "minotaur" && <><path d="M7 9c-2.5 0-4-2-4.5-4.5C4 6 5.5 6.5 7 6.5M17 9c2.5 0 4-2 4.5-4.5C20 6 18.5 6.5 17 6.5" /><path d="M7 7.5c0 6 1.8 11.5 5 11.5s5-5.5 5-11.5c-1.4-1-3.1-1.5-5-1.5S8.4 6.5 7 7.5z" /><path d="M10 12h.01M14 12h.01M10.5 16h3" /></>}
    {name === "theseus" && <><circle cx="12" cy="5" r="2.2" /><path d="M12 7.5v6M8.5 10.5l3.5-1.5 3.5 1.5M9.5 21l2.5-7.5 2.5 7.5" /></>}
  </svg>
);

export default function Home() {
  const small = useSmallScreen();
  const stats = useStats();

  // prefetch the atlas after first paint (not on phones, where the atlas does not open)
  useEffect(() => {
    if (small) return;
    if ("requestIdleCallback" in window) { const id = requestIdleCallback(prefetchAtlas, { timeout: 3000 }); return () => cancelIdleCallback(id); }
    const id = setTimeout(prefetchAtlas, 1500);
    return () => clearTimeout(id);
  }, [small]);
  const warm = useCallback(() => prefetchAtlas(), []);

  useEffect(() => { document.title = "Ariadne - Fintech Atlas"; }, []);

  const numbers: [string, number | undefined][] = [
    ["Markets", stats ? MARKETS.length : undefined],
    ["Systems", stats?.systems],
    ["Rules", stats?.rules],
    ["Sources", stats?.sources],
    ["Traces", stats?.traces],
  ];
  const label = (id: string) => JURS.find((j) => j.id === id)?.label ?? id;

  return (
    <div className="home">
      <header className="hm-header">
        <a className="hm-brand" href="#home" aria-label="Ariadne home"><LogoMark size={34} /><span>Ariadne</span></a>
        <nav aria-label="Site">
          {!small && <a href="#overview-global" onMouseEnter={warm} onFocus={warm}>Enter the atlas</a>}
          <External href={REPO_URL}>Source on GitHub</External>
        </nav>
      </header>

      <main>
        <section className="hm-hero" aria-labelledby="hm-title">
          <Meander />
          <div className="hm-hero-in">
            <div className="hm-hero-text">
              <div className="hm-emblem"><img src={ICON} width={132} height={132} alt="" /></div>
              <h1 id="hm-title">Ariadne</h1>
              <p className="hm-sub">Fintech Atlas</p>
              <p className="hm-tagline">One thread through the payments labyrinth.</p>
              <p className="hm-lead">A 3D, source-backed atlas of how money, messages and rules move across India, the UK, the US, the EU, Singapore and China.</p>
              {small ? (
                <p className="hm-note">The atlas is built for laptop and desktop screens. Open this link on a bigger screen to explore.</p>
              ) : (
                <div className="hm-ctas">
                  <a className="hm-btn primary" href="#overview-global" onMouseEnter={warm} onFocus={warm}>Follow the thread</a>
                  <a className="hm-btn" href="#overview-in" onMouseEnter={warm} onFocus={warm}>Watch a payment move</a>
                </div>
              )}
              <p className="hm-gh"><External href={REPO_URL}>Source on GitHub</External></p>
            </div>
            <Labyrinth />
          </div>
          <Meander />
        </section>

        <section className="hm-band" aria-label="The atlas in numbers">
          <dl className="hm-numbers">
            {numbers.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd className={v === undefined ? "skeleton" : ""}>{v === undefined ? <span aria-hidden="true">000</span> : v.toLocaleString("en-GB")}</dd>
              </div>
            ))}
          </dl>
          <ul className="hm-flags" aria-label="Open a market city">
            {MARKETS.map((m) => (
              <li key={m.id}>
                {small ? <span title={label(m.id)}><Flag code={m.id} w={28} /><b>{m.short}</b></span>
                  : <a href={`#overview-${m.id.toLowerCase()}`} title={`Open ${label(m.id)}`} onMouseEnter={warm} onFocus={warm}><Flag code={m.id} w={28} /><b>{m.short}</b></a>}
              </li>
            ))}
          </ul>
        </section>

        <section className="hm-sec" aria-labelledby="hm-who">
          <h2 id="hm-who">Who was Ariadne?</h2>
          <p className="hm-prose">
            In Greek myth, <External href={`${WIKI}Ariadne`}>Ariadne</External> was a princess of Crete, the daughter of King Minos.
            The craftsman Daedalus had built the Labyrinth to hold the Minotaur, a creature half man and half bull.
            When the Athenian hero Theseus was sent into it, Ariadne gave him a ball of thread so he could find his way back out.
            He followed the thread and escaped.
          </p>
        </section>

        <Meander />

        <section className="hm-sec" aria-labelledby="hm-why">
          <h2 id="hm-why">Why Ariadne for this project?</h2>
          <ul className="hm-map">
            <li><span className="ic"><MythIcon name="labyrinth" /></span><b>The Labyrinth</b><span>The world's payment systems, with their rails, switches, central banks and rulebooks.</span></li>
            <li><span className="ic"><MythIcon name="thread" /></span><b>The thread</b><span>Each trace follows one payment step by step, and every turn links back to its source.</span></li>
            <li><span className="ic"><MythIcon name="minotaur" /></span><b>The Minotaur</b><span>Jargon and opacity, lurking at every corner. Far less scary in good light.</span></li>
            <li><span className="ic"><MythIcon name="theseus" /></span><b>Theseus</b><span>You, finding your way in and back out again.</span></li>
          </ul>
        </section>

        <Meander />

        <section className="hm-sec" aria-labelledby="hm-trivia">
          <h2 id="hm-trivia">Thread trivia</h2>
          <div className="hm-cards trivia">
            <article><h3>A clue was once a ball of thread</h3><p>The English word "clue" is a variant of "clew", a ball of thread or yarn. Its meaning grew from the thread Theseus used to find his way out of the labyrinth.</p><External href="https://en.wiktionary.org/wiki/clue">Wiktionary: clue</External></article>
            <article><h3>A method in logic</h3><p>"Ariadne's thread" names a way of solving problems with many possible routes: keep a record of every choice, so you can backtrack and try the alternatives.</p><External href={`${WIKI}Ariadne%27s_thread_(logic)`}>Wikipedia: Ariadne's thread (logic)</External></article>
            <article><h3>A crown among the stars</h3><p>The constellation Corona Borealis was generally said to represent the crown that Dionysus gave to Ariadne, set in the heavens.</p><External href={`${WIKI}Corona_Borealis`}>Wikipedia: Corona Borealis</External></article>
            <article><h3>The palace of Knossos</h3><p>The first palace at Knossos on Crete was built around 1900 BC. In later Greek tradition its complex plan was remembered as the Labyrinth.</p><External href={`${WIKI}Knossos`}>Wikipedia: Knossos</External></article>
            <article><h3>One path, no dead ends</h3><p>The classical labyrinth is a single path of seven circuits, with no branches and no dead ends, like the one drawn at the top of this page.</p><External href={`${WIKI}Labyrinth`}>Wikipedia: Labyrinth</External></article>
          </div>
        </section>

        <Meander />

        <section className="hm-sec" aria-labelledby="hm-inside">
          <h2 id="hm-inside">Inside the atlas</h2>
          <div className="hm-cards views">
            {([
              ["overview", "Globe and cities", "Spin the globe, then step into a clay city where a real payment plays out.", "#overview-global"],
              ["traces", "Transaction traces", "Follow one payment step by step, with its rules, ledger effects and sources.", "#traces"],
              ["graph", "Architecture graph", "Follow the money, the message, the data or the rules across a market.", "#graph-in"],
              ["compare", "Country comparison", "The same building blocks side by side for all six markets.", "#compare"],
              ["rules", "Standards and rules", "Laws, rulebooks and standards with their binding level, status and dates.", "#rules"],
              ["money", "Money types", "Whose liability is it, and what protects you if that party fails?", "#money"],
              ["blueprint", "Product blueprints", "What a neobank, wallet or lender has to plug into in each market.", "#blueprint-neobank"],
              ["cbdc", "CBDC and modules", "Central bank digital currency, insurance, capital markets and crypto.", "#module-cbdc"],
            ] as const).map(([icon, title, line, to]) => {
              const body = <><span className="ic"><Icon name={icon} size={22} /></span><h3>{title}</h3><p>{line}</p></>;
              return small ? <article key={title}>{body}</article>
                : <a key={title} className="hm-card-link" href={to} onMouseEnter={warm} onFocus={warm}>{body}</a>;
            })}
          </div>
        </section>
      </main>

      <footer className="hm-footer">
        <Meander />
        <p>Built by <External href="https://surajvijayan.dev">Suraj Vijayan</External>. <External href={REPO_URL}>Source on GitHub</External>.</p>
        <p>Code under the MIT license, evidence dataset under CC BY 4.0. Evidence as of 15 October 2026.</p>
        <p>For education and research, not legal or financial advice.</p>
        <p className="hm-credit">Myth details from Wikipedia and Wiktionary, linked above.</p>
      </footer>
    </div>
  );
}
