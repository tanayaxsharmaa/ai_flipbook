import { useRef, useCallback, useEffect } from 'react';

// Initialize AudioContext only once.
const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;
let rustleNode: AudioBufferSourceNode | null = null;

export const useAudio = () => {
    const createFlickSound = useCallback(() => {
        if (!audioContext) return;
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
    }, []);

    const startRustlingSound = useCallback(() => {
        if (!audioContext || rustleNode || audioContext.state === 'suspended') return;

        const bufferSize = audioContext.sampleRate * 2;
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
    }, []);

    const stopRustlingSound = useCallback(() => {
        if (rustleNode) {
            rustleNode.stop();
            rustleNode.disconnect();
            rustleNode = null;
        }
    }, []);
    
    // Ensure rustling stops on unmount
    useEffect(() => {
        return () => {
            stopRustlingSound();
        }
    }, [stopRustlingSound]);

    return {
        playFlickSound: createFlickSound,
        startRustlingSound,
        stopRustlingSound,
    };
};
