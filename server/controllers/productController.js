const Product = require('../models/Product');
const getOwnerId = require('../utils/getOwnerId');

// @desc    Get all products for shop
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res, next) => {
  try {
    const ownerId = await getOwnerId(req.user);
    const { search, category, lowStock } = req.query;

    const query = { owner: ownerId, isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
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

    if (!name || purchasePrice === undefined || sellingPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Product name, purchase price, and selling price are required.',
      });
    }

    const product = await Product.create({
      owner: ownerId,
      name: name.trim(),
      category: category ? category.trim() : 'General',
      barcode: barcode ? barcode.trim() : '',
      purchasePrice: Number(purchasePrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      stock: Number(stock) || 0,
      unit: unit || 'pcs',
      lowStockThreshold: lowStockThreshold !== undefined && lowStockThreshold !== '' ? Number(lowStockThreshold) : 5,
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
