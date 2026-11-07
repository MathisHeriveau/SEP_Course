/**
 * hf_chart — ported from HyperFrames chart.html.
 * A glassmorphism stat + bars card that floats over the speaker:
 * accent eyebrow, big stat value, muted subline, and a row of animated bars.
 * Partial overlay — no full-frame background, renders on top of the subject.
 */
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { HF } from "./hfBrand";
import { useTypeBase, useSpringIn } from "./motion";

export type HfChartProps = {
  /** Small uppercase accent label above the stat (optional). */
  eyebrow?: string;
  /** Big stat number, e.g. "94%" (optional). */
  value?: string;
  /** Muted subline under the stat (optional). */
  sub?: string;
  /** "Label:value,Label:value,..." — bar data (required). */
  items: string;
};

type Item = { label: string; value: number };

const FALLBACK: Item[] = [
  { label: "Auto-edit", value: 40 },
  { label: "Crop", value: 25 },
  { label: "Captions", value: 20 },
  { label: "Extras", value: 15 },
];

function parseItems(raw: string): Item[] {
  const parsed = (raw || "")
    .split(",")
    .map((chunk) => {
      const [label, val] = chunk.split(":");
      return {
        label: (label || "").trim(),
        value: parseFloat((val || "").trim()),
      };
    })
    .filter((it) => it.label.length > 0 && it.value > 0);
  return parsed.length > 0 ? parsed : FALLBACK;
}

const Bar: React.FC<{ item: Item; maxValue: number; index: number }> = ({
  item,
  maxValue,
  index,
}) => {
  const t = useTypeBase();
  const { height } = useVideoConfig();
  const grow = useSpringIn(0.5 + index * 0.1, 0.6);
  const heightFraction = item.value / maxValue;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        height: "100%",
      }}
    >
      <div
        style={{
          width: Math.round(t * 0.06),
          height: Math.round(height * 0.13 * heightFraction),
          borderRadius: "14px 14px 6px 6px",
          background: HF.barGradient,
          boxShadow: HF.barShadow,
          transformOrigin: "bottom",
          transform: `scaleY(${grow})`,
        }}
      />
      <div
        style={{
          color: HF.muted,
          fontWeight: 600,
          fontSize: Math.round(t * 0.022),
          marginTop: Math.round(t * 0.012),
          whiteSpace: "nowrap",
        }}
      >
        {item.label}
      </div>
    </div>
  );
};

export const HfChart: React.FC<HfChartProps> = ({
  eyebrow,
  value,
  sub,
  items,
}) => {
  const { width, height } = useVideoConfig();
  useCurrentFrame();
  const t = useTypeBase();

  const isPortrait = height > width;
  const data = parseItems(items);
  const maxValue = data.reduce((m, it) => Math.max(m, it.value), 0) || 1;

  const s = useSpringIn(0.1, 0.55);
  const cardOpacity = s;
  const cardY = interpolate(s, [0, 1], [40, 0]);
  const cardScale = 0.96 + 0.04 * s;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: isPortrait ? "flex-end" : "center",
          paddingBottom: isPortrait ? Math.round(height * 0.14) : 0,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            background: HF.glassFill,
            border: `1.5px solid ${HF.glassBorder}`,
            borderRadius: Math.round(t * 0.031),
            boxShadow: HF.glassShadow,
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            padding: `${Math.round(t * 0.048)}px ${Math.round(t * 0.052)}px`,
            fontFamily: HF.font,
            opacity: cardOpacity,
            transform: `translateY(${cardY}px) scale(${cardScale})`,
          }}
        >
          {eyebrow ? (
            <div
              style={{
                color: HF.accent,
                fontFamily: HF.fontMono,
                fontWeight: 800,
                fontSize: Math.round(t * 0.028),
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {eyebrow}
            </div>
          ) : null}

          {value ? (
            <div
              style={{
                color: HF.ink,
                fontFamily: HF.fontDisplay,
                fontWeight: 900,
                lineHeight: 1,
                fontSize: Math.round(t * 0.14),
                marginTop: Math.round(t * 0.008),
                whiteSpace: "nowrap",
              }}
            >
              {value}
            </div>
          ) : null}

          {sub ? (
            <div
              style={{
                color: HF.muted,
                fontWeight: 600,
                fontSize: Math.round(t * 0.031),
                marginTop: Math.round(t * 0.006),
                hyphens: "manual",
                textAlign: "center",
              }}
            >
              {sub}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: Math.round(t * 0.024),
              height: Math.round(height * 0.13),
              marginTop: Math.round(t * 0.04),
            }}
          >
            {data.map((item, i) => (
              <Bar
                key={`${item.label}-${i}`}
                item={item}
                maxValue={maxValue}
                index={i}
              />
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
