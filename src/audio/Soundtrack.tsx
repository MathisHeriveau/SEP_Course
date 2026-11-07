// Bande-son mixée hors-ligne (scripts/audio) : musique originale + design sonore, calés sur la chronologie.
import React from 'react';
import {Audio} from '@remotion/media';
import {staticFile} from 'remotion';

export const Soundtrack: React.FC = () => <Audio src={staticFile('audio/soundtrack.wav')} />;
