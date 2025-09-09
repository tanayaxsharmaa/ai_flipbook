import React, { useState, useMemo, useEffect } from 'react';
import { PageData } from '../types';
import Page from './Page';
import { ThumbIcon } from './Icons';
import { usePrevious } from '../hooks/usePrevious';

interface FlipbookProps {
  pages: PageData[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  isAnimating: boolean;
  totalPages: number;
  exportAnimation: { pageIndex: number, progress: number } | null;
}

const PageStack = ({ count, side, totalPages }: { count: number, side: 'left' | 'right', totalPages: number }) => {
  const dropShadows = useMemo(() => {
    if (count <= 1) return { boxShadow: 'none' };

    const thicknessFactor = Math.min(2.0, totalPages / 20);
    const maxVisibleEdges = 60;

    const shadowParts = Array.from({ length: Math.min(count, maxVisibleEdges) }, (_, i) => {
      const x = (side === 'left' ? -i * 0.2 : i * 0.2) * thicknessFactor;
      const y = (i + 1) * 0.4 * thicknessFactor;
      const blur = 1.5;
      const color = `rgba(0, 0, 0, 0.1)`;
      return `${x}px ${y}px ${blur}px ${color}`;
    });

    const baseShadowY = Math.min(count, maxVisibleEdges) * 0.4 * thicknessFactor;
    shadowParts.push(`0px ${baseShadowY + 3}px 6px rgba(0,0,0,0.15)`);

    return { boxShadow: shadowParts.join(', ') };
  }, [count, side, totalPages]);
  
  if (count <= 0) return null;

  // Make the stack appear much thicker.
  const edgeThickness = Math.max(1, Math.min(40, count * 0.8));

  const pageEdgesStyle: React.CSSProperties = {
    position: 'absolute',
    top: '1px',
    bottom: '1px',
    width: `${edgeThickness}px`,
    backgroundRepeat: 'no-repeat, no-repeat, repeat',
    backgroundSize: `200% 100%, 100% 100%, 100% 1px`,
    backgroundPosition: '50% 50%, top left, top left',
  };
  
  if (side === 'right') {
    pageEdgesStyle.right = `${-edgeThickness}px`;
    pageEdgesStyle.backgroundImage = `
      radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%),
      linear-gradient(to right, rgba(0,0,0,0.2), transparent 4px), 
      repeating-linear-gradient(
        to bottom,
        #f5f2e8 0, #f5f2e8 0.5px,
        #c7c4bb 0.5px, #c7c4bb 1px
      )`;
  } else {
    pageEdgesStyle.left = `${-edgeThickness}px`;
    pageEdgesStyle.backgroundImage = `
      radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%),
      linear-gradient(to left, rgba(0,0,0,0.2), transparent 4px), 
      repeating-linear-gradient(
        to bottom,
        #f5f2e8 0, #f5f2e8 0.5px,
        #c7c4bb 0.5px, #c7c4bb 1px
      )`;
  }

  return (
    <div className="absolute w-full h-full" style={dropShadows}>
      {/* This is the bottom-most page of the stack */}
      <div className="w-full h-full bg-[#FDFCF5] rounded-md" />
      {/* This is the new, realistic page edge */}
      <div style={pageEdgesStyle} />
    </div>
  );
};


const Flipbook = React.forwardRef<HTMLDivElement, FlipbookProps>(
  ({ pages, currentPage, setCurrentPage, isAnimating, totalPages, exportAnimation }, ref) => {
    const [dragState, setDragState] = useState<{ startX: number; pageIndex: number; angle: number } | null>(null);
    const prevCurrentPage = usePrevious(currentPage);

    const goToNextPage = () => {
      if (currentPage < totalPages - 1) {
        setCurrentPage(currentPage + 1);
      }
    };
    
    const handleInteractionStart = (clientX: number) => {
      if (currentPage < totalPages -1 && !isAnimating && !exportAnimation) {
        setDragState({ startX: clientX, pageIndex: currentPage, angle: 0 });
      }
    };

    const handleInteractionMove = (clientX: number) => {
      if (!dragState) return;
      const dragDistance = clientX - dragState.startX;
      let angle = (dragDistance / 400) * -180;
      angle = Math.max(-180, Math.min(0, angle));
      setDragState({ ...dragState, angle });
    };

    const handleInteractionEnd = () => {
      if (!dragState) return;
      if (dragState.angle < -90) {
        goToNextPage();
      }
      setDragState(null);
    };
    
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => handleInteractionStart(e.clientX);
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => handleInteractionMove(e.clientX);
    const handleMouseUp = () => handleInteractionEnd();
    
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => handleInteractionStart(e.touches[0].clientX);
    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => handleInteractionMove(e.touches[0].clientX);
    const handleTouchEnd = () => handleInteractionEnd();

    const thumbStyle: React.CSSProperties = {
      position: 'absolute',
      top: '65%',
      right: '-40px',
      width: '100px',
      height: '120px',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      transition: 'opacity 0.5s ease-in-out',
      opacity: (currentPage < totalPages - 1 && totalPages > 1 && !exportAnimation) ? 1 : 0,
    };

    const getLeftStackCount = () => {
      if (exportAnimation) {
        return exportAnimation.pageIndex;
      }
      return currentPage;
    };
    
    const getRightStackCount = () => {
      if (exportAnimation) {
         // -1 for the currently turning page, -1 for 0-based index
        return totalPages - exportAnimation.pageIndex - 1;
      }
      return totalPages - currentPage - 1;
    };

    return (
      <div 
        ref={ref}
        className="w-[700px] h-[500px] relative drop-shadow-2xl"
        style={{ perspective: '3000px', transform: 'rotate(-2deg)' }}
      >
        {/* Left (flipped) page stack */}
        <div className="absolute w-full h-full">
          <PageStack count={getLeftStackCount()} side="left" totalPages={totalPages} />
        </div>
        
        {/* Right (unflipped) page stack */}
        <div className="absolute w-full h-full">
          <PageStack count={getRightStackCount()} side="right" totalPages={totalPages} />
        </div>

        <div
          className="w-full h-full relative cursor-grab active:cursor-grabbing select-none"
          style={{ transformStyle: 'preserve-3d' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {pages.map((page, index) => {
            const isFlipped = index < currentPage;
            const isFlipping = dragState?.pageIndex === index;
            
            let zIndex;

            const isTurningNext = prevCurrentPage !== undefined && currentPage > prevCurrentPage && index === prevCurrentPage;
            const isTurningPrev = prevCurrentPage !== undefined && currentPage < prevCurrentPage && index === currentPage;

            if (exportAnimation) {
                zIndex = exportAnimation.pageIndex === index ? totalPages + 1 : (index < exportAnimation.pageIndex ? index + 1 : totalPages - index);
            } else {
                const isManuallyTurning = !isAnimating && (isTurningNext || isTurningPrev);
                zIndex = isFlipping || isManuallyTurning ? totalPages + 1 : (isFlipped ? index + 1 : totalPages - index);
            }

            return (
              <Page
                key={page.id}
                pageData={page}
                isFlipped={isFlipped}
                zIndex={zIndex}
                isFlipping={isFlipping}
                flippingAngle={dragState?.angle ?? 0}
                exportAnimation={exportAnimation}
                isTopPage={index === currentPage}
                totalPages={totalPages}
              />
            );
          })}
        </div>
        
        <div style={thumbStyle}>
          <ThumbIcon />
        </div>
      </div>
    );
  }
);

export default Flipbook;