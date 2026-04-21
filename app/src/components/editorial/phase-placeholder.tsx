import type { EditorialView } from "./folio-map";
import { FOLIO } from "./folio-map";

type Props = {
  view: EditorialView;
  ticket: string;
  italicWord?: string;
  headline: string;
  note?: string;
};

export function PhasePlaceholder({ view, ticket, italicWord, headline, note }: Props) {
  const f = FOLIO[view];
  const split = italicWord && headline.includes(italicWord);

  return (
    <div className="pad" style={{ paddingTop: 36 }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink-4)",
          marginBottom: 18,
        }}
      >
        <span style={{ color: "var(--ink-3)", fontWeight: 700 }}>
          Section {f.num} · {f.name}
        </span>
        <span style={{ color: "var(--ink-5)", margin: "0 10px" }}>·</span>
        <span>{ticket}</span>
      </div>
      <h1
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 300,
          fontSize: 84,
          letterSpacing: "-0.045em",
          lineHeight: 0.9,
          fontVariationSettings: '"opsz" 144',
          marginBottom: 24,
          color: "var(--ink)",
        }}
      >
        {split ? (
          <>
            {headline.split(italicWord!)[0]}
            <em style={{ fontFamily: "var(--font-inst)", fontStyle: "italic", fontWeight: 400, color: "var(--accent)" }}>
              {italicWord}
            </em>
            {headline.split(italicWord!)[1]}
          </>
        ) : (
          headline
        )}
      </h1>
      <div
        style={{
          borderTop: "1.5px solid var(--rule)",
          paddingTop: 14,
          maxWidth: 640,
          fontFamily: "var(--font-serif)",
          fontSize: 18,
          lineHeight: 1.62,
          color: "var(--ink-2)",
        }}
      >
        {note ||
          `Phase 0 ships the shell and design tokens. This view will be built in ${ticket}.`}
      </div>
    </div>
  );
}
