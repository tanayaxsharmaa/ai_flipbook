import React, { useMemo } from 'react';
import { PageData } from '../types';
import { MagicWandIcon, UndoIcon, AlertTriangleIcon, SparkleIcon } from './Icons';

// This mirrors the props from the useAiFeatures hook, plus a few others
interface EditorPanelProps {
    editorMode: 'edit' | 'create';
    setEditorMode: (mode: 'edit' | 'create') => void;
    aiPrompt: string;
    setAiPrompt: (prompt: string) => void;
    aiEditScope: 'all' | 'current';
    setAiEditScope: (scope: 'all' | 'current') => void;
    storyPrompt: string;
    setStoryPrompt: (prompt: string) => void;
    artStyle: string;
    setArtStyle: (style: string) => void;
    pageCount: number;
    setPageCount: (count: number) => void;
    characterBible: string;
    setCharacterBible: (bible: string) => void;
    referenceFiles: File[];
    isProcessing: boolean;
    aiError: string | null;
    setAiError: (error: string | null) => void;
    handleApplyAiEdit: (prompt: string, scope: 'all' | 'current') => void;
    handleGenerateStory: (prompt: string, style: string, count: number, bible: string, files: File[]) => void;
    handleReferenceFileChange: (files: FileList | null) => void;
    pagesData: PageData[];
    originalImages: PageData[];
    handleRevert: () => void;
    narrationError: string | null;
}

const EditorPanel = ({
    editorMode, setEditorMode,
    aiPrompt, setAiPrompt,
    aiEditScope, setAiEditScope,
    storyPrompt, setStoryPrompt,
    artStyle, setArtStyle,
    pageCount, setPageCount,
    characterBible, setCharacterBible,
    referenceFiles,
    isProcessing,
    aiError, setAiError,
    handleApplyAiEdit,
    handleGenerateStory,
    handleReferenceFileChange,
    pagesData,
    originalImages,
    handleRevert,
    narrationError
}: EditorPanelProps) => {

    const referenceImageUrls = useMemo(() => {
        return referenceFiles.map(file => URL.createObjectURL(file));
    }, [referenceFiles]);

    React.useEffect(() => {
        // Cleanup object URLs when component unmounts or files change
        return () => {
            referenceImageUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [referenceImageUrls]);

    const isStoryGenDisabled = isProcessing || !storyPrompt || !characterBible || referenceFiles.length === 0;

    return (
        <div className="mt-8 lg:mt-0 p-4 bg-gray-800 rounded-lg shadow-lg w-full lg:w-96">
            <div className="flex border-b border-gray-600 mb-4">
                <button onClick={() => setEditorMode('edit')} className={`flex-1 text-center py-2 font-sans font-semibold ${editorMode === 'edit' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400'}`}>Edit Pages</button>
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
                    <button onClick={() => { /* Hook manages its state */ }} className="font-bold text-yellow-200 hover:text-yellow-100" aria-label="Dismiss error">&times;</button>
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
                    onClick={() => handleApplyAiEdit(aiPrompt, aiEditScope)}
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
                    <textarea id="story-prompt" value={storyPrompt} onChange={(e) => setStoryPrompt(e.target.value)} placeholder="e.g., A curious robot discovers a glowing flower..." disabled={isProcessing} rows={2}
                        className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50" />
                </div>
                    <div>
                    <label htmlFor="character-bible" className="block text-sm font-medium text-gray-300 mb-1">Character Bible</label>
                    <textarea id="character-bible" value={characterBible} onChange={(e) => setCharacterBible(e.target.value)} placeholder="Describe your character's appearance, colors, and key features..." disabled={isProcessing} rows={3}
                        className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50" />
                </div>
                <div>
                    <label htmlFor="reference-images" className="block text-sm font-medium text-gray-300 mb-1">Reference Images (1-3)</label>
                    <input id="reference-images" type="file" multiple accept="image/*" onChange={(e) => handleReferenceFileChange(e.target.files)} disabled={isProcessing} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"/>
                        <div className="mt-2 flex space-x-2">
                        {referenceImageUrls.map((url, index) => (
                            <img key={index} src={url} alt={`Reference ${index + 1}`} className="w-16 h-16 object-cover rounded-md border-2 border-gray-500"/>
                        ))}
                    </div>
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
                    <input id="page-count" type="range" min="3" max="10" value={pageCount} onChange={(e) => setPageCount(Number(e.target.value))} disabled={isProcessing} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50"/>
                </div>
                <button
                    onClick={() => handleGenerateStory(storyPrompt, artStyle, pageCount, characterBible, referenceFiles)}
                    disabled={isStoryGenDisabled}
                    className="w-full p-2 bg-green-600 text-white rounded-md shadow-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    <SparkleIcon />
                    <span className="ml-2">Generate Story</span>
                </button>
                    {isStoryGenDisabled && !isProcessing && (
                    <p className="text-xs text-center text-gray-400">Please fill out Story Idea, Character Bible, and upload Reference Image(s) to begin.</p>
                )}
            </div>
            )}
        </div>
    );
};

export default EditorPanel;
