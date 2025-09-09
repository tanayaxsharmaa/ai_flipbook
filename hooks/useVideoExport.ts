import { useState } from 'react';
import { PageData } from '../types';
declare const html2canvas: any;

interface UseVideoExportProps {
    flipbookRef: React.RefObject<HTMLDivElement>;
    pagesData: PageData[];
    animationSpeed: number;
}

export const useVideoExport = ({ flipbookRef, pagesData, animationSpeed }: UseVideoExportProps) => {
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportAnimation, setExportAnimation] = useState<{ pageIndex: number, progress: number } | null>(null);

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
            videoBitsPerSecond: 8000000,
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
            setExportAnimation(null);
        };

        recorder.start();

        const fps = 30;
        const msPerFrame = 1000 / fps;
        const framesPerPage = Math.max(1, Math.round(animationSpeed / msPerFrame));
        const totalPages = pagesData.length;

        for (let pageIdx = 0; pageIdx < totalPages - 1; pageIdx++) {
            for (let frame = 0; frame < framesPerPage; frame++) {
                const progress = frame / (framesPerPage - 1);

                setExportAnimation({ pageIndex: pageIdx, progress });
                setExportProgress(((pageIdx + progress) / (totalPages - 1)) * 100);

                await new Promise(r => setTimeout(r, 0));

                const captureCanvas = await html2canvas(flipbookElement, {
                    useCORS: true,
                    backgroundColor: null,
                    logging: false,
                });

                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(captureCanvas, 0, 0, width, height);

                await new Promise(r => setTimeout(r, msPerFrame / 2));
            }
        }

        setExportAnimation({ pageIndex: totalPages - 1, progress: 0 });
        setExportProgress(100);
        await new Promise(r => setTimeout(r, 0));
        const captureCanvas = await html2canvas(flipbookElement, { useCORS: true, backgroundColor: null, logging: false });
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(captureCanvas, 0, 0, width, height);
        await new Promise(r => setTimeout(r, 500));

        recorder.stop();
    };

    return {
        isExporting,
        exportProgress,
        exportAnimation,
        handleExport,
    };
};
