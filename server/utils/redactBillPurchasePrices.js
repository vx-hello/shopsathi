const redactBillPurchasePrices = (bills, role) => {
  if (role !== 'staff') return bills;

  const redactBill = (bill) => {
    if (!bill) return bill;

    const billData = typeof bill.toObject === 'function' ? bill.toObject() : { ...bill };
    if (Array.isArray(billData.items)) {
      billData.items = billData.items.map((item) => {
        const itemData = typeof item?.toObject === 'function' ? item.toObject() : item;
        if (!itemData || typeof itemData !== 'object') return itemData;
        const { purchasePrice, ...visibleItem } = itemData;
        return visibleItem;
      });
    }

    return billData;
  };

  return Array.isArray(bills) ? bills.map(redactBill) : redactBill(bills);
};

module.exports = redactBillPurchasePrices;
