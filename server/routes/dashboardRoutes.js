const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getUdhaarInvoices,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/stats', getDashboardStats);
router.get('/udhaar-invoices', getUdhaarInvoices);

module.exports = router;
