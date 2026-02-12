
/**
 * NHTSA vPIC API Service - Enhanced Strategic Version
 * Decodes VINs and performs checksum reasoning with error correction.
 */

const BASE_URL = "https://vpic.nhtsa.dot.gov/api/vehicles";

const ERROR_MAP: Record<string, string> = {
  "0": "Clean Decode",
  "1": "Check Digit Mismatch",
  "2": "Corrected Position Error",
  "3": "Corrected (Assumed Digit)",
  "5": "Incomplete VIN (Multiple Pos)",
  "6": "Incomplete VIN",
  "11": "Incorrect Model Year Pos",
  "400": "Invalid Characters"
};

export interface VinReasoning {
  isValid: boolean;
  checksumStatus: 'PASS' | 'FAIL' | 'UNVERIFIABLE';
  suggestions: string[];
  structure: {
    wmi: string; // World Manufacturer Identifier
    vds: string; // Vehicle Descriptor Section
    vis: string; // Vehicle Identifier Section
    yearDigit: string;
    plantDigit: string;
  };
  manufacturingIntel: {
    country?: string;
    manufacturer?: string;
    plant?: string;
    modelYear?: string;
  };
}

/**
 * ISO 3779 VIN Checksum Validation
 */
export function validateVinChecksum(vin: string): boolean {
  const cleanVin = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleanVin.length !== 17) return false;

  const translit: Record<string, number> = {
    'A':1,'B':2,'C':3,'D':4,'E':5,'F':6,'G':7,'H':8,'I':0,'J':1,'K':2,'L':3,'M':4,'N':5,'O':0,'P':7,'Q':0,'R':9,'S':2,'T':3,'U':4,'V':5,'W':6,'X':7,'Y':8,'Z':9
  };
  const weights = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];
  
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const char = cleanVin[i];
    const val = isNaN(parseInt(char)) ? (translit[char] || 0) : parseInt(char);
    sum += val * weights[i];
  }
  
  const check = sum % 11;
  const expected = check === 10 ? 'X' : check.toString();
  
  return cleanVin[8] === expected;
}

/**
 * Common OCR substitutions to try when a checksum fails
 */
function getPotentialCorrections(vin: string): string[] {
  const substitutions: Record<string, string[]> = {
    'O': ['0'],
    '0': ['O'],
    'I': ['1'],
    '1': ['I', 'L'],
    'S': ['5'],
    '5': ['S'],
    'Z': ['2'],
    '2': ['Z'],
    'G': ['6'],
    '6': ['G'],
    'B': ['8'],
    '8': ['B']
  };

  const currentVin = vin.toUpperCase();
  const validCorrections: string[] = [];

  // Try swapping illegal characters first (I, O, Q)
  let illegalSwapped = currentVin
    .replace(/O/g, '0')
    .replace(/I/g, '1')
    .replace(/Q/g, '0');
  
  if (illegalSwapped !== currentVin && validateVinChecksum(illegalSwapped)) {
    validCorrections.push(illegalSwapped);
  }

  // Bruteforce single-character swaps for common misreads if still invalid
  if (validCorrections.length === 0) {
    for (let i = 0; i < currentVin.length; i++) {
      const char = currentVin[i];
      if (substitutions[char]) {
        for (const sub of substitutions[char]) {
          const testVin = currentVin.substring(0, i) + sub + currentVin.substring(i + 1);
          if (validateVinChecksum(testVin)) {
            validCorrections.push(testVin);
          }
        }
      }
    }
  }

  return [...new Set(validCorrections)];
}

export async function decodeVin(vin: string): Promise<Record<string, string> | null> {
  if (!vin || vin === 'Unknown' || vin === 'Not Scanned') return null;
  
  const cleanVin = vin.replace(/[-\s]/g, '').toUpperCase();
  if (cleanVin.length < 11) return null;

  try {
    const response = await fetch(`${BASE_URL}/DecodeVinValues/${cleanVin}?format=json`);
    if (!response.ok) throw new Error("NHTSA Uplink Failure");
    
    const data = await response.json();
    if (data.Results && data.Results.length > 0) {
      const result = data.Results[0];
      
      const filtered: Record<string, string> = {};
      Object.entries(result).forEach(([key, value]) => {
        if (value && value !== "0" && value !== "Not Applicable" && typeof value === 'string' && value.trim() !== "") {
          filtered[key] = value;
        }
      });

      const errCode = (result.ErrorCode || "0").split(' ')[0];
      filtered['OperationalStatus'] = ERROR_MAP[errCode] || "Unrecognized Status";
      const isChecksumValid = validateVinChecksum(cleanVin);
      filtered['ChecksumValid'] = isChecksumValid ? "PASS" : "FAIL";

      if (!isChecksumValid) {
        const corrections = getPotentialCorrections(cleanVin);
        if (corrections.length > 0) {
          filtered['SuggestedCorrection'] = corrections[0];
        }
      }
      
      return filtered;
    }
    return null;
  } catch (err) {
    console.error("VIN decoding failed:", err);
    return null;
  }
}

export async function getVinReasoning(vin: string): Promise<VinReasoning> {
  const cleanVin = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const isValid = validateVinChecksum(cleanVin);
  const suggestions = isValid ? [] : getPotentialCorrections(cleanVin);
  
  // Basic structural breakdown
  const structure = {
    wmi: cleanVin.substring(0, 3),
    vds: cleanVin.substring(3, 9),
    vis: cleanVin.substring(9, 17),
    yearDigit: cleanVin.substring(9, 10),
    plantDigit: cleanVin.substring(10, 11)
  };

  const decodeData = await decodeVin(cleanVin);

  return {
    isValid: isValid && cleanVin.length === 17,
    checksumStatus: isValid ? 'PASS' : 'FAIL',
    suggestions,
    structure,
    manufacturingIntel: {
      country: decodeData?.PlantCountry,
      manufacturer: decodeData?.Make,
      plant: decodeData?.PlantCity,
      modelYear: decodeData?.ModelYear
    }
  };
}

export function calculateMarketAppraisal(year: string, make: string): number {
  if (!year || !make) return 0;
  const baseValue = 28000;
  const currentYear = new Date().getFullYear();
  const age = currentYear - (parseInt(year) || currentYear);
  const estimated = baseValue - (age * 1800);
  return estimated > 5000 ? estimated : 5000;
}
