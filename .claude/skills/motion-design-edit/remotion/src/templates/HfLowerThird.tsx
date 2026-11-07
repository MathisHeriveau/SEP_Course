/**
 * hf_lower_third — ported from HyperFrames lower-third.html.
 * An accent vertical bar + a dark-glass name plate (name + optional role).
 * Landscape → bottom-left; Portrait → upper-left (bottom reserved for captions).
 * Partial overlay — renders over the speaker, no takeover. Entrance only.
 */
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { HF } from "./hfBrand";
import { useTypeBase, useFadeRise } from "./motion";

export type HfLowerThirdProps = {
  /** Person's name (required). */
  name: string;
  /** Title / role line under the name (optional). */
  role?: string;
};

export const HfLowerThird: React.FC<HfLowerThirdProps> = ({ name, role }) => {
  const { width, height } = useVideoConfig();
  useCurrentFrame();
  const t = useTypeBase();

  const isPortrait = height > width;
  const plate = useFadeRise(0.2, 0.5, Math.round(height * 0.037)); // ~40px @1080

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: isPortrait ? "flex-start" : "flex-end",
          paddingLeft: Math.round(width * (isPortrait ? 0.055 : 0.06)),
          paddingTop: isPortrait ? Math.round(height * 0.12) : undefined,
          paddingBottom: isPortrait ? undefined : Math.round(height * 0.11),
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "stretch",
            gap: Math.round(t * 0.018),
            opacity: plate.opacity,
            transform: `translateY(${plate.ty}px)`,
            fontFamily: HF.font,
          }}
        >
          <div
            style={{
              width: Math.round(t * 0.006),
              alignSelf: "stretch",
              background: HF.accent,
              borderRadius: Math.round(t * 0.003),
              flex: "none",
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              background: HF.darkGlass,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderRadius: Math.round(t * 0.011),
              padding: `${Math.round(t * 0.013)}px ${Math.round(t * 0.026)}px`,
            }}
          >
            <div
              style={{
                color: "#fff",
                fontFamily: HF.fontDisplay,
                fontWeight: 800,
                lineHeight: 1.1,
                fontSize: Math.round(t * 0.04),
                hyphens: "manual",
              }}
            >
              {name}
            </div>
            {role ? (
              <div
                style={{
                  color: HF.accent,
                  fontWeight: 600,
                  fontSize: Math.round(t * 0.025),
                  marginTop: Math.round(t * 0.004),
                  hyphens: "manual",
                }}
              >
                {role}
              </div>
            ) : null}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
