import { useState, useEffect } from 'react';

interface UseAnimationProps {
    totalPages: number;
    playFlickSound: () => void;
}

export const useAnimation = ({ totalPages, playFlickSound }: UseAnimationProps) => {
    const [currentPage, setCurrentPage] = useState(0);
    const [isAutoplaying, setIsAutoplaying] = useState(false);
    const [animationFinished, setAnimationFinished] = useState(false);
    const [animationSpeed, setAnimationSpeed] = useState(180);
    const [isRewinding, setIsRewinding] = useState(false);

    const handleNextPage = () => {
        if (currentPage < totalPages - 1) {
            playFlickSound();
            setCurrentPage(currentPage + 1);
            setAnimationFinished(false);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 0) {
            playFlickSound();
            setCurrentPage(currentPage - 1);
            setAnimationFinished(false);
        }
    };

    const toggleAutoplay = (narrationState: string) => {
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

    const handleReset = (narrationState: string) => {
        if (narrationState !== 'idle') {
            window.speechSynthesis.cancel();
        }
        if (currentPage > 0 && !isRewinding) {
            setIsAutoplaying(false);
            setIsRewinding(true);
        }
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

    return {
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
    };
};
