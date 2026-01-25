const LEGACY_TERMS_PATTERNS = [/^payment due within 30 days\.?$/i, /^net\s*30\.?$/i];

export const normalizePaymentTerms = (terms?: string | null) => {
  if (!terms) {
    return undefined;
  }

  const trimmed = terms.trim();
  if (!trimmed) {
    return undefined;
  }

  if (LEGACY_TERMS_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return "Payment due upon collection of the device";
  }

  return trimmed;
};
