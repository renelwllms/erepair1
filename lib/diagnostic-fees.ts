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

export const isCalloutJob = (job?: {
  jobType?: string | null;
  isCallout?: boolean | null;
} | null) => Boolean(job?.isCallout || job?.jobType === "CALLOUT_REPAIR");

export const shouldApplyDiagnosticCredit = (job?: {
  jobType?: string | null;
  isCallout?: boolean | null;
  diagnosticFeeAmount?: number | null;
  diagnosticFeePaid?: boolean | null;
  diagnosticFeeAppliedToInvoice?: boolean | null;
} | null) =>
  Boolean(
    job &&
      !isCalloutJob(job) &&
      (job.diagnosticFeeAmount || 0) > 0 &&
      job.diagnosticFeePaid &&
      !job.diagnosticFeeAppliedToInvoice
  );

export const getCalloutFeeAmount = (job?: {
  jobType?: string | null;
  isCallout?: boolean | null;
  calloutFee?: number | null;
  diagnosticFeeAmount?: number | null;
} | null) => {
  if (!isCalloutJob(job)) {
    return 0;
  }

  const calloutFee = Number(job?.calloutFee || 0);
  if (calloutFee > 0) {
    return calloutFee;
  }

  return Number(job?.diagnosticFeeAmount || 0);
};

export const buildCalloutFeeItem = (amount: number) => ({
  description: "Callout Fee",
  quantity: 1,
  unitPrice: Math.abs(amount),
  totalPrice: Math.abs(amount),
  itemType: "SERVICE_FEE",
});
