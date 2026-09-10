const supabase = require('../config/supabase');

// Cache for role permissions to reduce database queries
const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get permissions for a role
 * Uses caching to improve performance
 */
async function getRolePermissions(roleName) {
  const cacheKey = `role_${roleName}`;
  const cached = permissionCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions;
  }
  
  const { data, error } = await supabase
    .from('role_permissions')
    .select('permissions(name, description, category)')
    .innerJoin('permissions', 'role_permissions.permission_id', 'permissions.id')
    .innerJoin('roles', 'role_permissions.role_id', 'roles.id')
    .eq('roles.name', roleName);
  
  if (error) {
    console.error('Error fetching role permissions:', error);
    return [];
  }
  
  const permissions = data.map(rp => rp.permissions);
  permissionCache.set(cacheKey, { permissions, timestamp: Date.now() });
  
  return permissions;
}

/**
 * Check if a user has a specific permission
 */
async function hasPermission(userRole, permissionName) {
  if (!userRole) return false;
  
  // SUPER_ADMIN has all permissions
  if (userRole === 'SUPER_ADMIN' || userRole === 'super_admin') {
    return true;
  }
  
  const permissions = await getRolePermissions(userRole);
  return permissions.some(p => p.name === permissionName);
}

/**
 * Check if a user has any of the specified permissions
 */
async function hasAnyPermission(userRole, permissionNames) {
  if (!userRole) return false;
  
  // SUPER_ADMIN has all permissions
  if (userRole === 'SUPER_ADMIN' || userRole === 'super_admin') {
    return true;
  }
  
  const permissions = await getRolePermissions(userRole);
  const userPermissionNames = permissions.map(p => p.name);
  return permissionNames.some(name => userPermissionNames.includes(name));
}

/**
 * Check if a user has all of the specified permissions
 */
async function hasAllPermissions(userRole, permissionNames) {
  if (!userRole) return false;
  
  // SUPER_ADMIN has all permissions
  if (userRole === 'SUPER_ADMIN' || userRole === 'super_admin') {
    return true;
  }
  
  const permissions = await getRolePermissions(userRole);
  const userPermissionNames = permissions.map(p => p.name);
  return permissionNames.every(name => userPermissionNames.includes(name));
}

/**
 * Middleware to require authentication
 */
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

/**
 * Middleware to require specific role(s)
 */
const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Normalize role names for comparison
    const userRole = req.user.role?.toUpperCase();
    const normalizedAllowedRoles = allowedRoles.map(r => r.toUpperCase());
    
    if (!normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

/**
 * Middleware to require specific permission
 */
const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userRole = req.user.role?.toUpperCase();
    
    // SUPER_ADMIN has all permissions
    if (userRole === 'SUPER_ADMIN') {
      return next();
    }
    
    const hasPerm = await hasPermission(userRole, permissionName);
    
    if (!hasPerm) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permissionName
      });
    }
    
    next();
  };
};

/**
 * Middleware to require any of the specified permissions
 */
const requireAnyPermission = (...permissionNames) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userRole = req.user.role?.toUpperCase();
    
    // SUPER_ADMIN has all permissions
    if (userRole === 'SUPER_ADMIN') {
      return next();
    }
    
    const hasPerm = await hasAnyPermission(userRole, permissionNames);
    
    if (!hasPerm) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permissionNames
      });
    }
    
    next();
  };
};

/**
 * Middleware to require all of the specified permissions
 */
const requireAllPermissions = (...permissionNames) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userRole = req.user.role?.toUpperCase();
    
    // SUPER_ADMIN has all permissions
    if (userRole === 'SUPER_ADMIN') {
      return next();
    }
    
    const hasPerm = await hasAllPermissions(userRole, permissionNames);
    
    if (!hasPerm) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permissionNames
      });
    }
    
    next();
  };
};

/**
 * Get all permissions for a user (for frontend)
 */
async function getUserPermissions(userRole) {
  if (!userRole) return [];
  
  // SUPER_ADMIN has all permissions
  if (userRole === 'SUPER_ADMIN' || userRole === 'super_admin') {
    const { data } = await supabase
      .from('permissions')
      .select('name, description, category');
    return data || [];
  }
  
  return await getRolePermissions(userRole);
}

/**
 * Clear permission cache (call after role/permission changes)
 */
function clearPermissionCache(roleName) {
  if (roleName) {
    permissionCache.delete(`role_${roleName}`);
  } else {
    permissionCache.clear();
  }
}

module.exports = {
  requireAuth,
  requireRole,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserPermissions,
  clearPermissionCache,
  getRolePermissions
};
