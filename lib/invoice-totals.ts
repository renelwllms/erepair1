type InvoiceTotalItem = {
  quantity: number;
  unitPrice: number;
  totalPrice?: number | null;
  itemType?: string | null;
};

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const getItemTotal = (item: InvoiceTotalItem) => {
  const total = typeof item.totalPrice === "number" ? item.totalPrice : item.quantity * item.unitPrice;
  return roundCurrency(total);
};

export function calculateInvoiceTotals(
  items: InvoiceTotalItem[],
  taxRate: number,
  discountAmount = 0
) {
  const subtotal = roundCurrency(
    items.reduce((sum, item) => {
      if (item.itemType === "DISCOUNT") {
        return sum;
      }

      return sum + getItemTotal(item);
    }, 0)
  );

  const lineItemCreditAmount = roundCurrency(
    items.reduce((sum, item) => {
      if (item.itemType !== "DISCOUNT") {
        return sum;
      }

      return sum + Math.abs(getItemTotal(item));
    }, 0)
  );

  const taxAmount = roundCurrency((subtotal * taxRate) / 100);
  const totalDiscountAmount = roundCurrency(discountAmount + lineItemCreditAmount);
  const totalAmount = roundCurrency(subtotal + taxAmount - totalDiscountAmount);

  return {
    subtotal,
    taxAmount,
    lineItemCreditAmount,
    discountAmount: roundCurrency(discountAmount),
    totalDiscountAmount,
    totalAmount,
  };
}
