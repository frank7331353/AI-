import { GoogleGenAI, Part, Type } from "@google/genai";
import { AspectRatio, ReferenceImage, StoryStyle } from "../types";

// Initialize Gemini Client
// @ts-ignore - process.env.API_KEY is injected by the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Uses Gemini 2.5 Flash to break down a raw script into visual scene descriptions.
 */
export const analyzeScript = async (script: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a professional storyboard artist assistant. 
      Analyze the following story script and break it down into individual visual storyboard shots based on the action, dialogue, and any visual remarks/notes provided in the text.
      
      Rules:
      1. Return ONLY a JSON array of strings.
      2. Each string must be a detailed visual description for one single shot.
      3. Incorporate any specific camera angles or visual notes mentioned in the script (e.g., "close up", "wide shot") into the description.
      4. Do not include scene numbers (like "Scene 1:") or technical prefixes in the output strings, just the visual description.
      5. If the script is just a list of lines, treat each meaningful line as a shot.
      
      Script:
      "${script}"`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from script analysis");
    
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("Invalid format");
    
    return parsed;
  } catch (error) {
    console.error("Script analysis error:", error);
    // Fallback: simple newline split if AI fails
    return script.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  }
};

export const generateSceneImage = async (
  prompt: string,
  aspectRatio: AspectRatio,
  referenceImages: ReferenceImage[],
  style: StoryStyle
): Promise<string> => {
  try {
    const parts: Part[] = [];

    // Add reference images first (multimodal context)
    referenceImages.forEach((img) => {
      parts.push({
        inlineData: {
          data: img.data,
          mimeType: img.mimeType,
        },
      });
    });

    // Define style prompt
    // Default (none) is now Modern Realistic
    let stylePrompt = "modern realistic, cinematic movie still, high quality, photorealistic, 4k, sharp focus, detailed textures";
    
    if (style === 'pixar') {
      stylePrompt = "Pixar 3D animation style, vibrant colors, expressive characters, soft lighting, 3d render, high detail";
    } else if (style === 'ghibli') {
      stylePrompt = "Studio Ghibli style, Miyazaki anime style, hand-painted backgrounds, cel shading, whimsical, detailed, vibrant";
    } else if (style === 'ue5') {
      stylePrompt = "Unreal Engine 5 style, cinematic game cutscene, hyper-realistic, lumen global illumination, nanite details, ray tracing, digital art masterpiece";
    }

    // Add the text prompt with strict constraints against text and borders
    parts.push({
      text: `Generate a full-frame storyboard image.
      Visual Description: ${prompt}.
      Art Style: ${stylePrompt}.
      
      IMPORTANT CONSISTENCY INSTRUCTIONS:
      If reference images are provided above, you MUST strictly strictly use them as the primary source for character appearance (face, hair, clothing) and environmental style. 
      Ensure the characters look consistent with the reference images across all generated shots.
      
      IMPORTANT CONSTRAINTS:
      - NO text, captions, or speech bubbles inside the image.
      - NO split screens or comic book panel layouts.
      - NO borders, frames, or outlines around the image content. 
      - The image must fill the entire canvas area.`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: parts,
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
        },
      },
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const base64EncodeString = part.inlineData.data;
          return `data:image/png;base64,${base64EncodeString}`;
        }
      }
    }

    throw new Error("No image data found in response");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};