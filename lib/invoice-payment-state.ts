type InvoiceStatus = "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";

type PaymentLike = {
  amount: number | null;
};

type RefundLike = {
  amount: number | null;
};

type InvoicePaymentStateInput = {
  totalAmount: number;
  currentStatus: InvoiceStatus;
  dueDate?: Date | string | null;
  payments?: PaymentLike[];
  refunds?: RefundLike[];
};

const roundCurrency = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;

export function calculateInvoicePaymentState({
  totalAmount,
  currentStatus,
  dueDate,
  payments = [],
  refunds = [],
}: InvoicePaymentStateInput) {
  const grossPaidAmount = roundCurrency(
    payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  );
  const refundedAmount = roundCurrency(
    refunds.reduce((sum, refund) => sum + Number(refund.amount || 0), 0)
  );
  const netPaidAmount = roundCurrency(Math.max(0, grossPaidAmount - refundedAmount));
  const balanceAmount = roundCurrency(Math.max(0, Number(totalAmount || 0) - netPaidAmount));

  let status = currentStatus;
  if (currentStatus !== "CANCELLED") {
    if (balanceAmount <= 0 && Number(totalAmount || 0) > 0) {
      status = "PAID";
    } else if (netPaidAmount > 0) {
      status = "PARTIALLY_PAID";
    } else if (currentStatus === "DRAFT") {
      status = "DRAFT";
    } else if (dueDate && new Date(dueDate) < new Date()) {
      status = "OVERDUE";
    } else {
      status = "SENT";
    }
  }

  return {
    paidAmount: grossPaidAmount,
    refundedAmount,
    netPaidAmount,
    balanceAmount,
    status,
  };
}
