const mongoose = require('mongoose');
const Bill = require('../models/Bill');
const redactBillPurchasePrices = require('../utils/redactBillPurchasePrices');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const LedgerEntry = require('../models/LedgerEntry');
const { getOwnerId } = require('./productController');
const getPhoneMatchRegex = require('../utils/getPhoneMatchRegex');
const isValidIndianMobile = require('../utils/isValidIndianMobile');
const escapeRegex = require('../utils/escapeRegex');

// @desc    Get all bills
// @route   GET /api/bills
// @access  Private
const getBills = async (req, res, next) => {
  try {
    const ownerId = await getOwnerId(req.user);
    const { limit = 50, page = 1, search } = req.query;

    const query = { owner: ownerId };

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { invoiceNumber: { $regex: safeSearch, $options: 'i' } },
        { customerName: { $regex: safeSearch, $options: 'i' } },
        { customerPhone: { $regex: safeSearch, $options: 'i' } },
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
      data: redactBillPurchasePrices(bills, req.user.role),
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

    res.status(200).json({
      success: true,
      data: redactBillPurchasePrices(bill, req.user.role),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new bill (POS checkout with automatic customer registration for credit sales)
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

    if (!['CASH', 'UPI', 'UDHAAR'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Payment method must be cash, UPI, or customer credit.',
      });
    }

    // Calculate subtotal and validate items before changing inventory.
    let subtotal = 0;
    const processedItems = [];
    const stockRequirements = new Map();
    const productsById = new Map();

    for (const item of items) {
      if (!item || typeof item !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Each bill item must be a valid object.',
        });
      }

      const quantity = Number(item.quantity);
      const productId = item.productId || item.product;
      let product = null;
      if (productId) {
        if (!mongoose.isValidObjectId(productId)) {
          return res.status(400).json({
            success: false,
            message: 'A bill item references an invalid product.',
          });
        }
        product = productsById.get(String(productId));
        if (!product) {
          product = await Product.findOne({
            _id: productId,
            owner: ownerId,
            isActive: true,
          });
          if (!product) {
            return res.status(409).json({
              success: false,
              message: 'A product is unavailable. Refresh inventory and try again.',
            });
          }
          productsById.set(String(productId), product);
        }
      }

      const unitPrice = product ? product.sellingPrice : Number(item.unitPrice);
      const purchasePrice = product
        ? req.user.role === 'owner' ? product.purchasePrice : 0
        : Number(item.purchasePrice === undefined ? 0 : item.purchasePrice);

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0 ||
        !Number.isFinite(purchasePrice) ||
        purchasePrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have a valid name, positive quantity, and non-negative price.',
        });
      }

      const itemName = product
        ? product.name
        : typeof item.name === 'string'
          ? item.name.trim()
          : '';
      if (!itemName) {
        return res.status(400).json({
          success: false,
          message: 'Each bill item must have a name.',
        });
      }

      const itemTotal = quantity * unitPrice;
      subtotal += itemTotal;

      processedItems.push({
        product: product ? product._id : null,
        name: itemName,
        quantity,
        unit: product ? product.unit : item.unit || 'pcs',
        purchasePrice,
        unitPrice,
        total: itemTotal,
      });

      // Deduct inventory stock if productId is linked
      if (product) {
        const prodId = String(product._id);
        stockRequirements.set(
          String(prodId),
          (stockRequirements.get(String(prodId)) || 0) + quantity
        );
      }
    }

    const numDiscount = Number(discount);
    const numTax = Number(tax);
    if (
      !Number.isFinite(numDiscount) ||
      !Number.isFinite(numTax) ||
      numDiscount < 0 ||
      numDiscount > subtotal ||
      numTax < 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Discount and tax must be valid non-negative amounts, and discount cannot exceed the subtotal.',
      });
    }
    const totalAmount = subtotal - numDiscount + numTax;

    let actualPaid = 0;
    let balanceDue = 0;
    let paymentStatus = 'PAID';

    if (paymentMethod === 'UDHAAR') {
      actualPaid = paidAmount === undefined || paidAmount === '' ? 0 : Number(paidAmount);
      balanceDue = Math.max(0, totalAmount - actualPaid);
      paymentStatus = actualPaid > 0 ? 'PARTIAL' : 'UNPAID';
    } else {
      actualPaid = paidAmount !== undefined && paidAmount !== '' ? Number(paidAmount) : totalAmount;
      balanceDue = Math.max(0, totalAmount - actualPaid);
      paymentStatus = balanceDue > 0 ? (actualPaid > 0 ? 'PARTIAL' : 'UNPAID') : 'PAID';
    }

    if (!Number.isFinite(actualPaid) || actualPaid < 0 || actualPaid > totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Paid amount must be between zero and the bill total.',
      });
    }

    // Find or register a customer automatically for credit sales.
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

      // If not found and the sale is on credit or a name is provided, create a customer ledger record.
      if (!linkedCustomer && cleanPhone && !isValidIndianMobile(cleanPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Enter a valid 10-digit Indian mobile number starting with 6-9.',
        });
      }

      if (!linkedCustomer && (paymentMethod === 'UDHAAR' || balanceDue > 0 || cleanName !== 'Walk-in Customer')) {
        linkedCustomer = await Customer.create({
          owner: ownerId,
          name: cleanName !== 'Walk-in Customer' ? cleanName : `Customer (${cleanPhone})`,
          phone: cleanPhone,
          balance: 0,
        });
      }
    }

    const reservedStock = [];
    for (const [productId, quantity] of stockRequirements) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: productId, owner: ownerId, isActive: true, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } }
      );
      if (!updatedProduct) {
        await Promise.all(
          reservedStock.map(({ id, amount }) =>
            Product.updateOne({ _id: id, owner: ownerId }, { $inc: { stock: amount } })
          )
        );
        const item = processedItems.find(
          (processedItem) => String(processedItem.product) === productId
        );
        return res.status(409).json({
          success: false,
          message: `Insufficient stock or product unavailable for "${item?.name || 'a product'}". Refresh inventory and try again.`,
        });
      }
      reservedStock.push({ id: productId, amount: quantity });
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

    // If a balance is due and the customer is resolved, update the balance and record it in the ledger.
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
        notes: `Bill #${invoiceNumber} credit purchase`,
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
