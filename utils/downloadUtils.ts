import { PageData } from '../types';

declare const JSZip: any;

const getFileExtensionFromMimeType = (mimeType: string): string => {
    switch(mimeType) {
        case 'image/jpeg': return 'jpg';
        case 'image/png': return 'png';
        case 'image/gif': return 'gif';
        case 'image/webp': return 'webp';
        default: return 'jpg';
    }
};

export const downloadSingleImage = async (pageData: PageData) => {
    if (!pageData) return;
    try {
        const response = await fetch(pageData.content);
        const blob = await response.blob();
        const extension = getFileExtensionFromMimeType(blob.type);
        const fileName = `page_${String(pageData.id + 1).padStart(2, '0')}.${extension}`;
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    } catch (error) {
        console.error("Failed to download image:", error);
        alert("Could not download the image. Please try again.");
    }
};

export const downloadAllAsZip = async (
    pagesData: PageData[], 
    onProgress: (message: string) => void
) => {
    if (!pagesData || pagesData.length === 0) return;
    
    if (typeof JSZip === 'undefined') {
        const errorMessage = "Error: Zipping library not found.";
        console.error(errorMessage);
        onProgress(errorMessage);
        await new Promise(r => setTimeout(r, 2000));
        return;
    }
    
    try {
        const zip = new JSZip();
        for (const page of pagesData) {
            onProgress(`Zipping page ${page.id + 1} of ${pagesData.length}...`);
            const response = await fetch(page.content);
            const blob = await response.blob();
            const extension = getFileExtensionFromMimeType(blob.type);
            const fileName = `page_${String(page.id + 1).padStart(2, '0')}.${extension}`;
            zip.file(fileName, blob);
        }

        onProgress("Generating ZIP file...");
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = 'flipbook-story.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    } catch (error) {
        const errorMessage = "Error: Failed to create ZIP.";
        console.error("Failed to create ZIP file:", error);
        onProgress(errorMessage);
        await new Promise(r => setTimeout(r, 2000));
    }
};
