const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Product must belong to a shop owner'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide a product name'],
      trim: true,
      maxlength: [120, 'Product name cannot exceed 120 characters'],
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    barcode: {
      type: String,
      trim: true,
      default: '',
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase price is required'],
      min: [0, 'Purchase price cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    unit: {
      type: String,
      enum: ['pcs', 'kg', 'g', 'litre', 'ml', 'packet', 'box', 'dozen', 'meter'],
      default: 'pcs',
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: [0, 'Threshold cannot be negative'],
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

// Compound index to ensure fast search by owner & name/barcode
productSchema.index({ owner: 1, name: 1 });
productSchema.index({ owner: 1, barcode: 1 });

module.exports = mongoose.model('Product', productSchema);
