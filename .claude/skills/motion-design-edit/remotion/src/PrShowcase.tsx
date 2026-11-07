/**
 * PrShowcase — standalone QA composition for the pr_* paper-reel graphic
 * set (kind PrCard / PrPunch / PrProof). No source video needed, same
 * purpose as StyleShowcase but scoped to the paper-reel style so it renders
 * fast and stays easy to scrub with extract_stills-style spot checks.
 */
import { AbsoluteFill, Series, useVideoConfig } from "remotion";
import { PrCard } from "./templates/PrCard";
import { PrPunch } from "./templates/PrPunch";
import { PrProof } from "./templates/PrProof";
import { PR } from "./templates/paperBrand";

const SECTION_SECONDS = 3;

export const PrShowcase: React.FC = () => {
  const { fps } = useVideoConfig();
  const sec = (s: number) => Math.round(s * fps);

  return (
    <AbsoluteFill style={{ backgroundColor: PR.bg }}>
      <Series>
        <Series.Sequence durationInFrames={sec(SECTION_SECONDS)}>
          <PrCard eyebrow="TIP 01" headline="tell it {why}." strike="not just what" />
        </Series.Sequence>
        <Series.Sequence durationInFrames={sec(SECTION_SECONDS)}>
          <PrPunch value="3" label="here are" />
        </Series.Sequence>
        <Series.Sequence durationInFrames={sec(SECTION_SECONDS)}>
          <PrPunch
            value={"discovery isn't earned anymore.\nit's engineered."}
            fullbleed={false}
          />
        </Series.Sequence>
        <Series.Sequence durationInFrames={sec(SECTION_SECONDS)}>
          <PrProof tag="DELHI · A SHOP COUNTER" caption="$4.5B valuation." />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
