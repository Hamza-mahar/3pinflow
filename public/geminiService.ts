
import { GoogleGenAI, Type } from "@google/genai";
import { CampaignResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const CAMPAIGN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    results: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sourceUrl: { type: Type.STRING },
          analysis: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              coreContent: { type: Type.STRING },
              primaryKeyword: { type: Type.STRING },
              secondaryKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              searchIntent: { type: Type.STRING },
              mainBenefits: { type: Type.ARRAY, items: { type: Type.STRING } },
              targetAudience: { type: Type.STRING },
              visualAngleOpportunities: { type: Type.STRING }
            },
            required: ["topic", "coreContent", "primaryKeyword", "secondaryKeywords", "searchIntent", "mainBenefits", "targetAudience", "visualAngleOpportunities"]
          },
          variations: {
            type: Type.ARRAY,
            minItems: 3,
            maxItems: 3,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Must be 60-70 characters exactly." },
                description: { type: Type.STRING, description: "Must be 2-4 sentences and include 1-2 relevant hashtags." },
                altText: { type: Type.STRING },
                suggestedBoards: { type: Type.ARRAY, items: { type: Type.STRING } },
                keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Generate 4-8 high-intent Pinterest keywords." },
                strategy: {
                  type: Type.OBJECT,
                  properties: {
                    seoAngle: { type: Type.STRING },
                    emotionalTrigger: { type: Type.STRING },
                    headlineStyle: { type: Type.STRING },
                    visualStyle: { type: Type.STRING },
                    targetUserLevel: { type: Type.STRING, enum: ['Beginner', 'Advanced', 'All'] },
                    intentType: { type: Type.STRING, enum: ['Informational', 'Commercial'] }
                  },
                  required: ["seoAngle", "emotionalTrigger", "headlineStyle", "visualStyle", "targetUserLevel", "intentType"]
                },
                visualStrategy: {
                  type: Type.OBJECT,
                  properties: {
                    styleType: { type: Type.STRING, enum: ['Lifestyle', 'Editorial', 'Collage', 'StepFeature', 'CloseUpWide'] },
                    compositionParams: {
                      type: Type.OBJECT,
                      properties: {
                        cameraAngle: { type: Type.STRING },
                        distance: { type: Type.STRING, enum: ['Close-up', 'Medium', 'Wide'] },
                        lighting: { type: Type.STRING, enum: ['Warm', 'Neutral', 'Bright', 'Dramatic'] }
                      },
                      required: ["cameraAngle", "distance", "lighting"]
                    },
                    textOverlay: { type: Type.STRING, description: "High-impact scroll-stopping headline." },
                    supportingText: { type: Type.STRING },
                    imagePrompt: { type: Type.STRING, description: "Subject detail only. The layout will be handled by the variation engine." },
                    colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["styleType", "compositionParams", "textOverlay", "imagePrompt", "colorPalette"]
                },
                performanceIntelligence: {
                  type: Type.OBJECT,
                  properties: {
                    viralHook: { type: Type.STRING },
                    ctrBooster: { type: Type.STRING },
                    distributionVelocity: { type: Type.STRING }
                  },
                  required: ["viralHook", "ctrBooster", "distributionVelocity"]
                },
                experimentationLayer: {
                  type: Type.OBJECT,
                  properties: {
                    hypothesis: { type: Type.STRING },
                    testMetric: { type: Type.STRING },
                    winnerAction: { type: Type.STRING }
                  },
                  required: ["hypothesis", "testMetric", "winnerAction"]
                },
                authorityLayer: {
                  type: Type.OBJECT,
                  properties: {
                    nicheDominance: { type: Type.STRING },
                    trustSignal: { type: Type.STRING },
                    stabilityStrategy: { type: Type.STRING }
                  },
                  required: ["nicheDominance", "trustSignal", "stabilityStrategy"]
                }
              },
              required: ["title", "description", "altText", "suggestedBoards", "keywords", "strategy", "visualStrategy", "performanceIntelligence", "experimentationLayer", "authorityLayer"]
            }
          }
        },
        required: ["sourceUrl", "analysis", "variations"]
      }
    }
  },
  required: ["results"]
};

export async function generatePinterestCampaign(urls: string[]): Promise<CampaignResult[]> {
  const model = 'gemini-3-pro-preview';
  
  const systemInstruction = `
    Role: Senior Pinterest SEO & Visual Content Architect.
    
    CRITICAL CONSTANT:
    - YOU MUST GENERATE EXACTLY 3 (THREE) UNIQUE PIN VARIATIONS FOR EVERY INPUT URL.
    
    DESIGN VARIATION ENGINE PROTOCOL:
    - For each URL batch, the 3 pins MUST use DIFFERENT 'styleType' values. 
    - Rotate between: Lifestyle, Editorial, Collage, StepFeature, CloseUpWide.
    - DO NOT repeat the same style twice for the same URL.
    - Each style must be strategically chosen based on the content angle (e.g., educational content gets StepFeature, aspirational gets Lifestyle).
    
    VISUAL GENERATION PROTOCOL (STEP 22):
    - Describe the SUBJECT clearly in 'imagePrompt'.
    - 'textOverlay' must be short, punchy, and benefit-driven.
    
    CSV QUALITY ENFORCEMENT:
    - Title: MUST be 60-70 chars. Never empty.
    - Description: MUST be 2-4 sentences + hashtags.
    - Keywords: Generate 4-8 high-volume keywords.
    
    DATA INTEGRITY:
    - Zero tolerance for empty fields.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: `Synthesize a high-impact Pinterest campaign with a diverse 3-style Design Variation Engine for: \n${urls.join('\n')}` }] }],
    config: {
      systemInstruction,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: CAMPAIGN_SCHEMA,
    },
  });

  try {
    const text = response.text;
    if (!text) throw new Error("Empty response from Engine");
    const parsed = JSON.parse(text);
    return parsed.results as CampaignResult[];
  } catch (e) {
    console.error("Failed to parse Gemini response:", e);
    throw new Error("Data Synthesis Failure. Ensure URL input is valid.");
  }
}
