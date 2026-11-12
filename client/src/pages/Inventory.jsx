import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Plus,
  Search,
  ChevronDown,
  AlertTriangle,
  Edit2,
  Trash2,
  X,
  RefreshCw,
} from 'lucide-react';

const SHOP_TYPE_CATEGORIES = {
  'General Store': [
    'Grocery & Pantry',
    'Rice & Pulses',
    'Snacks & Beverages',
    'Dairy & Bakery',
    'Cooking Oils & Ghee',
    'Spices & Seasonings',
    'Household & Cleaning',
    'Personal Care',
    'Kitchenware',
    'Stationery',
    'Baby Products',
    'Small Electronics',
  ],
  'Book & Stationery Store': [
    'School Textbooks',
    'Reference & Exam Books',
    'Fiction & Nonfiction',
    'Notebooks & Paper',
    'Pens & Writing Supplies',
    'Art & Craft Supplies',
    'School Supplies',
    'Office Supplies',
    'School Bags',
  ],
  'Electrical & Electronics Store': [
    'Wires & Cables',
    'Switches & Sockets',
    'Electrical Tools',
    'Lighting',
    'Fans & Cooling',
    'Batteries & Chargers',
    'Mobile Phones & Accessories',
    'Computer Accessories',
    'Electronics',
    'Home Appliances',
    'Audio & Video',
  ],
  'Bike & Automotive Shop': [
    'Bikes & Scooters',
    'Engine Parts',
    'Brakes & Suspension',
    'Electrical Parts',
    'Tyres & Tubes',
    'Batteries',
    'Lubricants',
    'Helmets & Safety Gear',
    'Bike Accessories',
    'Automotive Parts',
  ],
  'Grocery Store': [
    'Grains & Flour',
    'Rice & Pulses',
    'Oils & Ghee',
    'Spices & Seasonings',
    'Dairy & Bakery',
    'Beverages',
    'Snacks & Packaged Foods',
    'Frozen Foods',
    'Household & Cleaning',
    'Personal Care',
  ],
  'Clothing & Apparel Store': [
    'Mens Clothing',
    'Womens Clothing',
    'Kids Clothing',
    'Ethnic Wear',
    'Western Wear',
    'Fabric',
    'Fashion Accessories',
    'Innerwear',
  ],
  'Footwear Store': [
    'Mens Footwear',
    'Womens Footwear',
    'Kids Footwear',
    'Sports Footwear',
    'Sandals & Slippers',
    'Shoe Care & Accessories',
  ],
  Pharmacy: [
    'Prescription Medicines',
    'Over-the-Counter Medicines',
    'First Aid',
    'Medical Supplies',
    'Personal Care',
    'Health Supplements',
    'Baby Care',
    'Medical Devices',
  ],
  'Hardware & Building Materials Store': [
    'Hand Tools',
    'Power Tools',
    'Fasteners & Fittings',
    'Electrical Supplies',
    'Plumbing Supplies',
    'Building Materials',
    'Paints & Finishes',
    'Safety Gear',
    'Garden & Outdoor',
  ],
  'Furniture Store': [
    'Living Room Furniture',
    'Bedroom Furniture',
    'Office Furniture',
    'Dining Furniture',
    'Mattresses',
    'Home Decor & Furnishings',
    'Storage & Shelving',
  ],
};

const SHOP_TYPES = [
  'General Store',
  'Book & Stationery Store',
  'Electrical & Electronics Store',
  'Bike & Automotive Shop',
  'Grocery Store',
  'Clothing & Apparel Store',
  'Footwear Store',
  'Pharmacy',
  'Hardware & Building Materials Store',
  'Furniture Store',
  'Other',
];

const UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'packet', 'box', 'dozen', 'meter'];

const Inventory = () => {
  const { user, updateProfile } = useAuth();
  const isOwner = user?.role === 'owner';
  const shopTypeCategories = Object.prototype.hasOwnProperty.call(SHOP_TYPE_CATEGORIES, user?.shopType)
    ? SHOP_TYPE_CATEGORIES[user.shopType]
    : [];
  const customCategories = Array.isArray(user?.customCategories)
    ? user.customCategories.filter((category) => typeof category === 'string' && category.trim())
    : [];
  const hiddenCategories = Array.isArray(user?.hiddenCategories)
    ? user.hiddenCategories.filter((category) => typeof category === 'string' && category.trim())
    : [];
  const categories = [...shopTypeCategories];
  for (const customCategory of customCategories) {
    if (!categories.some((category) => category.toLowerCase() === customCategory.toLowerCase())) {
      categories.push(customCategory);
    }
  }
  const visibleCategories = categories.filter(
    (category) =>
      !['general', 'other'].includes(category.toLowerCase()) &&
      !hiddenCategories.some((hiddenCategory) => hiddenCategory.toLowerCase() === category.toLowerCase())
  );

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShopType, setSelectedShopType] = useState('');
  const [customShopType, setCustomShopType] = useState('');
  const [isSavingShopType, setIsSavingShopType] = useState(false);
  const [isEditingShopType, setIsEditingShopType] = useState(false);
  const [search, setSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: visibleCategories[0] || '',
    barcode: '',
    purchasePrice: '',
    sellingPrice: '',
    stock: '',
    unit: 'pcs',
    lowStockThreshold: 5,
  });
  const formCategories =
    editingProduct &&
    formData.category &&
    !['general', 'other'].includes(formData.category.toLowerCase()) &&
    !visibleCategories.includes(formData.category)
      ? [formData.category, ...visibleCategories]
      : visibleCategories;
  const visibleFilterCategories = visibleCategories.filter((category) =>
    category.toLowerCase().includes(categorySearch.trim().toLowerCase())
  );
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (lowStockFilter) params.lowStock = 'true';

      const res = await api.get('/products', { params });
      setProducts(res.data.data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setFeedback({ type: 'error', message: 'Failed to load inventory products.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner && !user?.shopType) {
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, lowStockFilter, isOwner, user?.shopType]);

  const handleShopTypeSubmit = async (e) => {
    e.preventDefault();
    const shopType = selectedShopType === 'Other' ? customShopType.trim() : selectedShopType;

    if (!shopType) {
      setFeedback({ type: 'error', message: 'Please select or enter your store type.' });
      return;
    }

    const newTypeCategories = SHOP_TYPE_CATEGORIES[shopType] || [];
    const currentTypeCategories = SHOP_TYPE_CATEGORIES[user?.shopType] || [];
    const isChangingType = Boolean(user?.shopType && user.shopType !== shopType);
    if (
      isChangingType &&
      !window.confirm(
        'Changing your store type will not delete products or change their stock. Your existing categories will be merged with the new store type categories so products keep their categories.'
      )
    ) {
      return;
    }

    const mergedCustomCategories = [...customCategories];
    for (const category of currentTypeCategories) {
      const existsInNewType = newTypeCategories.some(
        (newCategory) => newCategory.toLowerCase() === category.toLowerCase()
      );
      const alreadyPreserved = mergedCustomCategories.some(
        (existingCategory) => existingCategory.toLowerCase() === category.toLowerCase()
      );
      if (!existsInNewType && !alreadyPreserved) {
        mergedCustomCategories.push(category);
      }
    }

    setIsSavingShopType(true);
    setFeedback({ type: '', message: '' });
    const result = await updateProfile({
      shopType,
      ...(isChangingType ? { customCategories: mergedCustomCategories } : {}),
    });
    setIsSavingShopType(false);

    if (!result.success) {
      setFeedback({ type: 'error', message: result.message });
      return;
    }

    setIsEditingShopType(false);
    setSelectedCategory('All');
  };

  const handleOpenShopTypeEditor = () => {
    const isPredefinedType = SHOP_TYPES.includes(user.shopType) && user.shopType !== 'Other';
    setSelectedShopType(isPredefinedType ? user.shopType : 'Other');
    setCustomShopType(isPredefinedType ? '' : user.shopType);
    setFeedback({ type: '', message: '' });
    setIsEditingShopType(true);
  };

  const handleOpenAddCategory = () => {
    setNewCategoryName('');
    setCategoryError('');
    setIsCategoryDropdownOpen(false);
    setIsAddCategoryOpen(true);
  };

  const handleAddCategorySubmit = async (e) => {
    e.preventDefault();
    const categoryName = newCategoryName.trim();

    if (!categoryName) {
      setCategoryError('Enter a category name.');
      return;
    }

    if (['all', 'general', 'other'].includes(categoryName.toLowerCase())) {
      setCategoryError('All, General, and Other are reserved and cannot be added as categories.');
      return;
    }

    if (visibleCategories.some((category) => category.toLowerCase() === categoryName.toLowerCase())) {
      setCategoryError('This category already exists.');
      return;
    }

    const updatedCustomCategories = [...customCategories, categoryName];
    const updatedHiddenCategories = hiddenCategories.filter(
      (category) => category.toLowerCase() !== categoryName.toLowerCase()
    );
    setIsSavingCategory(true);
    setCategoryError('');
    const result = await updateProfile({
      customCategories: updatedCustomCategories,
      hiddenCategories: updatedHiddenCategories,
    });
    setIsSavingCategory(false);

    if (!result.success) {
      setCategoryError(result.message);
      return;
    }

    setIsAddCategoryOpen(false);
    setNewCategoryName('');
    setCategorySearch('');
    setSelectedCategory(categoryName);
    if (isModalOpen) {
      setFormData((previous) => ({ ...previous, category: categoryName }));
    }
  };

  const handleDeleteCategory = async (categoryName) => {
    if (!isOwner || !categoryName || categoryName === 'All') return;
    if (!window.confirm(`Remove "${categoryName}" from the category list? Existing products will keep this category.`)) {
      return;
    }

    const updatedCustomCategories = customCategories.filter(
      (category) => category.toLowerCase() !== categoryName.toLowerCase()
    );
    const updatedHiddenCategories = [...hiddenCategories];
    if (!updatedHiddenCategories.some((category) => category.toLowerCase() === categoryName.toLowerCase())) {
      updatedHiddenCategories.push(categoryName);
    }

    const result = await updateProfile({
      customCategories: updatedCustomCategories,
      hiddenCategories: updatedHiddenCategories,
    });
    if (!result.success) {
      setFeedback({ type: 'error', message: result.message });
      return;
    }

    setSelectedCategory('All');
    setCategorySearch('');
    setIsCategoryDropdownOpen(false);
    setFeedback({ type: 'success', message: `Category "${categoryName}" removed.` });
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setCategorySearch('');
    setFormData({
      name: '',
      category: visibleCategories[0] || '',
      barcode: '',
      purchasePrice: '',
      sellingPrice: '',
      stock: '',
      unit: 'pcs',
      lowStockThreshold: 5,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setCategorySearch('');
    setFormData({
      name: product.name,
      category: ['general', 'other'].includes((product.category || '').toLowerCase())
        ? visibleCategories[0] || ''
        : product.category,
      barcode: product.barcode || '',
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      stock: product.stock,
      unit: product.unit,
      lowStockThreshold: product.lowStockThreshold || 5,
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, formData);
        setFeedback({ type: 'success', message: `Product "${formData.name}" updated successfully.` });
      } else {
        await api.post('/products', formData);
        setFeedback({ type: 'success', message: `Product "${formData.name}" added to inventory.` });
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Error saving product. Please check inputs.',
      });
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from inventory?`)) return;
    try {
      await api.delete(`/products/${id}`);
      setFeedback({ type: 'success', message: `Product "${name}" removed.` });
      fetchProducts();
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to delete product.' });
    }
  };

  const handleQuickStock = async (product, change) => {
    const newStock = Math.max(0, product.stock + change);
    try {
      await api.put(`/products/${product._id}`, { stock: newStock });
      setProducts((prev) =>
        prev.map((p) => (p._id === product._id ? { ...p, stock: newStock } : p))
      );
    } catch (err) {
      console.error('Failed to update stock:', err);
    }
  };

  // Metrics
  const totalProducts = products.length;
  const lowStockCount = products.filter((p) => p.stock <= p.lowStockThreshold).length;

  if (isOwner && (!user.shopType || isEditingShopType)) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-7 h-7 text-emerald-600" />
            <h1 className="text-2xl font-extrabold text-slate-900">
              {user.shopType ? 'Edit Store Type' : 'Set Up Your Store'}
            </h1>
          </div>
          <p className="text-sm text-slate-600 mb-6">
            {user.shopType
              ? 'Choose a new store type. Existing products and stock stay unchanged, and categories are merged with the new store type.'
              : 'Choose your store type first. You can add your own products to the inventory next.'}
          </p>

          {feedback.message && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleShopTypeSubmit} className="space-y-4">
            <div>
              <label htmlFor="shopType" className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Store Type *
              </label>
              <select
                id="shopType"
                required
                value={selectedShopType}
                onChange={(e) => setSelectedShopType(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">Select your store type</option>
                {SHOP_TYPES.map((shopType) => (
                  <option key={shopType} value={shopType}>
                    {shopType}
                  </option>
                ))}
              </select>
            </div>

            {selectedShopType === 'Other' && (
              <div>
                <label htmlFor="customShopType" className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Enter Store Type *
                </label>
                <input
                  id="customShopType"
                  type="text"
                  required
                  maxLength={80}
                  value={customShopType}
                  onChange={(e) => setCustomShopType(e.target.value)}
                  placeholder="e.g. Music Store"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSavingShopType || !selectedShopType || (selectedShopType === 'Other' && !customShopType.trim())}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingShopType ? 'Saving...' : user.shopType ? 'Save Store Type' : 'Continue to Inventory'}
            </button>
            {user.shopType && (
              <button
                type="button"
                onClick={() => setIsEditingShopType(false)}
                className="ml-3 px-5 py-2.5 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl text-sm transition"
              >
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Package className="w-7 h-7 text-emerald-600" />
            Inventory & Stock Tracker
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your store items, purchase & selling prices, and track low stock.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {isOwner && (
            <button
              type="button"
              onClick={handleOpenShopTypeEditor}
              className="inline-flex items-center justify-center px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-sm transition"
            >
              Edit Store Type
            </button>
          )}
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback.message && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback({ type: '', message: '' })}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Catalog Items
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalProducts}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
            Low Stock Alerts
          </span>
          <div className="text-2xl font-black text-amber-600 mt-1">{lowStockCount} items</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Quick Filter
            </span>
            <div className="text-xs text-slate-600 mt-1">Show items needing reorder</div>
          </div>
          <button
            onClick={() => setLowStockFilter(!lowStockFilter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              lowStockFilter
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {lowStockFilter ? 'Showing Low Stock' : 'Show Low Stock'}
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name, barcode or category..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div className="relative flex-1 md:max-w-xs">
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={isCategoryDropdownOpen}
            onClick={() => {
              if (!isCategoryDropdownOpen) setCategorySearch('');
              setIsCategoryDropdownOpen((open) => !open);
            }}
            className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <span className="truncate">
              {selectedCategory === 'All' ? 'All Categories' : selectedCategory}
            </span>
            <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />
          </button>

          {isCategoryDropdownOpen && (
            <div
              role="dialog"
              aria-label="Category filter"
              className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg"
            >
              <div className="relative p-2 border-b border-slate-100">
                <Search className="w-4 h-4 absolute left-5 top-4 text-slate-400" />
                <input
                  type="search"
                  autoFocus
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Search categories..."
                  aria-label="Search categories"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="max-h-64 overflow-y-auto p-1">
                <button
                  type="button"
                  aria-pressed={selectedCategory === 'All'}
                  onClick={() => {
                    setSelectedCategory('All');
                    setCategorySearch('');
                    setIsCategoryDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  All Categories
                </button>
                {visibleFilterCategories.map((category) => (
                  <div key={category} className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-pressed={selectedCategory === category}
                      onClick={() => {
                        setSelectedCategory(category);
                        setCategorySearch('');
                        setIsCategoryDropdownOpen(false);
                      }}
                      className="flex-1 min-w-0 px-3 py-2 text-left text-sm rounded-lg text-slate-700 hover:bg-slate-50 truncate"
                    >
                      {category}
                    </button>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category)}
                        aria-label={`Delete ${category} category`}
                        title={`Delete ${category} category`}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {visibleFilterCategories.length === 0 && (
                  <p className="px-3 py-2 text-sm text-slate-500">No matching categories.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={handleOpenAddCategory}
            aria-label="Add category"
            title="Add category"
            className="inline-flex items-center justify-center px-3 py-2 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No products found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Start building your store inventory by clicking "+ Add New Product" above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Category</th>
                  {isOwner && <th className="py-3 px-4">Cost (Purchase)</th>}
                  <th className="py-3 px-4">MRP (Selling)</th>
                  <th className="py-3 px-4">Stock In Hand</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {products.map((p) => {
                  const isLow = p.stock <= p.lowStockThreshold;
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div>{p.name}</div>
                        {p.barcode && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            SKU: {p.barcode}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">
                          {p.category}
                        </span>
                      </td>
                      {isOwner && (
                        <td className="py-3.5 px-4 text-slate-600 font-mono">
                          ₹{p.purchasePrice !== undefined ? Number(p.purchasePrice).toFixed(2) : '0.00'}
                        </td>
                      )}
                      <td className="py-3.5 px-4 font-bold text-emerald-700">
                        ₹{Number(p.sellingPrice).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded-lg text-xs font-bold ${
                              isLow
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-emerald-50 text-emerald-800'
                            }`}
                          >
                            {p.stock} {p.unit}
                          </span>
                          {isLow && (
                            <span
                              title="Low stock reorder alert"
                              className="text-amber-500 flex items-center"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </span>
                          )}
                          <div className="inline-flex rounded border border-slate-200 ml-1">
                            <button
                              onClick={() => handleQuickStock(p, -1)}
                              className="px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
                              title="Decrease 1"
                            >
                              -
                            </button>
                            <button
                              onClick={() => handleQuickStock(p, 1)}
                              className="px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
                              title="Add 1"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {isOwner && (
                            <button
                              onClick={() => handleDelete(p._id, p.name)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAddCategoryOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-category-title"
            className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6"
          >
            <h2 id="add-category-title" className="text-lg font-bold text-slate-900">
              Add Custom Category
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              This category will be available across all shop types.
            </p>

            {categoryError && (
              <p className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {categoryError}
              </p>
            )}

            <form onSubmit={handleAddCategorySubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="newCategoryName" className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Category Name *
                </label>
                <input
                  id="newCategoryName"
                  type="text"
                  required
                  maxLength={80}
                  autoFocus
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Mobile Accessories"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(false)}
                  disabled={isSavingCategory}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategory || !newCategoryName.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {isSavingCategory ? 'Saving...' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Fortune Sunflower Oil (1L) / Tata Salt"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase text-slate-700">
                      Category
                    </label>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={handleOpenAddCategory}
                        aria-label="Add category"
                        title="Add category"
                        className="inline-flex items-center justify-center p-1 text-emerald-700 hover:bg-emerald-50 rounded transition"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="" disabled>
                      Select a category
                    </option>
                    {formCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Barcode / SKU (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="e.g. 890123456789"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className={`grid ${isOwner ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                {isOwner && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Purchase Price (Wholesale ₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required={isOwner}
                      value={formData.purchasePrice}
                      onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Selling Price / MRP (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Initial Stock *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Low Stock Alert
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.lowStockThreshold}
                    onChange={(e) =>
                      setFormData({ ...formData, lowStockThreshold: e.target.value })
                    }
                    placeholder="5"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition"
                >
                  {editingProduct ? 'Save Changes' : 'Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
