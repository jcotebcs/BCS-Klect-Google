
export interface KnowledgeEntry {
  vin: string;
  make: string;
  model: string | null;
  year: number;
  type: string;
  isStolen: boolean;
  notes: string;
  timestamp: string;
}

/**
 * GROUND TRUTH SAMPLES (Knowledge Bucket)
 * Derived from historical operational query logs.
 */
export const OPERATIONAL_KNOWLEDGE_BUCKET: KnowledgeEntry[] = [
  {
    vin: "1HGBH41JXMN109186",
    make: "HONDA",
    model: "ACCORD",
    year: 1991,
    type: "PASSENGER CAR",
    isStolen: false,
    notes: "NHTSA status code 8: No detailed data available for pre-1981 standard legacy records. Verified clean via NICB.",
    timestamp: "2026-02-12T00:52:40.994Z"
  }
];

export function queryKnowledgeBucket(term: string): KnowledgeEntry | null {
  const q = term.toLowerCase().trim();
  if (!q) return null;
  return OPERATIONAL_KNOWLEDGE_BUCKET.find(e => 
    e.vin.toLowerCase().includes(q) || 
    e.make.toLowerCase().includes(q) || 
    (e.model && e.model.toLowerCase().includes(q))
  ) || null;
}
