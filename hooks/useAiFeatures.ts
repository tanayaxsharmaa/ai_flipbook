import { useState } from 'react';
import { PageData } from '../types';
import { generateStory, editImage, ai } from '../services/aiService';
import { cleanupPageBlobs } from '../utils/imageUtils';

interface UseAiFeaturesProps {
    pagesData: PageData[];
    originalImages: PageData[];
    currentPage: number;
    setPagesData: React.Dispatch<React.SetStateAction<PageData[]>>;
    setOriginalImages: React.Dispatch<React.SetStateAction<PageData[]>>;
    setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
    setAnimationFinished: React.Dispatch<React.SetStateAction<boolean>>;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];


export const useAiFeatures = ({
    pagesData,
    originalImages,
    currentPage,
    setPagesData,
    setOriginalImages,
    setCurrentPage,
    setAnimationFinished,
}: UseAiFeaturesProps) => {
    const [editorMode, setEditorMode] = useState<'edit' | 'create'>('edit');
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiEditScope, setAiEditScope] = useState<'all' | 'current'>('all');
    const [storyPrompt, setStoryPrompt] = useState('');
    const [artStyle, setArtStyle] = useState('Pencil Sketch');
    const [pageCount, setPageCount] = useState(3);
    const [characterBible, setCharacterBible] = useState('');
    const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, task: 'Applying AI Magic...' });
    const [aiError, setAiError] = useState<string | null>(null);

    const handleAiError = (error: unknown) => {
        console.error("AI Action failed:", error);
        let message = "An unknown error occurred. Please try again.";
        if (error instanceof Error) {
            const errorMessage = error.message.toLowerCase();
            if (errorMessage.includes('api key not valid')) {
                message = "Your API Key is invalid or missing. Please check your configuration.";
            } else if (errorMessage.includes('failed to fetch')) {
                message = "Network Error: Could not connect to the AI service. This can be caused by ad-blockers, firewalls, or network issues. Please check your connection and disable any ad-blocking extensions for this site.";
            } else if (errorMessage.includes('safety')) {
                message = "The request was blocked for safety reasons. Please modify your prompt or image and try again.";
            } else if (errorMessage.includes('resource_exhausted')) {
                message = "API Quota Exceeded. You have made too many requests. Please try again later.";
            } else if (errorMessage.includes('api client not initialized')) {
                 message = "AI features are unavailable. The API key is not configured.";
            }
            else {
                message = error.message; // Use the specific error message from the service
            }
        }
        setAiError(message);
    };

    const handleApplyAiEdit = async (prompt: string, scope: 'all' | 'current') => {
        if (!prompt || pagesData.length === 0) return;
        setAiError(null);

        setIsProcessing(true);

        const imagePages = pagesData.filter(p => p.type === 'page');
        const targets = scope === 'all' ? imagePages : [imagePages[currentPage]].filter(Boolean);

        setProcessingProgress({ current: 0, total: targets.length, task: 'Applying AI Magic...' });

        try {
            if (!ai) throw new Error("AI client not initialized.");
            const newPages = [...pagesData];
            const originalUrls = new Set(originalImages.map(p => p.content));

            for (let i = 0; i < targets.length; i++) {
                const page = targets[i];
                setProcessingProgress({ current: i + 1, total: targets.length, task: `Editing Page ${page.id + 1}...` });

                const newUrl = await editImage(page, prompt);

                if (newUrl) {
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

    const handleReferenceFileChange = (files: FileList | null) => {
        if (!files) return;
        setAiError(null);

        const selectedFiles = Array.from(files).slice(0, 3);
        const validFiles: File[] = [];

        for (const file of selectedFiles) {
            if (!ALLOWED_MIME_TYPES.includes(file.type)) {
                setAiError(`Invalid file type: ${file.name}. Please upload JPEG, PNG, WEBP, or GIF files.`);
                return;
            }
            if (file.size > MAX_FILE_SIZE_BYTES) {
                setAiError(`File is too large: ${file.name}. Please upload files smaller than ${MAX_FILE_SIZE_MB}MB.`);
                return;
            }
            validFiles.push(file);
        }
        setReferenceFiles(validFiles);
    };

    const handleGenerateStory = async (prompt: string, style: string, count: number, bible: string, files: File[]) => {
        if (!prompt || !bible || files.length === 0) return;

        setAiError(null);
        setIsProcessing(true);
        setProcessingProgress({ current: 0, total: count, task: 'Generating Story...' });
        
        const referenceUrls = files.map(file => URL.createObjectURL(file));

        try {
            if (!ai) throw new Error("AI client not initialized.");
            const newPages = await generateStory(prompt, style, count, bible, referenceUrls, setProcessingProgress);

            cleanupPageBlobs(pagesData);
            setPagesData(newPages);
            setOriginalImages(JSON.parse(JSON.stringify(newPages)));
            setCurrentPage(0);
            setAnimationFinished(false);

        } catch (error) {
            handleAiError(error);
        } finally {
            setIsProcessing(false);
            referenceUrls.forEach(url => URL.revokeObjectURL(url));
        }
    };

    return {
        editorMode, setEditorMode,
        aiPrompt, setAiPrompt,
        aiEditScope, setAiEditScope,
        storyPrompt, setStoryPrompt,
        artStyle, setArtStyle,
        pageCount, setPageCount,
        characterBible, setCharacterBible,
        referenceFiles, setReferenceFiles,
        isProcessing,
        processingProgress,
        aiError, setAiError,
        handleApplyAiEdit,
        handleGenerateStory,
        handleReferenceFileChange,
    };
};