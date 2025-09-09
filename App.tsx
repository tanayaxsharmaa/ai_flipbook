import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import Flipbook from './components/Flipbook';
import { PlayIcon, PauseIcon, ReplayIcon, ResetIcon, UploadIcon, NextIcon, PrevIcon, SpeakerIcon, SpinnerIcon, DownloadIcon, VideoIcon, ZipIcon } from './components/Icons';
import EditorPanel from './components/EditorPanel';
import { useFlipbookManagement } from './hooks/useFlipbookManagement';
import { useAnimation } from './hooks/useAnimation';
import { useAiFeatures } from './hooks/useAiFeatures';
import { useAudio } from './hooks/useAudio';
import { useNarration } from './hooks/useNarration';
import { useVideoExport } from './hooks/useVideoExport';
import { downloadSingleImage, downloadAllAsZip } from './utils/downloadUtils';


const App = () => {
  const flipbookRef = useRef<HTMLDivElement>(null);
  const { playFlickSound, startRustlingSound, stopRustlingSound } = useAudio();

  const {
    pagesData,
    originalImages,
    isLoading,
    handleImageUpload,
    handleRevert,
    handleCreateNew,
    setPagesData,
    setOriginalImages,
  } = useFlipbookManagement();

  const totalPages = pagesData.length;

  const {
    currentPage,
    setCurrentPage,
    isAutoplaying,
    setIsAutoplaying,
    animationFinished,
    setAnimationFinished,
    animationSpeed,
    setAnimationSpeed,
    isRewinding,
    handleNextPage,
    handlePrevPage,
    toggleAutoplay,
    handleReset,
  } = useAnimation({ totalPages, playFlickSound });

  const aiFeatures = useAiFeatures({
      pagesData,
      originalImages,
      currentPage,
      setPagesData,
      setOriginalImages,
      setCurrentPage,
      setAnimationFinished,
  });

   const {
    narrationState,
    narrationError,
    handleNarration,
    stopNarration,
  } = useNarration({
    totalPages,
    currentPage,
    setAnimationSpeed,
    setIsAutoplaying,
    setCurrentPage,
    setAnimationFinished,
  });

  const {
    isExporting,
    exportProgress,
    exportAnimation,
    handleExport,
  } = useVideoExport({
    flipbookRef,
    pagesData,
    animationSpeed,
  });

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState('');

  // Effect to handle audio based on autoplay and speed
  useEffect(() => {
    let autoplayTimer: ReturnType<typeof setTimeout>;
    if (isAutoplaying && totalPages > 0) {
      if (animationSpeed < 150) {
        startRustlingSound();
      } else {
        stopRustlingSound();
      }

      autoplayTimer = setInterval(() => {
        if (animationSpeed >= 150) {
          playFlickSound();
        }
        setCurrentPage(prev => {
          if (prev >= totalPages - 1) {
            clearInterval(autoplayTimer);
            setIsAutoplaying(false);
            setAnimationFinished(true);
            stopRustlingSound();
            return prev;
          }
          return prev + 1;
        });
      }, animationSpeed);
    }

    return () => {
      clearInterval(autoplayTimer);
      stopRustlingSound();
    };
  }, [isAutoplaying, totalPages, animationSpeed, setCurrentPage, setIsAutoplaying, setAnimationFinished, playFlickSound, startRustlingSound, stopRustlingSound]);

  // Cleanup narration on unmount
  useEffect(() => {
    return () => {
      stopNarration();
    };
  }, [stopNarration]);
  
  const handleDownloadCurrentPage = useCallback(async () => {
    if (pagesData.length === 0 || currentPage < 0 || currentPage >= pagesData.length) return;
    const pageToDownload = pagesData[currentPage];
    if(pageToDownload) {
      await downloadSingleImage(pageToDownload);
    }
  }, [pagesData, currentPage]);

  const handleDownloadAll = useCallback(async () => {
      if (pagesData.length < 1) return;
      setIsDownloading(true);
      await downloadAllAsZip(pagesData, (message) => setDownloadMessage(message));
      setIsDownloading(false);
      setDownloadMessage('');
  }, [pagesData]);

  const handleCreateNewWithStop = useCallback(() => {
    handleCreateNew(stopNarration);
  }, [handleCreateNew, stopNarration]);
  
  const handleResetWithNarration = useCallback(() => {
    handleReset(narrationState);
  }, [handleReset, narrationState]);

  const toggleAutoplayWithNarration = useCallback(() => {
    toggleAutoplay(narrationState);
  }, [toggleAutoplay, narrationState]);


   if (isLoading) {
     return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600 animate-pulse">Searching for images...</p>
      </div>
    );
  }

  if (pagesData.length === 0 && aiFeatures.editorMode === 'edit') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <header className="mb-8">
          <h1 className="text-6xl md:text-7xl font-heading font-bold tracking-wide text-gray-900">
            Create Your Own Flipbook
          </h1>
          <p className="mt-2 text-xl text-gray-600">
            Upload images or create a new story with AI.
          </p>
        </header>
        <div className="flex space-x-4">
            <label className="px-8 py-4 bg-white text-gray-800 rounded-full shadow-xl hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-sans text-lg">
              Upload Images
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
            <button 
                onClick={() => aiFeatures.setEditorMode('create')}
                disabled={aiFeatures.isProcessing}
                className="px-8 py-4 bg-blue-500 text-white rounded-full shadow-xl hover:bg-blue-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Create with AI
            </button>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Tip: Name your files numerically (e.g., page_01.jpg, page_02.jpg) for correct order.
        </p>
      </div>
    );
  }

  const { Icon: PlayButtonIcon, label: playButtonLabel } = animationFinished
    ? { Icon: ReplayIcon, label: 'Replay Animation' }
    : isAutoplaying
      ? { Icon: PauseIcon, label: 'Pause Autoplay' }
      : { Icon: PlayIcon, label: 'Start Autoplay' };

  const isControlDisabled = isRewinding || isAutoplaying || aiFeatures.isProcessing || isExporting || isDownloading;

  return (
    <>
      {aiFeatures.isProcessing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex flex-col items-center justify-center text-white">
          <h2 className="text-4xl font-heading mb-4">{aiFeatures.processingProgress.task}</h2>
          <div className="w-1/2 bg-gray-600 rounded-full h-4 mb-2">
            <div
              className="bg-blue-500 h-4 rounded-full transition-all duration-300 ease-linear"
              style={{ width: `${(aiFeatures.processingProgress.current / aiFeatures.processingProgress.total) * 100}%` }}
            ></div>
          </div>
          <p className="text-lg">{`Processing ${aiFeatures.processingProgress.current} of ${aiFeatures.processingProgress.total}`}</p>
        </div>
      )}
       {isExporting && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center text-white">
          <h2 className="text-4xl font-heading mb-4">Exporting Video...</h2>
          <div className="w-3/4 max-w-md bg-gray-600 rounded-full h-4 mb-2">
            <div
              className="bg-green-500 h-4 rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${exportProgress}%` }}
            ></div>
          </div>
          <p className="text-lg">{`${Math.round(exportProgress)}% Complete`}</p>
        </div>
      )}
       {isDownloading && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center text-white">
          <SpinnerIcon />
          <h2 className="text-3xl font-heading mt-4">{downloadMessage}</h2>
        </div>
      )}
      <div className="min-h-screen text-gray-800 flex flex-col items-center justify-center p-4 overflow-hidden relative">
        <header className="text-center mb-4 absolute top-8">
          <h1 className="text-6xl md:text-7xl font-heading font-bold tracking-wide text-gray-900">
            AI Flipbook Animator
          </h1>
          <p className="mt-2 text-xl text-gray-600">
            An AI-powered animation experience.
          </p>
        </header>

        <main className="w-full flex flex-col items-center justify-center flex-grow">
          <div className="w-full max-w-7xl flex flex-col lg:flex-row items-center lg:items-start justify-center gap-16 px-4">
            
            <div className="flex-shrink-0 mt-24 lg:mt-0">
               <Flipbook
                ref={flipbookRef}
                pages={pagesData}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                isAnimating={isAutoplaying || isRewinding}
                totalPages={totalPages}
                exportAnimation={exportAnimation}
              />
            </div>
            
             <EditorPanel
                {...aiFeatures}
                pagesData={pagesData}
                originalImages={originalImages}
                handleRevert={handleRevert}
                narrationError={narrationError}
             />
          </div>
        </main>
        
        {/* Revamped Controls */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-auto max-w-[95vw] z-30">
          <div className="flex items-center justify-center gap-4 bg-white/50 backdrop-blur-lg rounded-full shadow-2xl border border-white/40 p-3">
            
            {/* Group 1: Book Controls */}
            <div className="flex items-center gap-2">
              <button
                  onClick={handleCreateNewWithStop}
                  disabled={isControlDisabled}
                  className="control-button w-12 h-12 flex items-center justify-center bg-white/50 text-gray-800 rounded-full shadow-lg hover:bg-white/80 hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                  aria-label="Create New Flipbook"
                >
                  <UploadIcon />
              </button>
               <button
                  onClick={handleResetWithNarration}
                  disabled={isControlDisabled}
                  className="control-button w-12 h-12 flex items-center justify-center bg-white/50 text-gray-800 rounded-full shadow-lg hover:bg-white/80 hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                  aria-label="Reset to First Page"
                >
                  <ResetIcon />
              </button>
              <button
                  onClick={handlePrevPage}
                  disabled={isControlDisabled || currentPage <= 0}
                  className="control-button w-12 h-12 flex items-center justify-center bg-white/50 text-gray-800 rounded-full shadow-lg hover:bg-white/80 hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                  aria-label="Previous Page"
                >
                  <PrevIcon />
              </button>
            </div>
            
            {/* Group 2: Play Button */}
            <div className="flex flex-col items-center mx-2">
                <button
                    onClick={toggleAutoplayWithNarration}
                    disabled={isRewinding || aiFeatures.isProcessing || isExporting}
                    className="control-button w-16 h-16 flex items-center justify-center bg-white text-violet-600 rounded-full shadow-xl hover:bg-violet-50 hover:shadow-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed disabled:hover:shadow-xl"
                    aria-label={playButtonLabel}
                  >
                    <PlayButtonIcon />
                </button>
                 <span className="text-xs font-semibold tracking-wider text-gray-700 mt-1">
                    {totalPages > 0 ? `Page ${currentPage + 1} of ${totalPages}` : 'No Pages'}
                  </span>
            </div>
              
            {/* Group 3: Navigation & Audio */}
            <div className="flex items-center gap-3">
               <button
                  onClick={handleNextPage}
                  disabled={isControlDisabled || currentPage >= totalPages - 1}
                  className="control-button w-12 h-12 flex items-center justify-center bg-white/50 text-gray-800 rounded-full shadow-lg hover:bg-white/80 hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                  aria-label="Next Page"
                >
                  <NextIcon />
              </button>
              <div className="flex items-center gap-2">
                  <button
                      onClick={handleNarration}
                      disabled={isControlDisabled || narrationState === 'generating'}
                      className="control-button w-12 h-12 flex items-center justify-center bg-white/50 text-gray-800 rounded-full shadow-lg hover:bg-white/80 hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Read Story Aloud"
                    >
                      {narrationState === 'generating' ? <SpinnerIcon /> : narrationState === 'playing' ? <PauseIcon/> : <SpeakerIcon />}
                  </button>
                  <div className="w-28">
                    <label htmlFor="speed-slider" className="sr-only">Animation Speed</label>
                    <input
                      id="speed-slider"
                      type="range"
                      min="100"
                      max="350"
                      step="5"
                      value={animationSpeed}
                      onChange={(e) => setAnimationSpeed(Number(e.target.value))}
                      disabled={isControlDisabled}
                      className="w-full speed-slider"
                      aria-label="Animation speed slider"
                    />
                    <div className="flex justify-between text-xs text-gray-600 font-semibold -mt-1">
                      <span>Fast</span>
                      <span>Slow</span>
                    </div>
                  </div>
              </div>
            </div>

            {/* Group 4: Export Actions */}
            <div className="flex items-center gap-2 pl-2">
                <button
                  onClick={handleDownloadCurrentPage}
                  disabled={isControlDisabled || pagesData.length === 0}
                  className="control-button w-12 h-12 flex items-center justify-center bg-white/50 text-gray-800 rounded-full shadow-lg hover:bg-white/80 hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Download Current Page"
                >
                  <DownloadIcon />
                </button>
                <button
                  onClick={handleDownloadAll}
                  disabled={isControlDisabled || pagesData.length < 2}
                  className="control-button w-12 h-12 flex items-center justify-center bg-white/50 text-gray-800 rounded-full shadow-lg hover:bg-white/80 hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Download All as ZIP"
                >
                  <ZipIcon />
                </button>
               <button
                onClick={handleExport}
                disabled={isControlDisabled || pagesData.length < 2}
                className="control-button w-12 h-12 flex items-center justify-center bg-white/50 text-gray-800 rounded-full shadow-lg hover:bg-white/80 hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Export as Video"
              >
                <VideoIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default App;