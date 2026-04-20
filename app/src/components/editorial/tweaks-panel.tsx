"use client";

import {
  useTweaks,
  type Accent,
  type Density,
  type FontFace,
  type Size,
  type Theme,
} from "./tweaks-provider";

const THEMES: { v: Theme; label: string }[] = [
  { v: "paper", label: "Cream" },
  { v: "stone", label: "Stone" },
  { v: "celadon", label: "Celadon" },
  { v: "night", label: "Night" },
];

const ACCENTS: { v: Accent; color: string }[] = [
  { v: "red", color: "#b91c1c" },
  { v: "blue", color: "#1e3a8a" },
  { v: "green", color: "#3f6212" },
  { v: "amber", color: "#a16207" },
  { v: "ink", color: "#0f0e0c" },
];

const DENSITIES: { v: Density; label: string }[] = [
  { v: "cozy", label: "Dense" },
  { v: "comfy", label: "Text" },
  { v: "airy", label: "Loose" },
];

const SIZES: { v: Size; label: string }[] = [
  { v: "sm", label: "Sm" },
  { v: "md", label: "Md" },
  { v: "lg", label: "Lg" },
];

const FACES: { v: FontFace; label: string }[] = [
  { v: "fraunces", label: "Signature" },
  { v: "playfair", label: "Masthead" },
  { v: "crimson", label: "Book" },
  { v: "garamond", label: "Classic" },
];

export function TweaksPanel() {
  const { state, setTweak, panelOpen, closePanel } = useTweaks();

  return (
    <div className={`tweaks${panelOpen ? " open" : ""}`}>
      <div className="tw-head">
        <div className="t">
          Set <em>type</em>
        </div>
        <div style={{ flex: 1 }} />
        <button
          className="icon-btn"
          type="button"
          onClick={closePanel}
          style={{ width: 24, height: 24 }}
          aria-label="Close tweaks"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="4" x2="12" y2="12" />
            <line x1="12" y1="4" x2="4" y2="12" />
          </svg>
        </button>
      </div>
      <div className="tw-body">
        <div className="tw-row">
          <span className="tw-label">Paper</span>
          <div className="seg">
            {THEMES.map((t) => (
              <button
                key={t.v}
                type="button"
                className={state.theme === t.v ? "on" : ""}
                onClick={() => setTweak("theme", t.v)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="tw-row">
          <span className="tw-label">Ink</span>
          <div className="swatches">
            {ACCENTS.map((a) => (
              <div
                key={a.v}
                className={`sw${state.accent === a.v ? " on" : ""}`}
                style={{ background: a.color }}
                onClick={() => setTweak("accent", a.v)}
                role="button"
                tabIndex={0}
                aria-label={`Accent ${a.v}`}
              />
            ))}
          </div>
        </div>

        <div className="tw-row">
          <span className="tw-label">Face</span>
          <div className="seg">
            {FACES.map((f) => (
              <button
                key={f.v}
                type="button"
                className={state.font === f.v ? "on" : ""}
                onClick={() => setTweak("font", f.v)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="tw-row">
          <span className="tw-label">Size</span>
          <div className="seg">
            {SIZES.map((s) => (
              <button
                key={s.v}
                type="button"
                className={state.size === s.v ? "on" : ""}
                onClick={() => setTweak("size", s.v)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="tw-row">
          <span className="tw-label">Leading</span>
          <div className="seg">
            {DENSITIES.map((d) => (
              <button
                key={d.v}
                type="button"
                className={state.density === d.v ? "on" : ""}
                onClick={() => setTweak("density", d.v)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="tw-row">
          <span className="tw-label">Grain</span>
          <div
            className={`switch${state.grain ? " on" : ""}`}
            onClick={() => setTweak("grain", !state.grain)}
            role="button"
            tabIndex={0}
            aria-label="Toggle grain"
          />
        </div>
      </div>
    </div>
  );
}
