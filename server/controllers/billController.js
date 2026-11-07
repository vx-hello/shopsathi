const Bill = require('../models/Bill');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const LedgerEntry = require('../models/LedgerEntry');
const { getOwnerId } = require('./productController');
const getPhoneMatchRegex = require('../utils/getPhoneMatchRegex');

// @desc    Get all bills
// @route   GET /api/bills
// @access  Private
const getBills = async (req, res, next) => {
  try {
    const ownerId = await getOwnerId(req.user);
    const { limit = 50, page = 1, search } = req.query;

    const query = { owner: ownerId };

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
      ];
    }

    const bills = await Bill.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('createdBy', 'name role')
      .populate('customer', 'name phone balance');

    const total = await Bill.countDocuments(query);

    res.status(200).json({
      success: true,
      count: bills.length,
      total,
      data: bills,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single bill by ID
// @route   GET /api/bills/:id
// @access  Private
const getBillById = async (req, res, next) => {
  try {
    const ownerId = await getOwnerId(req.user);
    const bill = await Bill.findOne({ _id: req.params.id, owner: ownerId })
      .populate('createdBy', 'name role')
      .populate('customer', 'name phone address balance');

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    res.status(200).json({ success: true, data: bill });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new bill (POS Checkout with Auto-Customer Registration for Udhaar)
// @route   POST /api/bills
// @access  Private
const createBill = async (req, res, next) => {
  try {
    const ownerId = await getOwnerId(req.user);
    const {
      customerId,
      customerName,
      customerPhone,
      items,
      discount = 0,
      tax = 0,
      paymentMethod = 'CASH',
      paidAmount,
      notes = '',
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A bill must have at least one item.',
      });
    }

    // Calculate subtotal and validate items
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const quantity = Number(item.quantity) || 1;
      const unitPrice = Number(item.unitPrice) || 0;
      const itemTotal = quantity * unitPrice;
      subtotal += itemTotal;

      processedItems.push({
        product: item.productId || item.product || null,
        name: item.name || 'Unnamed Item',
        quantity,
        unit: item.unit || 'pcs',
        purchasePrice: Number(item.purchasePrice) || 0,
        unitPrice,
        total: itemTotal,
      });

      // Deduct inventory stock if productId is linked
      if (item.productId || item.product) {
        const prodId = item.productId || item.product;
        await Product.findOneAndUpdate(
          { _id: prodId, owner: ownerId },
          { $inc: { stock: -quantity } }
        );
      }
    }

    const numDiscount = Number(discount) || 0;
    const numTax = Number(tax) || 0;
    const totalAmount = Math.max(0, subtotal - numDiscount + numTax);

    let actualPaid = 0;
    let balanceDue = 0;
    let paymentStatus = 'PAID';

    if (paymentMethod === 'UDHAAR') {
      actualPaid = Number(paidAmount) || 0;
      balanceDue = Math.max(0, totalAmount - actualPaid);
      paymentStatus = actualPaid > 0 ? 'PARTIAL' : 'UNPAID';
    } else {
      actualPaid = paidAmount !== undefined ? Number(paidAmount) : totalAmount;
      balanceDue = Math.max(0, totalAmount - actualPaid);
      paymentStatus = balanceDue > 0 ? (actualPaid > 0 ? 'PARTIAL' : 'UNPAID') : 'PAID';
    }

    // Smart Customer Resolution: Find or auto-register if giving Udhaar
    let linkedCustomer = null;
    const cleanPhone = customerPhone ? customerPhone.trim() : '';
    const cleanName = customerName ? customerName.trim() : 'Walk-in Customer';

    if (customerId) {
      linkedCustomer = await Customer.findOne({ _id: customerId, owner: ownerId });
    }

    if (!linkedCustomer && cleanPhone && cleanPhone.length >= 4) {
      // Look up existing customer by phone
      linkedCustomer = await Customer.findOne({ owner: ownerId, phone: cleanPhone, isActive: true });
      if (!linkedCustomer) {
        const phoneMatchRegex = getPhoneMatchRegex(cleanPhone);
        if (phoneMatchRegex) {
          linkedCustomer = await Customer.findOne({
            owner: ownerId,
            phone: { $regex: phoneMatchRegex },
            isActive: true,
          });
        }
      }

      // If not found and giving udhaar or name is provided, auto-create Khata record
      if (!linkedCustomer && (paymentMethod === 'UDHAAR' || balanceDue > 0 || cleanName !== 'Walk-in Customer')) {
        linkedCustomer = await Customer.create({
          owner: ownerId,
          name: cleanName !== 'Walk-in Customer' ? cleanName : `Customer (${cleanPhone})`,
          phone: cleanPhone,
          balance: 0,
        });
      }
    }

    // Auto-generate invoice number (INV-YYMM-RANDOM)
    const dateStr = new Date().toISOString().slice(2, 7).replace('-', '');
    const randStr = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${randStr}`;

    // Create the bill document
    const bill = await Bill.create({
      owner: ownerId,
      invoiceNumber,
      customer: linkedCustomer ? linkedCustomer._id : null,
      customerName: linkedCustomer ? linkedCustomer.name : cleanName,
      customerPhone: linkedCustomer ? linkedCustomer.phone : cleanPhone,
      items: processedItems,
      subtotal,
      discount: numDiscount,
      tax: numTax,
      totalAmount,
      paidAmount: actualPaid,
      balanceDue,
      paymentMethod,
      paymentStatus,
      notes,
      createdBy: req.user._id,
    });

    // If there is udhaar/balance due and customer is resolved, update balance & record in ledger
    if (balanceDue > 0 && linkedCustomer) {
      linkedCustomer.balance = (linkedCustomer.balance || 0) + balanceDue;
      await linkedCustomer.save();

      await LedgerEntry.create({
        owner: ownerId,
        customer: linkedCustomer._id,
        bill: bill._id,
        type: 'DEBIT',
        amount: balanceDue,
        balanceAfter: linkedCustomer.balance,
        paymentMethod: 'NONE',
        notes: `Bill #${invoiceNumber} udhaar purchase`,
        recordedBy: req.user._id,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Bill created successfully',
      data: bill,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBills,
  getBillById,
  createBill,
};
