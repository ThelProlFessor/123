export interface LicenseValidationResult {
  isValid: boolean;
  testCount: number | null;
  error?: string;
}

const CHAR_SET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const VALUE_MAP: Map<string, number> = new Map();
CHAR_SET.split('').forEach((char, index) => {
  VALUE_MAP.set(char, index);
});

export const validateLicenseKey = (key: string, t: (key: string, options?: any) => string): LicenseValidationResult => {
  if (!key) {
    return { isValid: false, testCount: null, error: t('notifications.license.empty') };
  }

  const parts = key.trim().toUpperCase().split('-');
  if (parts.length !== 3 || parts[0] !== 'AP' || parts[2] !== 'RAD' || parts[1].length !== 5) {
    return { isValid: false, testCount: null, error: t('notifications.license.invalidFormat') };
  }

  const code = parts[1];
  const dataChars = code.substring(0, 4).split('');
  const checksumChar = code.charAt(4);

  if ([...dataChars, checksumChar].some(c => !VALUE_MAP.has(c))) {
    return { isValid: false, testCount: null, error: t('notifications.license.invalidChars') };
  }

  const values = dataChars.map(c => VALUE_MAP.get(c)!);
  
  const expectedChecksumValue = (values[0] * 7 + values[1] * 3 + values[2] * 13 + values[3] * 17) % 36;
  const actualChecksumValue = VALUE_MAP.get(checksumChar)!;

  if (expectedChecksumValue !== actualChecksumValue) {
    return { isValid: false, testCount: null, error: t('notifications.license.invalidChecksum') };
  }

  // --- Obfuscated Test Count Calculation Logic ---
  // The first three characters are combined into a base-36 number.
  // This number is then XORed with a secret key to obfuscate the direct relationship
  // between the license code characters and the actual test count.
  const rawValue = values[0] * (36 ** 2) + values[1] * 36 + values[2];
  
  const SECRET_XOR_KEY = 2027; // This key is used to "scramble" the test count.
  
  const testCount = rawValue ^ SECRET_XOR_KEY;


  // A license key for 0 tests is considered invalid.
  if (testCount === 0) {
    return { isValid: false, testCount: null, error: t('notifications.license.zeroTests') };
  }

  return { isValid: true, testCount };
};