const User = require('../models/User');

/**
 * Robust helper to resolve the shop owner's ID for any user (Owner or Staff).
 * Includes self-healing auto-linking for staff members who registered before linking.
 * 
 * @param {Object} user - The authenticated user object (from req.user)
 * @returns {Promise<mongoose.Types.ObjectId>} The owner ID
 */
const getOwnerId = async (user) => {
  if (!user) return null;

  if (user.role === 'staff') {
    // 1. Direct link already present
    if (user.ownerId) {
      return user.ownerId;
    }

    // 2. Self-healing: Find owner by shopName if staff was registered with matching shop
    if (user.shopName) {
      const owner = await User.findOne({
        shopName: { $regex: new RegExp(`^${user.shopName.trim()}$`, 'i') },
        role: 'owner',
      });

      if (owner) {
        // Link staff to owner in database
        await User.findByIdAndUpdate(user._id, { ownerId: owner._id });
        user.ownerId = owner._id;

        // Migrate any bills previously created by this staff to the owner's store
        try {
          const Bill = require('../models/Bill');
          await Bill.updateMany({ createdBy: user._id, owner: user._id }, { owner: owner._id });
        } catch (e) {
          // ignore if Bill model not ready
        }

        return owner._id;
      }
    }
  }

  return user._id;
};

module.exports = getOwnerId;
