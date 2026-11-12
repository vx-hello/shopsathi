const Customer = require('../models/Customer');
const LedgerEntry = require('../models/LedgerEntry');
const Bill = require('../models/Bill');
const { getOwnerId } = require('./productController');
const getPhoneMatchRegex = require('../utils/getPhoneMatchRegex');
const escapeRegex = require('../utils/escapeRegex');
const isValidIndianMobile = require('../utils/isValidIndianMobile');

// @desc    Get all customers with optional search
// @route   GET /api/customers
// @access  Private
const getCustomers = async (req, res, next) => {
  try {
    const ownerId = await getOwnerId(req.user);
    const { search, hasUdhaar } = req.query;

    const query = { owner: ownerId, isActive: true };

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { phone: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    if (hasUdhaar === 'true') {
      query.balance = { $gt: 0 };
    }

    const [customers, summaryResult] = await Promise.all([
      Customer.find(query).sort({ updatedAt: -1 }),
      Customer.aggregate([
        { $match: { owner: ownerId, isActive: true } },
        {
          $group: {
            _id: null,
            totalCustomers: { $sum: 1 },
            customersWithDues: {
              $sum: { $cond: [{ $gt: ['$balance', 0] }, 1, 0] },
            },
            totalPendingUdhaar: {
              $sum: { $cond: [{ $gt: ['$balance', 0] }, '$balance', 0] },
            },
          },
        },
        { $project: { _id: 0, totalCustomers: 1, customersWithDues: 1, totalPendingUdhaar: 1 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      count: customers.length,
      summary: summaryResult[0] || {
        totalCustomers: 0,
        customersWithDues: 0,
        totalPendingUdhaar: 0,
      },
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single customer and their ledger history
// @route   GET /api/customers/:id
// @access  Private
const getCustomerById = async (req, res, next) => {
  try {
    const ownerId = await getOwnerId(req.user);
    const customer = await Customer.findOne({
      _id: req.params.id,
      owner: ownerId,
      isActive: true,
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Get ledger entries for this customer
    const ledger = await LedgerEntry.find({
      customer: customer._id,
      owner: ownerId,
    })
      .sort({ date: -1, createdAt: -1 })
      .populate('recordedBy', 'name role')
      .populate('bill', 'invoiceNumber');

    const phoneMatchRegex = getPhoneMatchRegex(customer.phone);
    const bills = req.user.role === 'owner'
      ? await Bill.find({
        owner: ownerId,
        $or: [
          { customer: customer._id },
          { customerPhone: customer.phone },
          ...(phoneMatchRegex ? [{ customerPhone: { $regex: phoneMatchRegex } }] : []),
        ],
      })
        .select('invoiceNumber createdAt items totalAmount paidAmount balanceDue paymentMethod paymentStatus')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()
      : [];

    res.status(200).json({
      success: true,
      data: {
        customer,
        ledger,
        bills,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private
const createCustomer = async (req, res, next) => {
  try {
    const ownerId = await getOwnerId(req.user);
    const { name, phone, address, creditLimit, initialBalance, notes } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and phone number are required.',
      });
    }
    if (!isValidIndianMobile(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid 10-digit Indian mobile number starting with 6-9.',
      });
    }

    const customer = await Customer.create({
      owner: ownerId,
      name: name.trim(),
      phone: phone.trim(),
      address: address ? address.trim() : '',
      creditLimit: Number(creditLimit) || 0,
      balance: Number(initialBalance) || 0,
      notes: notes ? notes.trim() : '',
    });

    // If an initial credit balance is provided, record the opening ledger entry.
    if (initialBalance && Number(initialBalance) > 0) {
      await LedgerEntry.create({
        owner: ownerId,
        customer: customer._id,
        type: 'DEBIT',
        amount: Number(initialBalance),
        balanceAfter: customer.balance,
        paymentMethod: 'NONE',
        notes: 'Initial opening credit balance',
        recordedBy: req.user._id,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Customer added successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record a transaction in the customer credit ledger (DEBIT or CREDIT)
// @route   POST /api/customers/:id/ledger
// @access  Private
const recordLedgerTransaction = async (req, res, next) => {
  try {
    const ownerId = await getOwnerId(req.user);
    const { type, amount, notes, paymentMethod, date } = req.body;

    if (!type || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid transaction type (DEBIT or CREDIT) and positive amount are required.',
      });
    }

    const customer = await Customer.findOne({
      _id: req.params.id,
      owner: ownerId,
      isActive: true,
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const numAmount = Number(amount);

    if (type === 'DEBIT') {
      customer.balance = (customer.balance || 0) + numAmount;
    } else if (type === 'CREDIT') {
      customer.balance = (customer.balance || 0) - numAmount;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid transaction type' });
    }

    await customer.save();

    const entry = await LedgerEntry.create({
      owner: ownerId,
      customer: customer._id,
      type,
      amount: numAmount,
      balanceAfter: customer.balance,
      paymentMethod: paymentMethod || (type === 'CREDIT' ? 'CASH' : 'NONE'),
      notes: notes ? notes.trim() : (type === 'DEBIT' ? 'Credit issued' : 'Payment received'),
      recordedBy: req.user._id,
      date: date ? new Date(date) : new Date(),
    });

    res.status(201).json({
      success: true,
      message: type === 'DEBIT' ? 'Credit recorded (+)' : 'Payment received (-)',
      data: {
        customer,
        entry,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer details
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = async (req, res, next) => {
  try {
    const ownerId = await getOwnerId(req.user);
    const customer = await Customer.findOne({
      _id: req.params.id,
      owner: ownerId,
      isActive: true,
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const { name, phone, address, creditLimit, notes } = req.body;
    if (name) customer.name = name.trim();
    if (phone !== undefined) {
      if (!isValidIndianMobile(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Enter a valid 10-digit Indian mobile number starting with 6-9.',
        });
      }
      customer.phone = phone.trim();
    }
    if (address !== undefined) customer.address = address.trim();

    // Only owner can alter credit limits
    if (req.user.role === 'owner' && creditLimit !== undefined && creditLimit !== '') {
      customer.creditLimit = Number(creditLimit);
    }
    if (notes !== undefined) customer.notes = notes.trim();

    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete customer (soft delete)
// @route   DELETE /api/customers/:id
// @access  Private (Owner Only)
const deleteCustomer = async (req, res, next) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only store owners can delete customers.',
      });
    }

    const ownerId = await getOwnerId(req.user);
    const customer = await Customer.findOne({
      _id: req.params.id,
      owner: ownerId,
      isActive: true,
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    customer.isActive = false;
    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Customer removed from the credit ledger',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  recordLedgerTransaction,
  updateCustomer,
  deleteCustomer,
};
