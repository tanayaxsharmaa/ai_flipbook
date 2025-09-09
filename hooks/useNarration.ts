import { useState, useRef, useCallback } from 'react';

interface UseNarrationProps {
    totalPages: number;
    currentPage: number;
    setAnimationSpeed: (speed: number) => void;
    setIsAutoplaying: (autoplaying: boolean) => void;
    setCurrentPage: (page: number) => void;
    setAnimationFinished: (finished: boolean) => void;
}

export const useNarration = ({
    totalPages,
    currentPage,
    setAnimationSpeed,
    setIsAutoplaying,
    setCurrentPage,
    setAnimationFinished,
}: UseNarrationProps) => {
    const [narrationState, setNarrationState] = useState<'idle' | 'generating' | 'playing' | 'error'>('idle');
    const [narrationError, setNarrationError] = useState<string | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const stopNarration = useCallback(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        setNarrationState('idle');
        setNarrationError(null);
    }, []);

    const handleNarration = () => {
        if (narrationState === 'generating' || narrationState === 'playing') {
            stopNarration();
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

        const words = storyScript.split(' ').length;
        const wordsPerMinute = 160;
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
            if (currentPage < totalPages - 1) {
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

    return {
        narrationState,
        narrationError,
        handleNarration,
        stopNarration,
    };
};
