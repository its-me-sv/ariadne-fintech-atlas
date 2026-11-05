import { useEffect, useState } from "react";
import { LogoMark } from "./TopBar";

// Phones get a notice instead of the app, so the 3D and graph code never loads there.
const SMALL_SCREEN = ["(pointer: coarse) and (max-width: 1023px)", "(max-width: 639px)"];

export function useSmallScreen() {
  const check = () => typeof matchMedia !== "undefined" && SMALL_SCREEN.some((q) => matchMedia(q).matches);
  const [small, setSmall] = useState(check);
  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const lists = SMALL_SCREEN.map((q) => matchMedia(q));
    const on = () => setSmall(lists.some((m) => m.matches));
    lists.forEach((m) => m.addEventListener("change", on));
    return () => lists.forEach((m) => m.removeEventListener("change", on));
  }, []);
  return small;
}

export function PhoneNotice() {
  return (
    <main className="phone-notice">
      <div className="pn-card">
        <div className="pn-logo"><LogoMark size={40} /><span className="logo-text"><b>Ariadne</b><small>Fintech Atlas</small></span></div>
        <h1>Ariadne works best on a laptop or PC</h1>
        <p>It is an explorable, source-backed map of how payments, messages and rules move through banks, switches and regulators in six markets, with 3D cities and step-by-step traces.</p>
        <p className="pn-note">Open this same link on a larger screen to explore it.</p>
      </div>
    </main>
  );
}
