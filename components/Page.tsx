

import React, { useState } from 'react';
import { PageData } from '../types';

interface PageProps {
  pageData: PageData;
  isFlipped: boolean;
  zIndex: number;
  isFlipping: boolean;
  flippingAngle: number;
  exportAnimation: { pageIndex: number, progress: number } | null;
  isTopPage: boolean;
}

const BindingPost = ({ top }: { top: string }) => {
  const style: React.CSSProperties = {
    position: 'absolute',
    top,
    left: '10px',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    background: 'radial-gradient(circle at 18px 18px, #FFFDE4 0%, #FDEE88 30%, #D4AF37 60%, #B37400 100%)',
    boxShadow: 'inset 0 0 6px rgba(0,0,0,0.6), 2px 2px 3px rgba(0,0,0,0.3), 0 0 0 2px rgba(0,0,0,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const screwSlotStyle: React.CSSProperties = {
    width: '30px',
    height: '6px',
    background: 'linear-gradient(to top, #503000, #805000)',
    borderRadius: '2px',
    transform: 'rotate(10deg)',
    boxShadow: 'inset 0px 1px 1px rgba(0,0,0,0.5)',
  };

  return (
    <div style={style}>
      <div style={screwSlotStyle} />
    </div>
  );
};


const Page = ({ pageData, isFlipped, zIndex, isFlipping, flippingAngle, exportAnimation, isTopPage }: PageProps) => {
  const [rotation] = useState(Math.random() * 1.5 - 0.75);

  const paperStyle: React.CSSProperties = {
    backgroundColor: '#FDFCF5',
    backgroundImage: `
      radial-gradient(circle at 1px 1px, rgba(0,0,0,0.01) 1px, transparent 0),
      linear-gradient(to bottom, #FDFCF5, #F8F5E7),
      linear-gradient(175deg, rgba(0,0,0,0.01) 0%, rgba(0,0,0,0) 5%, rgba(0,0,0,0) 95%, rgba(0,0,0,0.01) 100%)
    `,
    backgroundSize: '2px 2px, 100% 100%, 100% 100%',
    boxShadow: 'inset 10px 0 15px -10px rgba(0,0,0,0.1), inset 0 1px 1px rgba(0,0,0,0.05), inset 0 -1px 1px rgba(0,0,0,0.05)',
  };
  
  const frontPageStyle: React.CSSProperties = {
    ...paperStyle,
    backfaceVisibility: 'hidden',
    backgroundImage: `url(${pageData.content}), ${paperStyle.backgroundImage}`,
    backgroundSize: `cover, ${paperStyle.backgroundSize}`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundBlendMode: 'multiply',
    filter: 'saturate(90%) contrast(110%) brightness(105%)',
  };

  const getTransform = (angle: number): string => {
    const rad = Math.abs(angle * Math.PI / 180);
    const progress = Math.sin(rad);
    const curlY = progress * 10;
    const curlX = progress * 20;
    const lift = progress * 8;
    return `translateX(${lift}px) rotateX(${curlX}deg) rotateY(${angle}deg) skewY(${-curlY}deg)`;
  }

  let transform;
  let transition = isFlipping || exportAnimation ? 'none' : 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
  let progress = 0;

  const isCurrentlyExportingThisPage = exportAnimation && exportAnimation.pageIndex === pageData.id;

  if (isCurrentlyExportingThisPage) {
    const angle = -exportAnimation.progress * 180;
    transform = getTransform(angle);
    progress = Math.sin(Math.abs(angle * Math.PI / 180));
  } else if (exportAnimation) {
    const isFlippedForExport = pageData.id < exportAnimation.pageIndex;
    transform = `rotateY(${isFlippedForExport ? -180 : 0}deg)`;
  } else if (isFlipping) {
    transform = getTransform(flippingAngle);
    progress = Math.sin(Math.abs(flippingAngle * Math.PI / 180));
  } else {
    transform = `rotateY(${isFlipped ? -180 : 0}deg)`;
  }
  
  const curlShadowOpacity = progress * 0.25;
  const highlightOpacity = progress * 0.1;
  const highlightPosition = 50 - progress * 40;

  // Render nothing if it's an invisible page during export
  if (exportAnimation && pageData.id > exportAnimation.pageIndex + 1) {
    return null;
  }
  
  const bindingShadowStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    width: '80px', // Wider, more pronounced shadow
    height: '100%',
    pointerEvents: 'none',
    // Stronger gradient to hide posts
    background: 'linear-gradient(to right, rgba(20,10,5,0.95) 0%, rgba(20,10,5,0.7) 25%, rgba(0,0,0,0.2) 60%, transparent 100%)',
  };

  const renderBindingPosts = () => (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
      <BindingPost top="80px" />
      <BindingPost top="370px" />
    </div>
  );

  return (
    <div
      className="absolute w-full h-full rounded-md"
      style={{
        zIndex,
        transform: `rotateZ(${rotation}deg) ${transform}`,
        transformOrigin: 'left center',
        transition: transition,
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}
    >
      {/* Front of the page */}
      <div
        className="absolute w-full h-full rounded-r-md overflow-hidden"
        style={frontPageStyle}
      >
        <div
            className="absolute w-full h-full top-0 left-0 pointer-events-none rounded-r-md"
            style={{
                background: `radial-gradient(circle at ${highlightPosition}% 50%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%)`,
                opacity: highlightOpacity,
                mixBlendMode: 'color-dodge',
                transition: 'opacity 0.1s'
            }}
        />
        <div style={{...bindingShadowStyle, left: 0 }} />
        {isTopPage && !isFlipping && !exportAnimation && renderBindingPosts()}
      </div>

      {/* Back of the page */}
      <div
        className="absolute w-full h-full rounded-l-md"
        style={{
          ...paperStyle,
          boxShadow: `inset -10px 0 15px -10px rgba(0,0,0,0.1), inset 0 1px 1px rgba(0,0,0,0.05), inset 0 -1px 1px rgba(0,0,0,0.05)`,
          transform: 'rotateY(180deg)',
          backfaceVisibility: 'hidden',
        }}
      >
        <div style={{...bindingShadowStyle, right: 0, background: 'linear-gradient(to left, rgba(20,10,5,0.95) 0%, rgba(20,10,5,0.7) 25%, rgba(0,0,0,0.2) 60%, transparent 100%)' }} />
      </div>

      <div
        className="absolute w-full h-full rounded-r-md pointer-events-none"
        style={{
          backfaceVisibility: 'hidden',
          transition: 'opacity 0.2s',
          opacity: curlShadowOpacity,
          backgroundImage: 'radial-gradient(circle at 0% 50%, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 40%)',
        }}
      />
    </div>
  );
};

export default Page;
