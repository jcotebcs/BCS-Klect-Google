
import { GoogleGenAI, Type } from "@google/genai";
import { VehicleCategory, InteractionType, DocumentInfo, LogoReference, NeuralSample } from "../types";
import { getNeuralSamples, EnhancedNeuralSample } from "./trainingService";

export interface ScanResult {
  plate: string;
  vin: string;
  year: string;
  make: string;
  model: string;
  trimLevel: string;
  brand: string;
  shape: string;
  wheelSignature: string;
  bodyModifications: string[];
  logoDetected: boolean;
  logoText: string;
  logoConfidence: number;
  color: string;
  category: VehicleCategory;
  notes: string;
  confidence: number;
  documents: DocumentInfo[];
  historicalMatch?: boolean;
  operationalChecks?: string[];
}

export interface AppraisalResult {
  value: number;
  confidence: number;
  sources: { title: string; uri: string }[];
  reasoning: string;
}

export interface PersonScanResult {
  name: string;
  biometrics: {
    height?: string;
    hair?: string;
    eyes?: string;
    distinguishingMarks?: string[];
    facialSignature?: string;
  };
  notes: string;
  suggestedInteraction: InteractionType;
  documents?: DocumentInfo[];
}

export interface IntelResult {
  text: string;
  sources: { title: string; uri: string }[];
}

export interface StolenCheckResult {
  isStolen: boolean;
  details: string;
  timestamp: string;
  sources: { title: string; uri: string }[];
}

// Helper to extract grounding chunks into standardized source objects
function extractGroundingSources(response: any): { title: string; uri: string }[] {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources: { title: string; uri: string }[] = [];

  chunks.forEach((chunk: any) => {
    // Web Grounding
    if (chunk.web?.uri) {
      sources.push({
        title: chunk.web.title || "Search Result",
        uri: chunk.web.uri
      });
    }
    // Maps Grounding
    if (chunk.maps?.uri) {
      sources.push({
        title: chunk.maps.title || "Location Intel",
        uri: chunk.maps.uri
      });
    }
  });

  return sources;
}

/**
 * Perform a high-security tactical theft check using Gemini 3 Pro with Search Grounding and Thinking.
 */
export async function checkStolenStatus(vin: string): Promise<StolenCheckResult> {
  if (!vin || vin === 'Unknown' || vin === 'Not Scanned') {
    return { isStolen: false, details: "Invalid VIN for theft check", timestamp: new Date().toISOString(), sources: [] };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Perform a high-security tactical check on the VIN "${vin}". 
    Target NICB (nicb.org), CPIC (cpic-cipc.ca), and regional stolen vehicle databases. 
    Determine if this vehicle is currently reported as stolen, salvage, or total loss.
    Return JSON format. Ensure you check for recent activity or recovery status.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isStolen: { type: Type.BOOLEAN, description: "True if flagged as stolen in any database" },
            details: { type: Type.STRING, description: "Summary of findings and specific database status" }
          },
          required: ["isStolen", "details"]
        }
      }
    });

    const res = JSON.parse(response.text || '{}');
    const sources = extractGroundingSources(response);

    return {
      isStolen: !!res.isStolen,
      details: res.details || "No record found.",
      timestamp: new Date().toISOString(),
      sources
    };
  } catch (err) {
    console.error("Stolen check failed:", err);
    return { isStolen: false, details: "Operational failure during theft check", timestamp: new Date().toISOString(), sources: [] };
  }
}

export async function analyzeVehicleImage(
  base64Image: string, 
  mode: 'plate' | 'vin' = 'plate',
  customLogos: LogoReference[] = []
): Promise<ScanResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const contentParts: any[] = [
    { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
  ];

  if (customLogos.length > 0) {
    customLogos.forEach((logo, index) => {
      contentParts.push({ inlineData: { mimeType: 'image/jpeg', data: logo.base64 } });
    });
  }

  const prompt = "OPERATIONAL NEURAL ENGINE ACTIVE. MULTIMODAL PATTERN ANALYSIS:\n" +
    "1. OCR PROTOCOL: Extract license plates or VIN strings.\n" +
    "2. IDENTIFICATION: Identify Year, Make, and precisely extract the Model Name. Identify Color and Category.\n" +
    "3. LOGO: Detect manufacturer logos and text.\n\n" +
    "Return JSON.";

  contentParts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: contentParts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          plate: { type: Type.STRING },
          vin: { type: Type.STRING },
          year: { type: Type.STRING },
          make: { type: Type.STRING },
          model: { type: Type.STRING },
          trimLevel: { type: Type.STRING },
          brand: { type: Type.STRING },
          shape: { type: Type.STRING },
          wheelSignature: { type: Type.STRING },
          bodyModifications: { type: Type.ARRAY, items: { type: Type.STRING } },
          logoDetected: { type: Type.BOOLEAN },
          logoText: { type: Type.STRING },
          logoConfidence: { type: Type.NUMBER },
          color: { type: Type.STRING },
          category: { type: Type.STRING },
          notes: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          historicalMatch: { type: Type.BOOLEAN },
          operationalChecks: { type: Type.ARRAY, items: { type: Type.STRING } },
          documents: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                extractedText: { type: Type.STRING },
                confidence: { type: Type.NUMBER }
              },
              required: ["type", "extractedText", "confidence"]
            }
          }
        },
        required: ["make", "model", "category", "confidence", "documents"]
      }
    }
  });

  const result = JSON.parse(response.text || '{}');
  
  return {
    plate: result.plate || (mode === 'vin' ? 'N/A' : 'Unknown'),
    vin: result.vin || (mode === 'plate' ? 'Not Scanned' : 'Unknown'),
    year: result.year || 'Unknown',
    make: result.make || 'Unknown',
    model: result.model || 'Unknown',
    trimLevel: result.trimLevel || 'Base',
    brand: result.brand || result.make || 'Unknown',
    shape: result.shape || 'Unknown Body',
    wheelSignature: result.wheelSignature || 'Generic Wheels',
    bodyModifications: result.bodyModifications || [],
    logoDetected: !!result.logoDetected,
    logoText: result.logoText || '',
    logoConfidence: result.logoConfidence || 0,
    color: result.color || 'Unknown',
    category: (result.category as VehicleCategory) || VehicleCategory.NORMAL,
    notes: result.notes || '',
    confidence: result.confidence || 0,
    documents: result.documents || [],
    historicalMatch: !!result.historicalMatch,
    operationalChecks: result.operationalChecks || []
  };
}

export async function getVehicleAppraisal(year: string, make: string, model: string): Promise<AppraisalResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Perform a tactical market appraisal for a ${year} ${make} ${model} in average condition. Use Google Search to find current market values from sites like KBB, Edmunds, and car marketplaces. Return JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.NUMBER, description: "Estimated market value in USD" },
          confidence: { type: Type.NUMBER, description: "Confidence score 0-1" },
          reasoning: { type: Type.STRING, description: "Brief summary of appraisal data" }
        },
        required: ["value", "confidence", "reasoning"]
      }
    }
  });

  const res = JSON.parse(response.text || '{}');
  const sources = extractGroundingSources(response);

  return {
    value: res.value || 0,
    confidence: res.confidence || 0,
    reasoning: res.reasoning || '',
    sources
  };
}

export async function analyzePersonImage(base64Image: string): Promise<PersonScanResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [
      { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
      { text: "Analyze this person for biometric identification. Return JSON." }
    ],
    config: {
      thinkingConfig: { thinkingBudget: 32768 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          biometrics: {
            type: Type.OBJECT,
            properties: {
              height: { type: Type.STRING },
              hair: { type: Type.STRING },
              eyes: { type: Type.STRING },
              distinguishingMarks: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          notes: { type: Type.STRING },
          suggestedInteraction: { type: Type.STRING }
        },
        required: ["name", "biometrics", "notes", "suggestedInteraction"]
      }
    }
  });

  const res = JSON.parse(response.text || '{}');
  return {
    name: res.name || 'Unknown Subject',
    biometrics: res.biometrics || {},
    notes: res.notes || '',
    suggestedInteraction: (res.suggestedInteraction as InteractionType) || InteractionType.SIGHTING,
    documents: res.documents || []
  };
}

/**
 * Performs a general visual analysis using Gemini 3 Pro with deep thinking.
 */
export async function generalVisualAnalysis(base64Image: string): Promise<IntelResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [
      { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
      { text: "Provide a comprehensive tactical analysis of this image. Identify any notable objects, threats, or signatures. Use search grounding for verified info if specific brands or locations are visible." }
    ],
    config: {
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingBudget: 32768 }
    }
  });
  
  const sources = extractGroundingSources(response);
  return { text: response.text || '', sources };
}

/**
 * Perform tactical search with Google Search Grounding.
 */
export async function searchIntelligence(query: string): Promise<IntelResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });
  
  const sources = extractGroundingSources(response);
  return { text: response.text || '', sources };
}

/**
 * Perform tactical mapping with Google Maps & Search Grounding.
 */
export async function mapIntelligence(query: string, lat?: number, lng?: number): Promise<IntelResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // NOTE: Maps grounding is strictly for 2.5 series.
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: query,
    config: {
      // Maps grounding can be combined with Search grounding.
      tools: [{ googleMaps: {} }, { googleSearch: {} }],
      toolConfig: (lat !== undefined && lng !== undefined) ? {
        retrievalConfig: {
          latLng: { latitude: lat, longitude: lng }
        }
      } : undefined
    }
  });

  const sources = extractGroundingSources(response);
  return { text: response.text || '', sources };
}

export async function recognizeHandwriting(base64Image: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
      { text: "Transcribe the handwriting. Return only the text." }
    ]
  });
  return response.text || '';
}
