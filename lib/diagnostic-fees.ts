export type DiagnosticFeeMap = Record<string, number>;

export const parseDiagnosticFees = (value?: string | null): DiagnosticFeeMap => {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const entries = Object.entries(parsed as Record<string, unknown>);
    return entries.reduce<DiagnosticFeeMap>((acc, [key, raw]) => {
      const num = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isNaN(num)) {
        acc[key] = num;
      }
      return acc;
    }, {});
  } catch (error) {
    return {};
  }
};

export const getDiagnosticFeeForAppliance = (
  applianceType: string,
  diagnosticFees: DiagnosticFeeMap,
  defaultOther?: number | null
) => {
  if (!applianceType) {
    return null;
  }

  if (applianceType === "Other") {
    return typeof defaultOther === "number" ? defaultOther : null;
  }

  const fee = diagnosticFees[applianceType];
  return typeof fee === "number" ? fee : null;
};

export const buildDiagnosticCreditItem = (amount: number) => ({
  description: "Diagnostic Fee (credited)",
  quantity: 1,
  unitPrice: -Math.abs(amount),
  totalPrice: -Math.abs(amount),
  itemType: "DISCOUNT",
});
