
/**
 * ISO 3779 VIN Checksum Validation
 * Validates the 9th character check digit of a 17-character VIN.
 */
export function validateVIN(vin: string): { isValid: boolean; errors: string[]; normalizedVIN: string } {
  const errors: string[] = [];
  if (!vin || typeof vin !== 'string') {
    return { isValid: false, errors: ['VIN must be a string'], normalizedVIN: '' };
  }

  const cleanVin = vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
  
  if (cleanVin.length !== 17) {
    errors.push(`VIN must be 17 characters (got ${cleanVin.length})`);
    return { isValid: false, errors, normalizedVIN: cleanVin };
  }

  const transliteration: Record<string, number> = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
    'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
    'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9,
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9
  };
  
  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const char = cleanVin[i];
    const value = transliteration[char];
    if (value === undefined) {
      errors.push(`Invalid character at position ${i + 1}`);
      return { isValid: false, errors, normalizedVIN: cleanVin };
    }
    sum += value * weights[i];
  }
  
  const remainder = sum % 11;
  const checkDigit = remainder === 10 ? 'X' : remainder.toString();
  
  const passed = cleanVin[8] === checkDigit;
  if (!passed) errors.push(`Check digit mismatch: expected ${checkDigit}, got ${cleanVin[8]}`);

  return {
    isValid: passed,
    errors,
    normalizedVIN: cleanVin
  };
}
