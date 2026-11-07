const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer must belong to a shop owner'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [80, 'Customer name cannot exceed 80 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Customer phone number is required'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: [0, 'Credit limit cannot be negative'],
    },
    // In ShopSathi convention:
    // positive balance = Customer owes shopkeeper (Udhaar / Debit)
    // negative balance = Shopkeeper owes customer (Advance / Deposit)
    // 0 = settled
    balance: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

customerSchema.index({ owner: 1, phone: 1 });
customerSchema.index({ owner: 1, name: 1 });

module.exports = mongoose.model('Customer', customerSchema);
