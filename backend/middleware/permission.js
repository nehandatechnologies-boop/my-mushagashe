const Permission = require('../models/Permission');

// Check if user has specific permission
const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const hasPermission = await Permission.hasPermission(req.user.role, permissionName);

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permissionName
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Check if user has any of the specified permissions
const requireAnyPermission = (...permissionNames) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const hasPermission = await Permission.hasAnyPermission(req.user.role, permissionNames);

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permissionNames
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Check if user can access specific resource (IDOR protection)
const requireResourceAccess = (resourceType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const resourceId = req.params.id || req.params.userId || req.params.studentId;
      
      // Admins and super admins can access all resources
      if (req.user.role === 'admin' || req.user.role === 'super_admin') {
        return next();
      }

      // Students can only access their own resources
      if (req.user.role === 'student') {
        if (resourceId != req.user.id) {
          return res.status(403).json({ error: 'Access denied: You can only access your own data' });
        }
        return next();
      }

      // Lecturers/instructors can access students in their assigned course
      if (req.user.role === 'lecturer' || req.user.role === 'instructor') {
        // This will be checked in the controller based on course assignment
        return next();
      }

      // Other roles need specific permission
      const permissionName = `VIEW_${resourceType.toUpperCase()}`;
      const hasPermission = await Permission.hasPermission(req.user.role, permissionName);

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permissionName
        });
      }

      next();
    } catch (error) {
      console.error('Resource access check error:', error);
      return res.status(500).json({ error: 'Access check failed' });
    }
  };
};

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireResourceAccess
};
