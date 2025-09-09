import { useState, useEffect, useRef } from 'react';
import { PageData } from '../types';
import { discoverInitialImages, cleanupPageBlobs } from '../utils/imageUtils';

export const useFlipbookManagement = () => {
    const [pagesData, setPagesData] = useState<PageData[]>([]);
    const [originalImages, setOriginalImages] = useState<PageData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const pagesDataRef = useRef(pagesData);
    pagesDataRef.current = pagesData;
    const originalImagesRef = useRef(originalImages);
    originalImagesRef.current = originalImages;

    useEffect(() => {
        let ignore = false;
        const loadInitialImages = async () => {
            const imageUrls = await discoverInitialImages();
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
        loadInitialImages();
        return () => { ignore = true; };
    }, []);

    useEffect(() => {
        // Global cleanup on unmount
        return () => {
            cleanupPageBlobs(pagesDataRef.current);
            cleanupPageBlobs(originalImagesRef.current);
        };
    }, []);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

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
    };

    const handleRevert = () => {
        const originalUrls = new Set(originalImages.map(p => p.content));
        const pagesToClean = pagesData.filter(p =>
            p.content.startsWith('blob:') && !originalUrls.has(p.content)
        );
        cleanupPageBlobs(pagesToClean);
        setPagesData(originalImages);
    };

    const handleCreateNew = (stopNarration: () => void) => {
        stopNarration();
        cleanupPageBlobs(pagesData);
        cleanupPageBlobs(originalImages);
        setPagesData([]);
        setOriginalImages([]);
        setIsLoading(false);
    };

    return {
        pagesData,
        setPagesData,
        originalImages,
        setOriginalImages,
        isLoading,
        handleImageUpload,
        handleRevert,
        handleCreateNew,
    };
};
