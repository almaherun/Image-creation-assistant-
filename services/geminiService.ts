import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { AspectRatio, Character, SceneGenerationResult } from '../types';
import { apiKeyManager } from './apiKeyManager';

async function withApiKey<T>(apiCall: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
    const initialKey = apiKeyManager.getActiveKey();
    if (!initialKey) {
        throw new Error("لا يوجد مفتاح API. الرجاء إضافة واحد في الإعدادات.");
    }

    let currentKey = initialKey;
    let attempts = 0;
    const totalKeys = apiKeyManager.getAllKeys().length;

    while (attempts < totalKeys) {
        try {
            const ai = new GoogleGenAI({ apiKey: currentKey });
            return await apiCall(ai);
        } catch (error: any) {
            // Check for errors that justify switching keys, like auth or rate limits.
            const isSwitchableError = error.message && (
                error.message.includes('API key not valid') || // Invalid key
                error.message.includes('403') ||                // Forbidden / Auth error
                error.message.includes('429')                   // Rate limit / Quota exceeded
            );

            if (isSwitchableError) {
                console.warn(`API Key starting with "${currentKey.substring(0, 4)}..." failed or is rate-limited. Trying next key.`);
                apiKeyManager.switchToNextKey();
                const nextKey = apiKeyManager.getActiveKey();
                
                if (nextKey === initialKey || !nextKey) {
                    // We've cycled through all keys and they all failed.
                    throw new Error("فشلت جميع مفاتيح API المتاحة أو استنفدت حصتها. الرجاء التحقق من مفاتيحك في الإعدادات.");
                }
                currentKey = nextKey;
                attempts++;
            } else {
                // Not a switchable error, re-throw it.
                throw error;
            }
        }
    }

    throw new Error("فشلت جميع مفاتيح API المتاحة أو استنفدت حصتها. الرجاء التحقق من مفاتيحك في الإعدادات.");
}


export async function generateCharacterImage(prompt: string): Promise<string> {
    return withApiKey(async (ai) => {
        const fullPrompt = `A full-body 3D Pixar-style character portrait of ${prompt}, clean solid light gray background, character reference sheet style.`;
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: fullPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        }
        throw new Error("Failed to generate character image.");
    });
}

export async function editCharacterImage(base64Image: string, prompt: string): Promise<string> {
    return withApiKey(async (ai) => {
        const mimeType = base64Image.substring(base64Image.indexOf(":") + 1, base64Image.indexOf(";"));
        const base64Data = base64Image.split(',')[1];
        
        if (!mimeType || !base64Data) {
            throw new Error("Invalid base64 image format.");
        }
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            }
        }
        
        for (const part of response.candidates[0].content.parts) {
            if (part.text) {
                 throw new Error(`Image editing failed: ${part.text}`);
            }
        }

        throw new Error("Failed to edit character image. The model did not return an image.");
    });
}

export async function refineText(text: string, context: string): Promise<string> {
    return withApiKey(async (ai) => {
        const prompt = `Rewrite and enhance the following text to be more descriptive, clear, and effective. The context is: ${context}. Text: "${text}".`;
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    });
}

export async function refineStoryPrompt(storyPrompt: string): Promise<string> {
    return refineText(storyPrompt, "a story for an animated video");
}

export async function splitStoryIntoScenes(storyPrompt: string, numScenes: number, characters: Character[], sceneDuration: number): Promise<SceneGenerationResult[]> {
    return withApiKey(async (ai) => {
        const characterDescriptions = characters.map(c => `- ${c.name}: ${c.description}`).join('\n');
        const prompt = `
            You are a storyboard assistant. Your task is to process a story and a list of characters to generate a sequence of scenes.

            **Analysis Step:** First, analyze the 'Original Story' provided below.
            - IF the story is already structured with clear scene breaks and contains specific prompts for image generation (e.g., "Scene 1: [image prompt]", "المشهد الأول: [وصف الصورة]"), you MUST use this existing structure and the provided prompts. Extract the image prompt for each scene. Then, based on that image prompt and the story context, generate the corresponding "animationPrompt" and "voiceoverPrompt". The number of scenes should match what's provided in the story; ignore the requested number of scenes.
            - ELSE (if the story is a continuous narrative paragraph), you must break it down into ${numScenes} distinct scenes.

            **Characters involved:**
            ${characterDescriptions}

            **Original Story:**
            """
            ${storyPrompt}
            """

            Based on your analysis, generate a JSON array of scene objects. The final number of scenes should be ${numScenes} if you are creating them, or match the count from the pre-structured story. For each scene, provide the following three properties:
            1.  "imagePrompt": A detailed, professional English prompt for an AI image generator. If the original story provided one, use it as a base and enhance it. To ensure visual consistency, when a character (e.g., "${characters.map(c => c.name).join(', ')}") appears in a scene, you MUST integrate key descriptive elements from their profile in the "Characters involved" section into the prompt. For example, instead of just "Omar is running", it should be something like "Omar, a brave knight with a glowing blue sword, is running". Describe the setting, character actions, emotions, and composition in a cinematic style.
            2.  "animationPrompt": A detailed English prompt for an animator. Describe the camera movement (e.g., "slow pan right", "zoom in on character's face"), character animations, and any environmental effects (e.g., "wind blowing leaves") for a ${sceneDuration} second clip.
            3.  "voiceoverPrompt": A short, narrative script in Arabic for this scene, ready for a voice actor. This is the only part that should be in Arabic.

            The output must be a valid JSON array matching the specified schema.
        `;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            imagePrompt: { type: Type.STRING },
                            animationPrompt: { type: Type.STRING },
                            voiceoverPrompt: { type: Type.STRING },
                        },
                        required: ["imagePrompt", "animationPrompt", "voiceoverPrompt"],
                    },
                },
            },
        });

        try {
            const jsonStr = response.text.trim();
            const scenes = JSON.parse(jsonStr) as SceneGenerationResult[];
            if (!Array.isArray(scenes) || scenes.length === 0) {
                throw new Error("Generated content is not a valid array of scenes.");
            }
            return scenes;
        } catch (e) {
            console.error("Failed to parse scenes from Gemini response:", e);
            console.error("Raw response text:", response.text);
            throw new Error("Could not process the story into scenes. The AI returned an unexpected format.");
        }
    });
}

export async function generateSceneImage(prompt: string, aspectRatio: AspectRatio): Promise<string> {
    return withApiKey(async (ai) => {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: aspectRatio,
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        }
        throw new Error("Failed to generate scene image.");
    });
}

export async function generateCharacterPromptIdeas(): Promise<string[]> {
    return withApiKey(async (ai) => {
        const prompt = `
            Generate 3 distinct and creative character descriptions in English for a 3D animated movie.
            Each description should be detailed, focusing on appearance, clothing, and one key personality trait.
            The output must be a valid JSON array of strings.
            Example: ["A cheerful young sorceress with sparkling purple eyes, wearing a flowing gown made of moonlight and carrying a staff topped with a glowing crystal.", "A grumpy but lovable robot sidekick made of scrap metal, with one big, expressive headlight for an eye and mismatched limbs.", "A stealthy forest ranger with long, braided hair woven with leaves, wearing practical leather armor and carrying a masterfully crafted bow."]
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING,
                    },
                },
            },
        });

        try {
            const jsonStr = response.text.trim();
            const ideas = JSON.parse(jsonStr) as string[];
            if (!Array.isArray(ideas) || ideas.some(i => typeof i !== 'string')) {
                throw new Error("Generated content is not a valid array of strings.");
            }
            return ideas;
        } catch (e) {
            console.error("Failed to parse character ideas from Gemini response:", e);
            console.error("Raw response text:", response.text);
            throw new Error("Could not generate character ideas. The AI returned an unexpected format.");
        }
    });
}

export async function generateStoryPromptIdeas(): Promise<string[]> {
     return withApiKey(async (ai) => {
        const prompt = `
            Generate 3 short story ideas in Arabic, suitable for an animated short film for kids.
            Each idea should be a single paragraph outlining the main character, the setting, and the central conflict.
            The output must be a valid JSON array of strings.
            Example: ["فأر صغير شجاع يدعى 'زيزو' يعيش في مكتبة ضخمة، يحلم بقراءة الكتاب الموجود على أعلى رف. يواجه تحديات مثل القط الحارس 'هرقل' والرفوف العالية ليحقق حلمه ويكتشف سرًا مدهشًا في الكتاب.", "فتاة صغيرة اسمها 'نورة' تكتشف أن غيمتها الأليفة 'غيمة' حزينة لأنها فقدت لونها. تنطلق نورة في رحلة عبر قوس قزح لجمع الألوان المفقودة وإعادة السعادة لغيمتها.", "روبوت طباخ قديم يُدعى 'صدئ' يُلقى في ساحة الخردة. يستخدم مهاراته المبتكرة في الطبخ لإصلاح أصدقائه الروبوتات المكسورين وإنشاء مجتمع جديد ومبهج من الخردة."]
        `;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING,
                    },
                },
            },
        });

         try {
            const jsonStr = response.text.trim();
            const ideas = JSON.parse(jsonStr) as string[];
            if (!Array.isArray(ideas) || ideas.some(i => typeof i !== 'string')) {
                throw new Error("Generated content is not a valid array of strings.");
            }
            return ideas;
        } catch (e) {
            console.error("Failed to parse story ideas from Gemini response:", e);
            console.error("Raw response text:", response.text);
            throw new Error("Could not generate story ideas. The AI returned an unexpected format.");
        }
    });
}