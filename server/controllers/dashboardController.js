const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const LedgerEntry = require('../models/LedgerEntry');
const escapeRegex = require('../utils/escapeRegex');
const User = require('../models/User');
const getOwnerId = require('../utils/getOwnerId');

// @desc    Get live dashboard analytics & summary cards with strict Role-Based Access
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res, next) => {
  try {
    const ownerId = await getOwnerId(req.user);
    const isOwner = req.user.role === 'owner';

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Filter bills: Owner sees all store bills; Staff sees only their own counter bills
    const billFilter = {
      owner: ownerId,
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    };

    if (!isOwner) {
      billFilter.createdBy = req.user._id;
    }

    const todayBills = await Bill.find(billFilter);
    const todaySales = todayBills.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    const todayBillsCount = todayBills.length;

    // Products & Stock Counts (both can view catalog stock)
    const allProducts = await Product.find({ owner: ownerId, isActive: true });
    const totalProducts = allProducts.length;
    const lowStockCount = allProducts.filter((p) => p.stock <= p.lowStockThreshold).length;

    // Owner-Only Sensitive Financial Metrics
    let totalPendingUdhaar = null;
    let totalCustomers = null;
    let staffCount = 0;
    let staffMembers = [];
    let recentLedger = [];
    let recentBills = [];

    if (isOwner) {
      // Calculate total outstanding customer credit.
      const customersWithUdhaar = await Customer.find({
        owner: ownerId,
        isActive: true,
        balance: { $gt: 0 },
      });

      totalPendingUdhaar = customersWithUdhaar.reduce(
        (acc, curr) => acc + (curr.balance || 0),
        0
      );

      totalCustomers = await Customer.countDocuments({ owner: ownerId, isActive: true });
      const staffQuery = {
        role: 'staff',
        $or: [{ ownerId: req.user._id }],
      };
      if (req.user.shopName) {
        staffQuery.$or.push({
          shopName: {
            $regex: new RegExp(`^${escapeRegex(req.user.shopName.trim())}$`, 'i'),
          },
        });
      }

      staffMembers = await User.find(staffQuery)
        .select('name isActive')
        .sort({ createdAt: -1 })
        .lean();
      staffCount = staffMembers.length;

      // Recent 5 Bills for store
      recentBills = await Bill.find({ owner: ownerId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('customer', 'name phone')
        .populate('createdBy', 'name role');

      // Recent 5 Ledger Entries for store
      recentLedger = await LedgerEntry.find({ owner: ownerId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('customer', 'name phone')
        .populate('recordedBy', 'name role');
    } else {
      // Staff view: only recent bills they created
      recentBills = await Bill.find({ owner: ownerId, createdBy: req.user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('customer', 'name phone');
    }

    res.status(200).json({
      success: true,
      data: {
        role: req.user.role,
        isOwner,
        todaySales,
        todayBillsCount,
        totalPendingUdhaar,
        totalProducts,
        lowStockCount,
        totalCustomers,
        staffCount,
        staffMembers,
        recentBills,
        recentLedger,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getUdhaarInvoices = async (req, res, next) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Only the shop owner can view all outstanding invoices.',
      });
    }

    const ownerId = await getOwnerId(req.user);
    const requestedPage = Number.parseInt(req.query.page, 10);
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit =
      Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 50)
        : 10;
    const query = {
      owner: ownerId,
      $or: [{ paymentMethod: 'UDHAAR' }, { balanceDue: { $gt: 0 } }],
    };

    const [invoices, total] = await Promise.all([
      Bill.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('invoiceNumber customer customerName customerPhone totalAmount paidAmount balanceDue paymentStatus createdAt')
        .populate('customer', 'name phone')
        .lean(),
      Bill.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: invoices,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getUdhaarInvoices,
};
