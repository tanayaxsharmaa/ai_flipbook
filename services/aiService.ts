import { GoogleGenAI, Modality, GenerateContentResponse, Type } from "@google/genai";
import { PageData } from '../types';

// --- AI Client Initialization ---
const API_KEY = process.env.API_KEY;
export const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// --- Helper Functions ---
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

// --- API Service Functions ---

/**
 * Generates a full story with images from a prompt, using a character bible for consistency.
 */
export const generateStory = async (
  storyPrompt: string, 
  artStyle: string, 
  pageCount: number,
  characterBible: string,
  referenceImageUrls: string[],
  onProgress: (progress: { current: number, total: number, task: string }) => void
): Promise<PageData[]> => {
  if (!ai) throw new Error("AI client not initialized.");
  if (referenceImageUrls.length === 0) throw new Error("At least one reference image is required.");

  // 1. Convert Reference Images to Generative Parts to be used in every call
  onProgress({ current: 0, total: pageCount, task: 'Preparing references...' });
  const referenceImageParts = await Promise.all(
    referenceImageUrls.map(url => fileOrUrlToGenerativePart(url))
  );

  // 2. Generate Storyboard with dynamic shot types
  onProgress({ current: 0, total: pageCount, task: 'Creating Storyboard...' });
  const storyboardPrompt = `You are a storyboard artist. Take the following story idea and break it down into exactly ${pageCount} distinct visual scenes for a flipbook. Each scene must be a short, descriptive sentence focusing on a single action and include a camera shot type. The scenes must show a clear, smooth progression. Story: "${storyPrompt}"`;
  
  const storyboardSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        scene: { type: Type.STRING, description: 'A short, descriptive sentence of the action in the scene.' },
        shot: { type: Type.STRING, description: 'The camera shot type (e.g., "wide shot", "medium shot", "close-up").' },
      },
      required: ['scene', 'shot'],
    },
  };

  const storyboardResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: storyboardPrompt,
      config: { responseMimeType: "application/json", responseSchema: storyboardSchema },
  });
  
  let scenes: { scene: string; shot: string; }[];
  try {
      scenes = JSON.parse(storyboardResponse.text);
      // Validate the structure of the response
      if (!Array.isArray(scenes) || scenes.length === 0 || !scenes.every(s => s.scene && s.shot)) {
          throw new Error("AI returned an invalid storyboard structure.");
      }
  } catch(e) {
      console.error("Failed to parse or validate storyboard:", storyboardResponse.text);
      throw new Error(`Failed to generate a valid storyboard. The AI response was not valid JSON. Response: "${storyboardResponse.text}"`);
  }


  // 3. Generate Images using the new consistency-focused architecture
  const newPages: PageData[] = [];
  for (let i = 0; i < scenes.length; i++) {
      onProgress({ current: i + 1, total: scenes.length, task: `Generating Page ${i + 1}...` });
      
      const metaPrompt = `
        MASTER STYLE: ${artStyle}. Keep consistent lighting and color palette across all frames.

        CHARACTER BIBLE: ${characterBible}. Maintain proportions, features, and color palette in every frame.

        REFERENCE IMAGES: [Reference images are attached] — use these as anchors for pose and styling.

        FRAME META: Frame ${i + 1} of ${scenes.length}. Shot: ${scenes[i].shot}.

        INSTRUCTIONS/CONSTRAINTS: Keep the character's silhouette and key features from the reference images unchanged. Do not add extra appendages or change defined colors. Keep the background minimal and consistent.

        PROMPT (scene narrative): ${scenes[i].scene}.
    `;

      const textPart = { text: metaPrompt.trim() };

      const response: GenerateContentResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image-preview',
          contents: { parts: [...referenceImageParts, textPart] },
          config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
      });

      const imageOutputPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (imageOutputPart?.inlineData) {
          const { data, mimeType } = imageOutputPart.inlineData;
          const imageUrl = `data:${mimeType};base64,${data}`;
          const blob = await (await fetch(imageUrl)).blob();
          const objectUrl = URL.createObjectURL(blob);
          newPages.push({ id: i, content: objectUrl, type: 'page' });
      } else {
           throw new Error(`AI failed to generate an image for page ${i + 1}. The AI responded with: "${response.text || 'No text response.'}" Please check your prompt and reference images.`);
      }
  }
  return newPages;
};

/**
 * Edits a single image page based on a prompt.
 */
export const editImage = async (
  page: PageData,
  prompt: string
): Promise<string | null> => {
  if (!ai) throw new Error("AI client not initialized.");

  const imagePart = await fileOrUrlToGenerativePart(page.content);
  const textPart = { text: prompt };
  
  const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: { parts: [imagePart, textPart] },
      config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
  });

  const imageOutputPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (imageOutputPart?.inlineData) {
    const { data, mimeType } = imageOutputPart.inlineData;
    const blob = await (await fetch(`data:${mimeType};base64,${data}`)).blob();
    return URL.createObjectURL(blob);
  }
  return null;
};