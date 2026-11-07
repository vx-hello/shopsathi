const User = require('../models/User');
const Bill = require('../models/Bill');
const generateToken = require('../utils/generateToken');

/**
 * @desc    Register a new user (Shop Owner or Staff linked to Owner)
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, shopName, shopAddress, role, ownerContact } = req.body;

    // Basic presence validation
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, phone, and password.',
      });
    }

    const userRole = role === 'staff' ? 'staff' : 'owner';

    let ownerId = null;
    let finalShopName = shopName ? shopName.trim() : '';
    let finalShopAddress = shopAddress ? shopAddress.trim() : '';

    if (userRole === 'owner') {
      if (!finalShopName) {
        return res.status(400).json({
          success: false,
          message: 'Shop name is required for shop owner registration.',
        });
      }
    } else {
      // Staff registration: Must link to a valid Shop Owner
      if (!ownerContact && !shopName) {
        return res.status(400).json({
          success: false,
          message: "Please enter your Shop Owner's Mobile Number, Email, or Shop Name to link your staff account.",
        });
      }

      // Look up owner by phone, email, or exact shopName
      const ownerQuery = { role: 'owner' };
      if (ownerContact) {
        const cleanContact = ownerContact.trim().toLowerCase();
        ownerQuery.$or = [
          { phone: cleanContact },
          { email: cleanContact },
        ];
      } else if (shopName) {
        ownerQuery.shopName = { $regex: new RegExp(`^${shopName.trim()}$`, 'i') };
      }

      const owner = await User.findOne(ownerQuery);
      if (!owner) {
        return res.status(404).json({
          success: false,
          message: `No shop owner found matching "${ownerContact || shopName}". Please verify the owner's mobile number or email.`,
        });
      }

      ownerId = owner._id;
      finalShopName = owner.shopName;
      finalShopAddress = owner.shopAddress || '';
    }

    // Check if user already exists with email
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Create user (password will be hashed by pre-save hook)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone.trim(),
      role: userRole,
      shopName: finalShopName,
      shopAddress: finalShopAddress,
      ownerId,
      isActive: true,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: userRole === 'staff'
        ? `Staff account created and linked to ${finalShopName}.`
        : 'Account created successfully.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        shopName: user.shopName,
        shopAddress: user.shopAddress,
        ownerId: user.ownerId,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Please contact your shop owner.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Self-healing check: If staff user has null ownerId, attempt to link by shopName
    if (user.role === 'staff' && !user.ownerId && user.shopName) {
      const owner = await User.findOne({
        shopName: { $regex: new RegExp(`^${user.shopName.trim()}$`, 'i') },
        role: 'owner',
      });
      if (owner) {
        user.ownerId = owner._id;
        await user.save();
        await Bill.updateMany({ createdBy: user._id, owner: user._id }, { owner: owner._id });
      }
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        shopName: user.shopName,
        shopAddress: user.shopAddress,
        ownerId: user.ownerId,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user profile
 * @route   GET /api/auth/me
 * @access  Private (JWT Protected)
 */
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current user profile / store info
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { name, phone, shopName, shopAddress } = req.body;

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();

    if (user.role === 'owner') {
      if (shopName) {
        user.shopName = shopName.trim();
        // Update staff members' shopName too
        await User.updateMany({ ownerId: user._id }, { shopName: user.shopName });
      }
      if (shopAddress !== undefined) {
        user.shopAddress = shopAddress.trim();
        await User.updateMany({ ownerId: user._id }, { shopAddress: user.shopAddress });
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        shopName: user.shopName,
        shopAddress: user.shopAddress,
        ownerId: user.ownerId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get list of all staff members belonging to this shop owner (with self-healing auto-link)
 * @route   GET /api/auth/staff
 * @access  Private (Owner Only)
 */
const getShopStaff = async (req, res, next) => {
  try {
    const owner = req.user;

    // Find staff linked directly OR matching this owner's exact shopName
    const query = {
      role: 'staff',
      $or: [
        { ownerId: owner._id },
      ],
    };

    if (owner.shopName) {
      query.$or.push({
        shopName: { $regex: new RegExp(`^${owner.shopName.trim()}$`, 'i') },
      });
    }

    const staffMembers = await User.find(query).select('-password').sort({ createdAt: -1 });

    // Self-healing: Ensure all found staff have ownerId set to this owner
    for (const st of staffMembers) {
      if (!st.ownerId || String(st.ownerId) !== String(owner._id)) {
        st.ownerId = owner._id;
        await st.save();

        // Migrate any bills previously orphaned
        await Bill.updateMany(
          { createdBy: st._id, owner: { $ne: owner._id } },
          { owner: owner._id }
        );
      }
    }

    res.status(200).json({
      success: true,
      count: staffMembers.length,
      data: staffMembers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Owner creates a new staff user for their shop
 * @route   POST /api/auth/staff
 * @access  Private (Owner Only)
 */
const createShopStaff = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, and password are required for staff.',
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    const staff = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone.trim(),
      role: 'staff',
      shopName: req.user.shopName || '',
      shopAddress: req.user.shopAddress || '',
      ownerId: req.user._id,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: `Staff account created for ${staff.name}`,
      data: {
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        isActive: staff.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Owner toggles staff active status
 * @route   PUT /api/auth/staff/:id/status
 * @access  Private (Owner Only)
 */
const toggleStaffStatus = async (req, res, next) => {
  try {
    const staff = await User.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
      role: 'staff',
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    staff.isActive = !staff.isActive;
    await staff.save();

    res.status(200).json({
      success: true,
      message: `Staff member ${staff.isActive ? 'activated' : 'deactivated'} successfully.`,
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Owner deletes a staff member
 * @route   DELETE /api/auth/staff/:id
 * @access  Private (Owner Only)
 */
const deleteStaff = async (req, res, next) => {
  try {
    const staff = await User.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.user._id,
      role: 'staff',
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    res.status(200).json({
      success: true,
      message: `Staff account ${staff.name} deleted.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  getShopStaff,
  createShopStaff,
  toggleStaffStatus,
  deleteStaff,
};
