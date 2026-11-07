/**
 * hf_card_list — ported from HyperFrames card-list.html.
 * A compact, numbered left-rail list: an accent headline over a stack of
 * white cards, each with a SOLID accent square badge (i+1) and a bold label.
 * Smaller and quieter than the listicle — a partial overlay, no takeover.
 *
 * Landscape: pinned to a left rail (vertically centered).
 * Portrait: vertically centered, near-full-width cards.
 */
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { HF } from "./hfBrand";
import { useTypeBase, useFadeRise, useSpringIn } from "./motion";

export type HfCardListProps = {
  /** Accent title shown above the list (optional). */
  headline?: string;
  /** Comma-separated rows, e.g. "Step 1,Step 2,Step 3" (required). */
  items: string;
};

export const HfCardList: React.FC<HfCardListProps> = ({ headline, items }) => {
  const { width, height } = useVideoConfig();
  useCurrentFrame();
  const t = useTypeBase();

  const isPortrait = height >= width;

  const rows = items
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const title = useFadeRise(0.2, 0.4, 0);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: isPortrait ? "stretch" : "flex-start",
          paddingLeft: isPortrait
            ? Math.round(width * 0.06)
            : Math.round(width * 0.06),
          paddingRight: isPortrait ? Math.round(width * 0.06) : 0,
          fontFamily: HF.font,
        }}
      >
        {headline ? (
          <div
            style={{
              color: HF.accent,
              fontWeight: 800,
              letterSpacing: "0.02em",
              fontSize: Math.round(t * 0.032),
              marginBottom: Math.round(t * 0.022),
              fontFamily: HF.fontDisplay,
              opacity: title.opacity,
              transform: `translateY(${title.ty}px)`,
              hyphens: "manual",
            }}
          >
            {headline}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: Math.round(t * 0.016),
            alignItems: "stretch",
          }}
        >
          {rows.map((label, i) => (
            <Row
              key={i}
              index={i}
              label={label}
              t={t}
              width={width}
            />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Row: React.FC<{
  index: number;
  label: string;
  t: number;
  width: number;
}> = ({ index, label, t, width }) => {
  const s = useSpringIn(0.5 + index * 0.1, 0.45);
  const tx = interpolate(s, [0, 1], [-width * 0.045, 0]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: Math.round(t * 0.018),
        background: HF.white,
        borderRadius: Math.round(t * 0.017),
        padding: `${Math.round(t * 0.018)}px ${Math.round(t * 0.024)}px`,
        boxShadow: "0 8px 32px rgba(20,30,80,.1)",
        opacity: s,
        transform: `translateX(${tx}px)`,
      }}
    >
      <div
        style={{
          flex: "0 0 auto",
          width: Math.round(t * 0.048),
          height: Math.round(t * 0.048),
          borderRadius: Math.round(t * 0.013),
          background: HF.accent,
          color: "#fff",
          fontWeight: 800,
          fontFamily: HF.fontMono,
          fontSize: Math.round(t * 0.024),
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {index + 1}
      </div>
      <div
        style={{
          color: HF.ink,
          fontWeight: 800,
          fontSize: Math.round(t * 0.032),
          hyphens: "manual",
          overflowWrap: "break-word",
        }}
      >
        {label}
      </div>
    </div>
  );
};
