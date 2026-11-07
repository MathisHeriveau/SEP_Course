import {type Camera, type Viewport, boundsOf, fitBounds} from './mercator';
import {ROUTE_COORDS} from './route';

/** Framing of the high-resolution poster: whole route, room for the title block on the left. */
export const posterCamera = (vp: Viewport): Camera =>
	fitBounds(boundsOf(ROUTE_COORDS), vp, {top: 0.1, bottom: 0.12, left: 0.42, right: 0.1});
