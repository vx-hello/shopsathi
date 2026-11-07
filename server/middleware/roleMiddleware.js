/**
 * Role-based authorization middleware
 * @param  {...string} roles - Allowed roles (e.g., 'owner', 'staff')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking permissions.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: role '${req.user.role}' is not authorized to access this resource. Requires: [${roles.join(', ')}]`,
      });
    }

    next();
  };
};

module.exports = { authorize };
