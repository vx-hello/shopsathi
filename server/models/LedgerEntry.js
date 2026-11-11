const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Ledger entry must belong to a shop owner'],
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer reference is required'],
      index: true,
    },
    bill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill',
      default: null,
      description: 'Optional link to a bill if generated during billing',
    },
    type: {
      type: String,
      enum: {
        values: ['DEBIT', 'CREDIT'],
        message: 'Type must be either DEBIT (credit issued) or CREDIT (payment received)',
      },
      required: [true, 'Transaction type is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    balanceAfter: {
      type: Number,
      required: [true, 'Balance after transaction is required'],
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER', 'NONE'],
      default: 'CASH',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User who recorded this entry is required'],
    },
  },
  {
    timestamps: true,
  }
);

ledgerEntrySchema.index({ customer: 1, date: -1 });
ledgerEntrySchema.index({ owner: 1, date: -1 });

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
