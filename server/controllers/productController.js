const Product = require('../models/Product');
const getOwnerId = require('../utils/getOwnerId');
const escapeRegex = require('../utils/escapeRegex');

// @desc    Get all products for shop
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res, next) => {
  try {
    const ownerId = await getOwnerId(req.user);
    const { search, category, lowStock } = req.query;

    const query = { owner: ownerId, isActive: true };

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { barcode: { $regex: safeSearch, $options: 'i' } },
        { category: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    let products = await Product.find(query).sort({ updatedAt: -1 }).lean();

    if (lowStock === 'true') {
      products = products.filter((p) => p.stock <= p.lowStockThreshold);
    }

    // Role-based data shielding: Staff must NEVER see wholesale purchase price!
    if (req.user.role === 'staff') {
      products = products.map((p) => {
        const { purchasePrice, ...rest } = p;
        return rest;
      });
    }

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
const getProductById = async (req, res, next) => {
  try {
    const ownerId = await getOwnerId(req.user);
    const product = await Product.findOne({ _id: req.params.id, owner: ownerId, isActive: true }).lean();

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Shield wholesale cost from staff
    if (req.user.role === 'staff') {
      delete product.purchasePrice;
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new product
// @route   POST /api/products
// @access  Private (Owner Only)
const createProduct = async (req, res, next) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Only the store owner can add products to inventory.',
      });
    }

    const ownerId = await getOwnerId(req.user);
    const {
      name,
      category,
      barcode,
      purchasePrice,
      sellingPrice,
      stock,
      unit,
      lowStockThreshold,
    } = req.body;

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      purchasePrice === undefined ||
      sellingPrice === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'Product name, purchase price, and selling price are required.',
      });
    }

    const productValues = {
      purchasePrice: Number(purchasePrice),
      sellingPrice: Number(sellingPrice),
      stock: stock === undefined || stock === '' ? 0 : Number(stock),
      lowStockThreshold:
        lowStockThreshold !== undefined && lowStockThreshold !== ''
          ? Number(lowStockThreshold)
          : 5,
    };

    if (
      !Number.isFinite(productValues.purchasePrice) ||
      !Number.isFinite(productValues.sellingPrice) ||
      !Number.isFinite(productValues.stock) ||
      !Number.isFinite(productValues.lowStockThreshold) ||
      productValues.purchasePrice < 0 ||
      productValues.sellingPrice < 0 ||
      productValues.stock < 0 ||
      productValues.lowStockThreshold < 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Prices, stock, and low-stock threshold must be valid non-negative numbers.',
      });
    }

    const product = await Product.create({
      owner: ownerId,
      name: name.trim(),
      category: category ? category.trim() : 'General',
      barcode: barcode ? barcode.trim() : '',
      ...productValues,
      unit: unit || 'pcs',
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = async (req, res, next) => {
  try {
    const ownerId = await getOwnerId(req.user);
    const product = await Product.findOne({ _id: req.params.id, owner: ownerId, isActive: true });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Role-based restrictions: Staff cannot change wholesale purchasePrice
    if (req.body.name !== undefined) product.name = req.body.name.trim();
    if (req.body.category !== undefined) product.category = req.body.category.trim();
    if (req.body.barcode !== undefined) product.barcode = req.body.barcode.trim();
    if (req.body.unit !== undefined) product.unit = req.body.unit;

    if (req.body.sellingPrice !== undefined && req.body.sellingPrice !== '') {
      product.sellingPrice = Number(req.body.sellingPrice);
    }
    if (req.body.stock !== undefined && req.body.stock !== '') {
      product.stock = Number(req.body.stock);
    }
    if (req.body.lowStockThreshold !== undefined && req.body.lowStockThreshold !== '') {
      product.lowStockThreshold = Number(req.body.lowStockThreshold);
    }

    // Only owner can update purchase cost
    if (req.user.role === 'owner' && req.body.purchasePrice !== undefined && req.body.purchasePrice !== '') {
      product.purchasePrice = Number(req.body.purchasePrice);
    }

    if (
      !Number.isFinite(product.sellingPrice) ||
      !Number.isFinite(product.stock) ||
      !Number.isFinite(product.lowStockThreshold) ||
      product.sellingPrice < 0 ||
      product.stock < 0 ||
      product.lowStockThreshold < 0 ||
      (req.user.role === 'owner' &&
        (!Number.isFinite(product.purchasePrice) || product.purchasePrice < 0))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Prices, stock, and low-stock threshold must be valid non-negative numbers.',
      });
    }

    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product (soft delete)
// @route   DELETE /api/products/:id
// @access  Private (Owner Only)
const deleteProduct = async (req, res, next) => {
  try {
    // Only shop owner can delete products from catalog
    if (req.user.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the store owner is authorized to delete products from inventory.',
      });
    }

    const ownerId = await getOwnerId(req.user);
    const product = await Product.findOne({ _id: req.params.id, owner: ownerId, isActive: true });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    product.isActive = false;
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product removed from catalog',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getOwnerId,
};
