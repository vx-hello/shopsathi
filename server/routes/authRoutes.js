const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  getShopStaff,
  createShopStaff,
  toggleStaffStatus,
  deleteStaff,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Public endpoints
router.post('/register', register);
router.post('/login', login);

// Protected endpoints (both owner and staff can view and update their basic profile)
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

// Owner-only Staff Management endpoints
router.get('/staff', protect, authorize('owner'), getShopStaff);
router.post('/staff', protect, authorize('owner'), createShopStaff);
router.put('/staff/:id/status', protect, authorize('owner'), toggleStaffStatus);
router.delete('/staff/:id', protect, authorize('owner'), deleteStaff);

module.exports = router;
