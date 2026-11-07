import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {TIMELINE} from '../config/film';
import {cameraAt, journeyKm} from '../geo/camera';
import {envelope, ramp, useLayout} from '../components/layout';
import {GeoOverlay} from './GeoOverlay';
import {MapLabels} from './MapLabels';
import {TileLayer} from './TileLayer';

/** The continuous map: one camera from the France overview to the final pull-back. */
export const MapStage: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps, vp, unit} = useLayout();
	const t = frame / fps;
	const T = TIMELINE;
	const cam = cameraAt(frame, vp);
	const km = t < T.journey[0] ? 0 : journeyKm(t);

	const opacity = envelope(t, [T.mapIn[0], T.finalText[0] + 4.5], T.mapIn[1] - T.mapIn[0], 3.5);
	// Assombrissement pendant le générique et le message final
	const dim = 0.42 * ramp(t, T.credits[0], T.credits[0] + 1.5) + 0.25 * ramp(t, T.finalText[0], T.finalText[0] + 2);

	return (
		<AbsoluteFill style={{opacity, backgroundColor: '#0b0b0b'}}>
			<TileLayer cam={cam} vp={vp} />
			<GeoOverlay cam={cam} vp={vp} t={t} km={km} unit={unit} />
			<MapLabels cam={cam} vp={vp} t={t} unit={unit} />
			{dim > 0 && <AbsoluteFill style={{backgroundColor: '#050505', opacity: dim}} />}
		</AbsoluteFill>
	);
};
