import React from 'react';

export const PlayIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 5.13969V18.8603C8 19.5694 8.79057 20.0387 9.42399 19.6641L19.024 13.8038C19.6111 13.4569 19.6111 12.5431 19.024 12.1962L9.42399 6.33593C8.79057 5.96134 8 6.4306 8 7.13969V5.13969Z"/>
  </svg>
);

export const PauseIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="5" width="3" height="14" rx="1.5"/>
    <rect x="14" y="5" width="3" height="14" rx="1.5"/>
  </svg>
);

export const ResetIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 6V12L15 15"/>
      <path d="M21.17 14.83A10 10 0 1 1 12 2a10 10 0 0 1 9.17 12.83Z"/>
    </svg>
);

export const ReplayIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 4v6h6"/>
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
  </svg>
);

export const UploadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w.org/2000/svg">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

export const MagicWandIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.3,2.4l1.4,1.4 M13.3,7.8l1.4,1.4 M2.4,9.3l1.4,1.4 M7.8,13.3l1.4,1.4 M5,2v3 M19,16v3 M2,5h3 M16,19h3 M6.4,6.4L21,21 M3,3l5.6,5.6"/>
  </svg>
);

export const UndoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 7V13H9"/>
    <path d="M21 17C21 12.0294 16.9706 8 12 8C8.93235 8 6.22912 9.40422 4.60098 11.5"/>
  </svg>
);

export const AlertTriangleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 22H22L12 2Z"/>
    <path d="M12 8V14"/>
    <path d="M12 18H12.01"/>
  </svg>
);

export const NextIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export const PrevIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

export const ThumbIcon = () => (
    <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
        <defs>
            <filter id="handShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="3" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.25" />
            </filter>
        </defs>
        <g transform="translate(10, 10)" filter="url(#handShadow)">
            {/* Thumb base shape, crafted to look like the image */}
            <path 
                d="M 50,75 C 65,60 70,35 55,20 S 25,0 15,20 C 5,40 10,70 25,75 Z"
                fill="#f2c69c" 
                stroke="#b08d6e" 
                strokeWidth="2.5"
            />
            
            {/* Nail */}
            <path 
                d="M 48,23 C 60,35 58,55 45,60 S 20,55 23,40 C 26,25 38,15 48,23 Z" 
                fill="#ffffff" 
                stroke="#d49c83" 
                strokeWidth="1.5"
            />
            
            {/* Nail highlight */}
            <path 
                d="M 45,28 C 50,35 50,45 45,52 S 30,55 28,45 C 26,35 38,22 45,28 Z" 
                fill="white" 
                opacity="0.6"
            />

            {/* Knuckle lines */}
            <path d="M 18,52 C 16,58 18,65 24,68" fill="none" stroke="#d49c83" strokeWidth="1.5" />
            <path d="M 22,55 C 20,61 22,68 28,71" fill="none" stroke="#d49c83" strokeWidth="1.5" />
        </g>
    </svg>
);

export const SpeakerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
);

export const SpinnerIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" className="animate-spin">
        <line x1="12" y1="2" x2="12" y2="6"/>
        <line x1="12" y1="18" x2="12" y2="22"/>
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
        <line x1="2" y1="12" x2="6" y2="12"/>
        <line x1="18" y1="12" x2="22" y2="12"/>
        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
    </svg>
);

export const DownloadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 17V3"/>
    <path d="m7 12 5 5 5-5"/>
    <path d="M5 21h14"/>
  </svg>
);

export const VideoIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="m22 8-6 4 6 4V8Z"/>
      <rect x="2" y="6" width="14" height="12" rx="2" ry="2"/>
  </svg>
);

export const ZipIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L8.6 3.3A2 2 0 0 0 6.93 2H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z"/>
    <line x1="10" y1="10" x2="10" y2="10"/>
    <line x1="14" y1="10" x2="14" y2="10"/>
    <line x1="10" y1="14" x2="10" y2="14"/>
    <line x1="14" y1="14" x2="14" y2="14"/>
    <line x1="10" y1="18" x2="10" y2="18"/>
    <line x1="14" y1="18" x2="14" y2="18"/>
  </svg>
);

export const SparkleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3L9.65 8.35L4 10.35L9.65 12.35L12 17.65L14.35 12.35L20 10.35L14.35 8.35L12 3Z"/>
      <path d="M5 3V7"/>
      <path d="M19 17V21"/>
  </svg>
);
