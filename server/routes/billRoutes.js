const express = require('express');
const router = express.Router();
const { getBills, getBillById, createBill } = require('../controllers/billController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/').get(getBills).post(createBill);
router.route('/:id').get(getBillById);

module.exports = router;
