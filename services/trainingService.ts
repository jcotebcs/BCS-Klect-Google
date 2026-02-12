
import { NeuralSample } from '../types';

const STORAGE_KEY = 'klect_neural_samples';
const MAX_SAMPLES = 15; // Increased capacity for a broader knowledge bucket

export interface EnhancedNeuralSample extends NeuralSample {
  type: 'correction' | 'verified_hit' | 'gold_standard';
  confidence?: number;
}

export function saveNeuralSample(sample: Omit<EnhancedNeuralSample, 'id' | 'timestamp'>) {
  const samples = getNeuralSamples() as EnhancedNeuralSample[];
  
  const newSample: EnhancedNeuralSample = {
    ...sample,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString()
  };

  // Dedup logic: If we already have a sample for this specific make/model/shape, 
  // prioritize 'gold_standard' or 'correction' over simple 'verified_hit'.
  let updated = [newSample, ...samples];
  
  // Keep the knowledge bucket lean and relevant
  // 1. Sort by importance: Gold > Correction > Hit
  // 2. Then by date
  updated.sort((a, b) => {
    const priority = { gold_standard: 3, correction: 2, verified_hit: 1 };
    if (priority[a.type] !== priority[b.type]) {
      return priority[b.type] - priority[a.type];
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Prune to MAX_SAMPLES
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, MAX_SAMPLES)));
}

export function getNeuralSamples(): EnhancedNeuralSample[] {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

export function toggleGoldStandard(id: string) {
  const samples = getNeuralSamples();
  const updated = samples.map(s => {
    if (s.id === id) {
      return { ...s, type: s.type === 'gold_standard' ? 'verified_hit' : 'gold_standard' };
    }
    return s;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function removeNeuralSample(id: string) {
  const samples = getNeuralSamples();
  const updated = samples.filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function clearNeuralSamples() {
  localStorage.removeItem(STORAGE_KEY);
}
