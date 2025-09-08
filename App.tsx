import React, { useState, useCallback, useEffect, useRef } from 'react';
import Flipbook from './components/Flipbook';
import { PageData } from './types';
import { PlayIcon, PauseIcon, ReplayIcon, ResetIcon, UploadIcon, MagicWandIcon, UndoIcon, AlertTriangleIcon, NextIcon, PrevIcon, SpeakerIcon, SpinnerIcon, DownloadIcon, SparkleIcon } from './components/Icons';
import { GoogleGenAI, Modality, GenerateContentResponse, Type } from "@google/genai";

declare const html2canvas: any;

const cleanupPageBlobs = (pages: PageData[]) => {
  pages.forEach(page => {
    if (page.type === 'page' && page.content.startsWith('blob:')) {
      URL.revokeObjectURL(page.content);
    }
  });
};

// --- Audio Engine ---
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
let rustleNode: AudioBufferSourceNode | null = null;

const createFlickSound = () => {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'whitenoise';
  gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.1);
};

const startRustlingSound = () => {
  if (rustleNode || audioContext.state === 'suspended') return;
  
  const bufferSize = audioContext.sampleRate * 2; // 2 seconds of noise
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  rustleNode = audioContext.createBufferSource();
  rustleNode.buffer = buffer;
  rustleNode.loop = true;
  
  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0.01, audioContext.currentTime);
  
  rustleNode.connect(gainNode);
  gainNode.connect(audioContext.destination);
  rustleNode.start();
};

const stopRustlingSound = () => {
  if (rustleNode) {
    rustleNode.stop();
    rustleNode.disconnect();
    rustleNode = null;
  }
};
// --- End Audio Engine ---

const App = () => {
  const [pagesData, setPagesData] = useState<PageData[]>([]);
  const [originalImages, setOriginalImages] = useState<PageData[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isAutoplaying, setIsAutoplaying] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(180);
  const [isRewinding, setIsRewinding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // AI State
  const [editorMode, setEditorMode] = useState<'edit' | 'create'>('edit');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiEditScope, setAiEditScope] = useState<'all' | 'current'>('all');
  const [storyPrompt, setStoryPrompt] = useState('');
  const [artStyle, setArtStyle] = useState('Pencil Sketch');
  const [pageCount, setPageCount] = useState(24);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, task: 'Applying AI Magic...' });
  const [aiError, setAiError] = useState<string | null>(null);
  
  const [narrationState, setNarrationState] = useState<'idle' | 'generating' | 'playing' | 'error'>('idle');
  const [narrationError, setNarrationError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportAnimation, setExportAnimation] = useState<{ pageIndex: number, progress: number } | null>(null);


  const totalPages = pagesData.length;
  const pagesDataRef = useRef(pagesData);
  pagesDataRef.current = pagesData;
  const originalImagesRef = useRef(originalImages);
  originalImagesRef.current = originalImages;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const flipbookRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ignore = false;
    const discoverImages = async () => {
      const imageUrls: string[] = [];
      const extensions = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'JPEG', 'JPG', 'PNG', 'GIF', 'WEBP'];
      let pageIndex = 1;

      const probeImage = (url: string): Promise<string> => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => reject();
        img.src = url;
      });

      while (true) {
        const pageNum = String(pageIndex).padStart(2, '0');
        const probes = extensions.map(ext => probeImage(`/images/page_${pageNum}.${ext}`));
        try {
          const foundUrl = await Promise.race(probes);
          imageUrls.push(foundUrl);
          pageIndex++;
        } catch (error) { break; }
      }

      if (!ignore) {
        if (imageUrls.length > 0) {
          const generatedPages: PageData[] = imageUrls.map((url, index) => ({
            id: index,
            content: url,
            type: 'page' as const,
          }));
          setPagesData(generatedPages);
          setOriginalImages(JSON.parse(JSON.stringify(generatedPages)));
        }
        setIsLoading(false);
      }
    };
    discoverImages();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    return () => {
      cleanupPageBlobs(pagesDataRef.current);
      cleanupPageBlobs(originalImagesRef.current);
      window.speechSynthesis?.cancel();
      stopRustlingSound();
    };
  }, []);

  const stopNarration = () => {
    window.speechSynthesis?.cancel();
    setNarrationState('idle');
    setNarrationError(null);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    stopNarration();
    cleanupPageBlobs(pagesData);
    cleanupPageBlobs(originalImages);

    const fileArray = Array.from(files).sort((a, b) => {
      const numA = parseInt(a.name.replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(b.name.replace(/[^0-9]/g, ''), 10) || 0;
      return numA - numB;
    });
    
    const imageUrls = fileArray.map(file => URL.createObjectURL(file));
    const generatedPages: PageData[] = imageUrls.map((url, index) => ({
        id: index,
        content: url,
        type: 'page' as const,
    }));
    
    setPagesData(generatedPages);
    setOriginalImages(JSON.parse(JSON.stringify(generatedPages)));
    setCurrentPage(0);
    setIsAutoplaying(false);
    setAnimationFinished(false);
    setIsRewinding(false);
    setAiError(null);
  };

  const fileOrUrlToGenerativePart = (url: string): Promise<{inlineData: {data: string, mimeType: string}}> => {
    return new Promise((resolve, reject) => {
      fetch(url)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve({ inlineData: { data: base64, mimeType: blob.type }});
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
        .catch(reject);
    });
  };
  
  const handleAiError = (error: unknown) => {
      console.error("AI Action failed:", error);
      let message = "An unknown error occurred. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes('API key not valid')) {
            message = "Your API Key is invalid or missing. Please check your configuration.";
        } else if (error.message.includes('fetch')) {
            message = "Network Connection Error. The request to the AI service was blocked. This is often caused by browser security (CORS), ad blockers, or a network firewall. Please check your internet connection and try disabling any ad-blocking extensions for this site.";
        } else if (error.message.toUpperCase().includes('SAFETY')) {
            message = "The request was blocked for safety reasons. Please modify your prompt or image.";
        } else if (error.message.toUpperCase().includes('RESOURCE_EXHAUSTED')) {
            message = "API Quota Exceeded. You have made too many requests. Please check your plan with the API provider or try again later.";
        } else {
            message = `Action failed: ${error.message}. Check the console for more details.`;
        }
      }
      setAiError(message);
  }

  const handleApplyAiEdit = async () => {
    if (!aiPrompt || pagesData.length === 0) return;
    
    setAiError(null);
    const apiKey = "AIzaSyBTjmL_aCLX_Cs9GTHfT0oxKkGruvA7fXQ";
    if (!apiKey) {
      setAiError("API Key is not configured. Please check your setup.");
      return;
    }

    setIsProcessing(true);
    
    const imagePages = pagesData.filter(p => p.type === 'page');
    const targets = aiEditScope === 'all' ? imagePages : [imagePages[currentPage]].filter(Boolean);
    
    setProcessingProgress({ current: 0, total: targets.length, task: 'Applying AI Magic...' });

    try {
      const ai = new GoogleGenAI({ apiKey });
      const newPages = [...pagesData];
      const originalUrls = new Set(originalImages.map(p => p.content));

      for (let i = 0; i < targets.length; i++) {
        const page = targets[i];
        setProcessingProgress({ current: i + 1, total: targets.length, task: `Editing Page ${page.id + 1}...` });

        const imagePart = await fileOrUrlToGenerativePart(page.content);
        const textPart = { text: aiPrompt };
        
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [imagePart, textPart] },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });

        const imageOutputPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imageOutputPart?.inlineData) {
          const { data, mimeType } = imageOutputPart.inlineData;
          const blob = await (await fetch(`data:${mimeType};base64,${data}`)).blob();
          const newUrl = URL.createObjectURL(blob);

          const pageIndexInNewPages = newPages.findIndex(p => p.id === page.id);
          if (pageIndexInNewPages !== -1) {
            const oldUrl = newPages[pageIndexInNewPages].content;
            if (oldUrl.startsWith('blob:') && !originalUrls.has(oldUrl)) {
               URL.revokeObjectURL(oldUrl);
            }
            newPages[pageIndexInNewPages] = { ...newPages[pageIndexInNewPages], content: newUrl };
            setPagesData([...newPages]);
          }
        }
      }
    } catch (error) {
      handleAiError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateStory = async () => {
    if (!storyPrompt) return;

    setAiError(null);
    const apiKey = "AIzaSyBTjmL_aCLX_Cs9GTHfT0oxKkGruvA7fXQ";
    if (!apiKey) {
        setAiError("API Key is not configured. Please check your setup.");
        return;
    }

    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: pageCount, task: 'Generating Story...' });

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        // 1. Generate Storyboard
        setProcessingProgress({ current: 0, total: pageCount, task: 'Creating Storyboard...' });
        const storyboardPrompt = `You are a storyboard artist. Take the following story idea and break it down into exactly ${pageCount} distinct visual scenes for a flipbook. Each scene must be a short, descriptive sentence focusing on a single action. The scenes must show a clear, smooth progression. Respond with only a JSON array of strings. Story: "${storyPrompt}"`;
        const storyboardResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: storyboardPrompt,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING }}},
        });
        
        const scenes = JSON.parse(storyboardResponse.text);
        if (!Array.isArray(scenes) || scenes.length === 0) {
            throw new Error("Failed to generate a valid storyboard from the AI.");
        }

        // 2. Generate Images
        cleanupPageBlobs(pagesData); // Clean up old images
        const newPages: PageData[] = [];

        for (let i = 0; i < scenes.length; i++) {
            setProcessingProgress({ current: i + 1, total: scenes.length, task: `Generating Page ${i + 1}...` });
            const imagePrompt = `${scenes[i]}. Style: ${artStyle}.`;
            
            const imageResponse = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: imagePrompt,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg' },
            });
            
            const base64ImageBytes: string = imageResponse.generatedImages[0].image.imageBytes;
            const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
            const blob = await (await fetch(imageUrl)).blob();
            const newUrl = URL.createObjectURL(blob);
            
            newPages.push({ id: i, content: newUrl, type: 'page' });
        }
        
        setPagesData(newPages);
        setOriginalImages(JSON.parse(JSON.stringify(newPages)));
        setCurrentPage(0);
        setAnimationFinished(false);

    } catch (error) {
        handleAiError(error);
    } finally {
        setIsProcessing(false);
    }
};
  
  const handleRevert = () => {
    const originalUrls = new Set(originalImages.map(p => p.content));
    const pagesToClean = pagesData.filter(p => 
      p.content.startsWith('blob:') && !originalUrls.has(p.content)
    );
    cleanupPageBlobs(pagesToClean);

    setPagesData(originalImages);
    setAiPrompt('');
    setAiError(null);
  };

  const handleCreateNew = () => {
    stopNarration();
    cleanupPageBlobs(pagesData);
    cleanupPageBlobs(originalImages);
    setPagesData([]);
    setOriginalImages([]);
    setCurrentPage(0);
    setIsLoading(false);
    setAiError(null);
  };

  const handleNarration = () => {
    if (narrationState === 'generating' || narrationState === 'playing') {
      window.speechSynthesis.cancel();
      setIsAutoplaying(false);
      return;
    }

    if (totalPages <= 1) {
      setNarrationError("There are no pages to narrate.");
      return;
    }
    if (!('speechSynthesis' in window)) {
      setNarrationState('error');
      setNarrationError("Sorry, your browser does not support text-to-speech.");
      return;
    }

    setNarrationState('generating');
    setNarrationError(null);
    setCurrentPage(0);
    setAnimationFinished(false);
    setIsAutoplaying(false);
    
    const storyScript = "Once upon a time, in a world woven from dreams and ink, there was a magical flipbook. This was no ordinary book. With a whisper of AI magic, its pages could dance and stories would unfold. Join us now, as we turn the first page and begin a wonderful adventure. Watch closely, as each new image builds upon the last, creating a silent symphony of motion. What tale will it tell? Only the turning of the pages knows. And so, our story comes to a gentle close. The end.";

    // Estimate duration for animation pacing
    const words = storyScript.split(' ').length;
    const wordsPerMinute = 160; // Average reading speed
    const durationInSeconds = (words / wordsPerMinute) * 60;
    const speed = (durationInSeconds * 1000) / (totalPages > 1 ? totalPages - 1 : 1);
    setAnimationSpeed(speed);

    const utterance = new SpeechSynthesisUtterance(storyScript);
    utteranceRef.current = utterance;

    utterance.onstart = () => {
      setIsAutoplaying(true);
      setNarrationState('playing');
    };

    utterance.onend = () => {
      setNarrationState('idle');
      utteranceRef.current = null;
      // Let animation finish if it's on the last turn
      if (currentPage < totalPages -1) {
        setIsAutoplaying(false);
      }
    };

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event.error);
      setNarrationState('error');
      setNarrationError(`Speech error: ${event.error}`);
      utteranceRef.current = null;
    };
    
    const setVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            const preferredVoice = voices.find(voice => voice.name.includes('Google') && voice.lang.startsWith('en')) || voices.find(voice => voice.lang.startsWith('en-US')) || voices.find(voice => voice.default) || voices[0];
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }
            window.speechSynthesis.speak(utterance);
        }
    };
    
    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = setVoiceAndSpeak;
    } else {
        setVoiceAndSpeak();
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      createFlickSound();
      setCurrentPage(currentPage + 1);
      setAnimationFinished(false);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      createFlickSound();
      setCurrentPage(currentPage - 1);
      setAnimationFinished(false);
    }
  };

  const toggleAutoplay = () => {
    if (animationFinished) {
      setAnimationFinished(false);
      setCurrentPage(0);
      setIsAutoplaying(true);
    } else {
      const newIsAutoplaying = !isAutoplaying;
      setIsAutoplaying(newIsAutoplaying);
      if (narrationState === 'playing') {
        if (newIsAutoplaying) {
          if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        } else {
          window.speechSynthesis.pause();
        }
      }
    }
  };

  const handleReset = () => {
    if (narrationState !== 'idle') {
        window.speechSynthesis.cancel();
    }
    if (currentPage > 0 && !isRewinding) {
      setIsAutoplaying(false);
      setIsRewinding(true);
    }
  };

  const handleExport = async () => {
    const flipbookElement = flipbookRef.current;
    if (!flipbookElement || pagesData.length < 2 || isExporting) {
      return;
    }
    
    setIsExporting(true);
    setExportProgress(0);

    const recordingCanvas = document.createElement('canvas');
    const { width, height } = flipbookElement.getBoundingClientRect();
    recordingCanvas.width = width;
    recordingCanvas.height = height;
    const ctx = recordingCanvas.getContext('2d');
    if (!ctx) {
      console.error("Could not get canvas context");
      setIsExporting(false);
      return;
    }
    
    const stream = recordingCanvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 8000000, // 8 Mbps for high quality
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'flipbook-animation.webm';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsExporting(false);
      setExportAnimation(null); // Cleanup
    };

    recorder.start();
    
    const fps = 30;
    const msPerFrame = 1000 / fps;
    const framesPerPage = Math.max(1, Math.round(animationSpeed / msPerFrame));
    
    for (let pageIdx = 0; pageIdx < totalPages - 1; pageIdx++) {
      for (let frame = 0; frame < framesPerPage; frame++) {
        const progress = frame / (framesPerPage - 1);
        
        setExportAnimation({ pageIndex: pageIdx, progress });
        setExportProgress(((pageIdx + progress) / (totalPages - 1)) * 100);

        // Wait for React to re-render with the new animation state
        await new Promise(r => setTimeout(r, 0));

        const captureCanvas = await html2canvas(flipbookElement, {
          useCORS: true,
          backgroundColor: null,
          logging: false,
        });

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(captureCanvas, 0, 0, width, height);

        // Allow some time for drawing
        await new Promise(r => setTimeout(r, msPerFrame / 2));
      }
    }
    
    // Hold last frame
    setExportAnimation({ pageIndex: totalPages - 1, progress: 0 });
    setExportProgress(100);
    await new Promise(r => setTimeout(r, 0));
    const captureCanvas = await html2canvas(flipbookElement, { useCORS: true, backgroundColor: null, logging: false });
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(captureCanvas, 0, 0, width, height);
    await new Promise(r => setTimeout(r, 500));

    recorder.stop();
  };

  useEffect(() => {
    if (isRewinding) {
      const timer = setInterval(() => {
        setCurrentPage(prev => {
          if (prev <= 0) {
            clearInterval(timer);
            setIsRewinding(false);
            setAnimationFinished(false);
            return 0;
          }
          return prev - 1;
        });
      }, 50);
      return () => clearInterval(timer);
    }
  }, [isRewinding]);

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
          createFlickSound();
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
  }, [isAutoplaying, totalPages, animationSpeed]);

  
   if (isLoading) {
     return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-xl text-gray-600 animate-pulse">Searching for images...</p>
      </div>
    );
  }

  if (pagesData.length === 0 && editorMode === 'edit') {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center text-center p-4">
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
                onClick={() => setEditorMode('create')}
                className="px-8 py-4 bg-blue-500 text-white rounded-full shadow-xl hover:bg-blue-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans text-lg"
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

  const isControlDisabled = isRewinding || isAutoplaying || isProcessing || isExporting;

  return (
    <>
      {isProcessing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex flex-col items-center justify-center text-white">
          <h2 className="text-4xl font-heading mb-4">{processingProgress.task}</h2>
          <div className="w-1/2 bg-gray-600 rounded-full h-4 mb-2">
            <div
              className="bg-blue-500 h-4 rounded-full transition-all duration-300 ease-linear"
              style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
            ></div>
          </div>
          <p className="text-lg">{`Processing ${processingProgress.current} of ${processingProgress.total}`}</p>
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
      <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col items-center justify-center p-4 overflow-hidden">
        <header className="text-center mb-4">
          <h1 className="text-6xl md:text-7xl font-heading font-bold tracking-wide text-gray-900">
            AI Flipbook Animator
          </h1>
          <p className="mt-2 text-xl text-gray-600">
            An AI-powered animation experience.
          </p>
        </header>

        <main className="w-full flex flex-col items-center">
          <div className="w-full max-w-7xl flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 px-4">
            
            <div className="flex-shrink-0">
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
            
            <div className="mt-8 lg:mt-0 p-4 bg-gray-800 rounded-lg shadow-lg w-full lg:w-96">
                <div className="flex border-b border-gray-600 mb-4">
                    <button onClick={() => setEditorMode('edit')} className={`flex-1 text-center py-2 font-sans font-semibold ${editorMode === 'edit' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400'}`}>Edit Current</button>
                    <button onClick={() => setEditorMode('create')} className={`flex-1 text-center py-2 font-sans font-semibold ${editorMode === 'create' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400'}`}>Create New Story</button>
                </div>

              {aiError && (
                 <div className="bg-red-900/50 border border-red-700 text-red-200 px-3 py-2 rounded-md mb-3 text-sm" role="alert">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <AlertTriangleIcon />
                            <strong className="font-bold ml-2">AI Error</strong>
                        </div>
                        <button onClick={() => setAiError(null)} className="font-bold text-red-200 hover:text-red-100" aria-label="Dismiss error">&times;</button>
                    </div>
                    <p className="mt-1 ml-8">{aiError}</p>
                </div>
              )}
               {narrationError && (
                <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-200 px-3 py-2 rounded-md mb-3 text-sm" role="alert">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <AlertTriangleIcon />
                            <strong className="font-bold ml-2">Narration Error</strong>
                        </div>
                        <button onClick={() => setNarrationError(null)} className="font-bold text-yellow-200 hover:text-yellow-100" aria-label="Dismiss error">&times;</button>
                    </div>
                    <p className="mt-1 ml-8">{narrationError}</p>
                </div>
              )}
              
              {editorMode === 'edit' ? (
                 <div className="flex flex-col space-y-3">
                    <h3 className="text-xl font-bold font-sans text-center text-white mb-2">
                      ✨ AI Magic Editor
                    </h3>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g., make the character wear a red hat..."
                      disabled={isProcessing || pagesData.length === 0}
                      rows={3}
                      className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                    />
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Apply to:</label>
                        <div className="flex items-center space-x-2 bg-gray-700 rounded-md p-1">
                          <button onClick={() => setAiEditScope('all')} className={`flex-1 text-center text-sm py-1 rounded-md transition-colors ${aiEditScope === 'all' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>All Pages</button>
                          <button onClick={() => setAiEditScope('current')} className={`flex-1 text-center text-sm py-1 rounded-md transition-colors ${aiEditScope === 'current' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Current Page</button>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleApplyAiEdit}
                        disabled={isProcessing || !aiPrompt || pagesData.length === 0}
                        className="flex-grow p-2 bg-blue-500 text-white rounded-md shadow-md hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        <MagicWandIcon />
                        <span className="ml-2">Apply</span>
                      </button>
                      <button
                        onClick={handleRevert}
                        disabled={isProcessing || originalImages.length === 0 || pagesData === originalImages}
                        className="p-2 bg-gray-500 text-white rounded-md shadow-md hover:bg-gray-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                        aria-label="Revert to original images"
                      >
                        <UndoIcon />
                      </button>
                    </div>
                 </div>
              ) : (
                <div className="flex flex-col space-y-4">
                    <h3 className="text-xl font-bold font-sans text-center text-white mb-1">
                      📖 Create a Story with AI
                    </h3>
                    <div>
                        <label htmlFor="story-prompt" className="block text-sm font-medium text-gray-300 mb-1">Story Idea</label>
                        <textarea
                            id="story-prompt"
                            value={storyPrompt}
                            onChange={(e) => setStoryPrompt(e.target.value)}
                            placeholder="e.g., A curious robot discovers a glowing flower..."
                            disabled={isProcessing}
                            rows={3}
                            className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                        />
                    </div>
                     <div>
                        <label htmlFor="art-style" className="block text-sm font-medium text-gray-300 mb-1">Art Style</label>
                        <select id="art-style" value={artStyle} onChange={(e) => setArtStyle(e.target.value)} disabled={isProcessing} className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50">
                            <option>Pencil Sketch</option>
                            <option>Watercolor</option>
                            <option>Ink Drawing</option>
                            <option>Cartoon</option>
                            <option>Vintage</option>
                            <option>Pixel Art</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="page-count" className="block text-sm font-medium text-gray-300 mb-1">Number of Pages ({pageCount})</label>
                        <input id="page-count" type="range" min="12" max="50" value={pageCount} onChange={(e) => setPageCount(Number(e.target.value))} disabled={isProcessing} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50"/>
                    </div>
                    <button
                        onClick={handleGenerateStory}
                        disabled={isProcessing || !storyPrompt}
                        className="w-full p-2 bg-green-600 text-white rounded-md shadow-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        <SparkleIcon />
                        <span className="ml-2">Generate Story</span>
                    </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-center space-x-2 sm:space-x-4 mt-8 w-full max-w-2xl">
              <button
                onClick={handleCreateNew}
                disabled={isControlDisabled}
                className="control-button p-3 bg-white text-gray-600 rounded-full shadow-lg hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Create New Flipbook"
              >
                <UploadIcon />
              </button>
               <button
                onClick={handlePrevPage}
                disabled={isControlDisabled || currentPage <= 0}
                className="control-button p-3 bg-white text-gray-600 rounded-full shadow-lg hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous Page"
              >
                <PrevIcon />
              </button>
                
              <div className="flex-grow flex items-center space-x-2">
                   <button
                    onClick={handleNarration}
                    disabled={isControlDisabled || narrationState === 'generating'}
                    className="control-button p-4 bg-white text-gray-800 rounded-full shadow-xl hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    aria-label="Read Story Aloud"
                  >
                    {narrationState === 'generating' ? <SpinnerIcon /> : <SpeakerIcon />}
                  </button>
                  <button
                    onClick={toggleAutoplay}
                    disabled={isRewinding || isProcessing || isExporting}
                    className="control-button p-4 bg-white text-gray-800 rounded-full shadow-xl hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    aria-label={playButtonLabel}
                  >
                    <PlayButtonIcon />
                  </button>
                  <div className="w-full pt-2">
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
                        className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                        aria-label="Animation speed slider"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Fast</span>
                        <span>Slow</span>
                      </div>
                  </div>
              </div>
              <div className="flex flex-col items-center justify-center w-28">
                  <span className="text-gray-700 font-sans font-semibold">
                    {`Page ${currentPage + 1} of ${totalPages}`}
                  </span>
              </div>
              <button
                onClick={handleNextPage}
                disabled={isControlDisabled || currentPage >= totalPages - 1}
                className="control-button p-3 bg-white text-gray-600 rounded-full shadow-lg hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next Page"
              >
                <NextIcon />
              </button>
               <button
                onClick={handleExport}
                disabled={isControlDisabled || pagesData.length < 2}
                className="control-button p-3 bg-white text-gray-600 rounded-full shadow-lg hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Export as Video"
              >
                <DownloadIcon />
              </button>
              <button
                onClick={handleReset}
                disabled={isControlDisabled}
                className="control-button p-3 bg-white text-gray-600 rounded-full shadow-lg hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Reset to First Page"
              >
                <ResetIcon />
              </button>
          </div>

        </main>
      </div>
    </>
  );
};

export default App;