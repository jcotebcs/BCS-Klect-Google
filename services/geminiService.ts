
import { GoogleGenAI, Type } from "@google/genai";
import { VehicleCategory, InteractionType, DocumentInfo, LogoReference, NeuralSample } from "../types";
import { getNeuralSamples, EnhancedNeuralSample } from "./trainingService";
import { NORTH_AMERICAN_ARCHIVES } from "./manufacturerData";
import { OPERATIONAL_KNOWLEDGE_BUCKET } from "./knowledgeBucket";

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

// REPAIR: Added timestamp to return type to satisfy VehicleRecord interface
export async function checkStolenStatus(vin: string): Promise<{ isStolen: boolean, details: string, timestamp: string, sources: { title: string, uri: string }[] }> {
  if (!vin || vin === 'Unknown' || vin === 'Not Scanned') {
    return { isStolen: false, details: "Invalid VIN for theft check", timestamp: new Date().toISOString(), sources: [] };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Perform a high-security tactical check on the VIN "${vin}". 
    Target NICB (nicb.org), CPIC (cpic-cipc.ca), and regional stolen vehicle databases. 
    Determine if this vehicle is currently reported as stolen, salvage, or total loss.
    Return JSON format.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
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
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => ({
        title: chunk.web?.title || 'Security Source',
        uri: chunk.web?.uri || ''
      }))
      .filter((s: any) => s.uri) || [];

    return {
      isStolen: !!res.isStolen,
      details: res.details || "No record found.",
      // REPAIR: Added real-time timestamp
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
  const trainingSamples = getNeuralSamples() as EnhancedNeuralSample[];
  
  const contentParts: any[] = [
    { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
  ];

  let customContext = "";
  customContext += "\n\nOPERATIONAL TRUTH PROTOCOLS:\n";
  customContext += "1. NHTSA vPIC: Primary for Year/Make/Model/Recalls. 10th VIN char is Year Code. 1-3 are WMI.\n";
  customContext += "2. NMVTIS: Ground truth for title brands (Salvage, Junk, Flood) and odometer history.\n";
  customContext += "3. NICB (USA) / CPIC (Canada): Master stolen vehicle indices for national verification.\n";

  if (customLogos.length > 0) {
    customContext += "\nOPERATOR-SPECIFIC EMBLEM REFS:\n";
    customLogos.forEach((logo, index) => {
      customContext += `- Ref [${index}]: Verified "${logo.label}" branding.\n`;
      contentParts.push({ inlineData: { mimeType: 'image/jpeg', data: logo.base64 } });
    });
  }

  const prompt = "OPERATIONAL NEURAL ENGINE ACTIVE. MULTIMODAL PATTERN ANALYSIS:\n" +
    "1. OCR PROTOCOL: Extract license plates or VIN strings.\n" +
    "2. IDENTIFICATION: Identify Year, Make, and precisely extract the Model Name (e.g., 'F-150', 'Camry', 'Model 3'). Identify Color and Category.\n" +
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
          model: { type: Type.STRING, description: "Precise vehicle model name as seen on the vehicle or inferred from visual features." },
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
  const prompt = `Perform a tactical market appraisal for a ${year} ${make} ${model} in average condition. Use Google Search to find current market values from sites like KBB, Edmunds, and car marketplaces. Return a single estimated value in USD and a confidence score between 0 and 1 based on data availability. Return JSON.`;

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
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.map((chunk: any) => ({
      title: chunk.web?.title || 'Market Source',
      uri: chunk.web?.uri || ''
    }))
    .filter((s: any) => s.uri) || [];

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
    model: 'gemini-3-flash-preview',
    contents: [
      { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
      { text: "Analyze this person for biometric identification. Return JSON." }
    ],
    config: {
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

export async function searchIntelligence(query: string): Promise<IntelResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.map((chunk: any) => ({
      title: chunk.web?.title || 'Tactical Intel Link',
      uri: chunk.web?.uri || ''
    }))
    .filter((s: any) => s.uri) || [];
  return { text: response.text || '', sources };
}

export async function mapIntelligence(query: string, lat?: number, lng?: number): Promise<IntelResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: query,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: (lat !== undefined && lng !== undefined) ? {
        retrievalConfig: { latLng: { latitude: lat, longitude: lng } }
      } : undefined
    }
  });
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.map((chunk: any) => ({
      title: chunk.maps?.title || 'Map Intel Location',
      uri: chunk.maps?.uri || ''
    }))
    .filter((s: any) => s.uri) || [];
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
