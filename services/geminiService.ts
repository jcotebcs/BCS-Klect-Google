
import { GoogleGenAI, Type } from "@google/genai";
import { VehicleCategory, InteractionType, DocumentInfo } from "../types";

export interface ScanResult {
  plate: string;
  vin: string;
  year: string;
  make: string;
  model: string;
  brand: string;
  shape: string;
  wheelSignature: string;
  bodyModifications: string[];
  logoDetected: boolean;
  logoText: string;
  color: string;
  category: VehicleCategory;
  notes: string;
  confidence: number;
  documents: DocumentInfo[];
}

export interface PersonScanResult {
  name: string;
  ssnHint: string;
  biometrics: {
    height: string;
    hair: string;
    eyes: string;
    marks: string[];
    facialSignature: string;
  };
  notes: string;
  suggestedInteraction: InteractionType;
  documents: DocumentInfo[];
}

export interface IntelResult {
  text: string;
  sources: { title: string; uri: string }[];
}

export interface DetectionInfo {
  type: 'plate' | 'vin' | 'none';
  confidence: number;
}

export async function detectTargetType(base64Image: string): Promise<DetectionInfo> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = "Analyze this image for tactical automotive targets. Classify if the primary object is a 'vin' (barcode, sticker, or stamped metal label) or a 'plate' (license plate). Return 'none' if neither is clearly the focus. Also provide a confidence score between 0.0 and 1.0.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }, { text: prompt }] }],
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, description: "One of: 'vin', 'plate', 'none'" },
            confidence: { type: Type.NUMBER, description: "Confidence score from 0.0 to 1.0" }
          },
          required: ["type", "confidence"]
        }
      }
    });
    
    const result = JSON.parse(response.text || '{}');
    const type = (result.type || 'none').toLowerCase();
    
    return {
      type: (type === 'vin' || type === 'plate') ? type : 'none',
      confidence: result.confidence || 0
    };
  } catch (err) {
    console.error("Mode detection failed", err);
    return { type: 'none', confidence: 0 };
  }
}

export async function recognizeHandwriting(base64Image: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = "Analyze the handwriting in this image and convert it to machine-readable text. Focus on accuracy and maintain original formatting if possible. Only return the transcribed text.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }, { text: prompt }] }]
    });
    return response.text?.trim() || "";
  } catch (err) {
    console.error("Handwriting recognition failed", err);
    return "";
  }
}

export async function analyzeVehicleImage(base64Image: string, mode: 'plate' | 'vin' = 'plate'): Promise<ScanResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const categories = Object.values(VehicleCategory).join(", ");
  
  const prompt = "TACTICAL RECOGNITION ACTIVE. PERFORM MULTI-LAYER ANALYSIS:\n" +
    "1. OCR (Identification): Extract alphanumeric strings from " + (mode === 'plate' ? 'LICENSE PLATES' : 'VIN LABELS') + ".\n" +
    "2. LOGO RECOGNITION: Detect the manufacturer logo/emblem. Perform OCR on any text WITHIN the emblem.\n" +
    "3. SHAPE/BODY STYLE: Categorize the shape (e.g., Sedan, SUV, Pickup Truck).\n" +
    "4. WHEEL SIGNATURE: Identify wheel pattern (spoke count, color, finish, steel vs alloy) and tire condition.\n" +
    "5. BODY MODIFICATIONS: Detect external modifications like roof racks, spoilers, tinted windows, bull bars, or specific damage patterns.\n" +
    "6. MAKE/MODEL: Identify year, make, and model.\n" +
    "7. COLOR: Natural color analysis.\n" +
    "8. CATEGORY: Classify based on: " + categories + ".\n" +
    "9. DOCUMENT SCAN: Check if any official documents (Driver's license, ID card, permit, insurance card) are visible in the frame. If found, identify the type and extract all readable text.\n" +
    "10. CONFIDENCE: Provide a probability score for the overall recognition accuracy (0.0 to 1.0).\n\n" +
    "Return clean JSON.";

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }, { text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          plate: { type: Type.STRING },
          vin: { type: Type.STRING },
          year: { type: Type.STRING },
          make: { type: Type.STRING },
          model: { type: Type.STRING },
          brand: { type: Type.STRING },
          shape: { type: Type.STRING },
          wheelSignature: { type: Type.STRING, description: "Detailed description of wheels and tires" },
          bodyModifications: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of detected body mods or distinct features" },
          logoDetected: { type: Type.BOOLEAN },
          logoText: { type: Type.STRING },
          color: { type: Type.STRING },
          category: { type: Type.STRING },
          notes: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          documents: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "e.g., Driver's License, Insurance Card" },
                extractedText: { type: Type.STRING },
                confidence: { type: Type.NUMBER }
              },
              required: ["type", "extractedText", "confidence"]
            }
          }
        },
        required: ["make", "model", "category", "shape", "wheelSignature", "bodyModifications", "logoDetected", "confidence", "documents"]
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
    brand: result.brand || result.make || 'Unknown',
    shape: result.shape || 'Standard Body',
    wheelSignature: result.wheelSignature || 'Generic Wheels',
    bodyModifications: result.bodyModifications || [],
    logoDetected: !!result.logoDetected,
    logoText: result.logoText || '',
    color: result.color || 'Unknown',
    category: (result.category as VehicleCategory) || VehicleCategory.NORMAL,
    notes: result.notes || 'Optical recognition complete.',
    confidence: result.confidence || 0.5,
    documents: result.documents || []
  };
}

export async function analyzePersonImage(base64Image: string): Promise<PersonScanResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = "FACIAL RECOGNITION & BIOMETRIC UPLINK ACTIVE.\nExtract:\n" +
    "1. FACIAL SIGNATURE: Detailed neural description of facial structure.\n" +
    "2. IDENTITY: Name (if credentials visible).\n" +
    "3. BIOMETRICS: Est. height, hair, eyes.\n" +
    "4. INTEL: Subject intent and behavior.\n" +
    "5. DOCUMENT SCAN: Identify any official ID cards or documents visible. Extract type and text.\n\n" +
    "Assign Interaction Type: 'Sighting', 'Trespass', or 'Notification'. Return JSON.";

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }, { text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
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
              marks: { type: Type.ARRAY, items: { type: Type.STRING } },
              facialSignature: { type: Type.STRING }
            }
          },
          notes: { type: Type.STRING },
          suggestedInteraction: { type: Type.STRING },
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
        }
      }
    }
  });

  const result = JSON.parse(response.text || '{}');
  return {
    name: result.name || 'Unknown Subject',
    ssnHint: '',
    biometrics: {
      height: result.biometrics?.height || 'Unknown',
      hair: result.biometrics?.hair || 'Unknown',
      eyes: result.biometrics?.eyes || 'Unknown',
      marks: result.biometrics?.marks || [],
      facialSignature: result.biometrics?.facialSignature || 'No clear neural signature extracted.'
    },
    notes: result.notes || 'Subject analyzed.',
    suggestedInteraction: (result.suggestedInteraction as InteractionType) || InteractionType.SIGHTING,
    documents: result.documents || []
  };
}

export async function searchIntelligence(query: string): Promise<IntelResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: query,
    config: { tools: [{ googleSearch: {} }] },
  });
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter(chunk => chunk.web)
    ?.map(chunk => ({ title: chunk.web?.title || 'Source', uri: chunk.web?.uri || '' })) || [];
  return { text: response.text || "No intelligence found.", sources };
}

export async function mapIntelligence(query: string, lat?: number, lng?: number): Promise<IntelResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: query,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: { latLng: lat && lng ? { latitude: lat, longitude: lng } : undefined }
      }
    },
  });
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter(chunk => chunk.maps)
    ?.map(chunk => ({ title: chunk.maps?.title || "Location Result", uri: chunk.maps?.uri || '' })) || [];
  return { text: response.text || "No geographic data found.", sources };
}
