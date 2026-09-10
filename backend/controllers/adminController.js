const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Permission = require('../models/Permission');
const AuditLog = require('../models/AuditLog');
const { auditActions } = require('../services/auditService');

/**
 * Get all administrators (SUPER_ADMIN only)
 */
const getAllAdmins = async (req, res) => {
  try {
    const admins = await User.findAll({ role: 'admin' });
    
    // Filter for admin roles (including new RBAC roles)
    const allAdmins = admins.filter(user => 
      user.role === 'admin' || 
      user.role === 'super_admin' ||
      user.role === 'SUPER_ADMIN' ||
      user.role === 'ACADEMIC_ADMIN' ||
      user.role === 'FINANCE_ADMIN' ||
      user.role === 'ADMISSIONS_ADMIN' ||
      user.role === 'LECTURER_ADMIN'
    );

    // Remove passwords from response
    const adminsWithoutPasswords = allAdmins.map(admin => {
      const { password, ...adminWithoutPassword } = admin;
      return adminWithoutPassword;
    });

    res.json(adminsWithoutPasswords);
  } catch (error) {
    console.error('Get all admins error:', error);
    res.status(500).json({ error: 'Failed to fetch administrators' });
  }
};

/**
 * Get administrator by ID (SUPER_ADMIN only)
 */
const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await User.findById(id);

    if (!admin) {
      return res.status(404).json({ error: 'Administrator not found' });
    }

    // Verify it's an admin
    const isAdmin = admin.role === 'admin' || 
                   admin.role === 'super_admin' ||
                   admin.role === 'SUPER_ADMIN' ||
                   admin.role === 'ACADEMIC_ADMIN' ||
                   admin.role === 'FINANCE_ADMIN' ||
                   admin.role === 'ADMISSIONS_ADMIN' ||
                   admin.role === 'LECTURER_ADMIN';

    if (!isAdmin) {
      return res.status(404).json({ error: 'Administrator not found' });
    }

    const { password, ...adminWithoutPassword } = admin;
    res.json(adminWithoutPassword);
  } catch (error) {
    console.error('Get admin by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch administrator' });
  }
};

/**
 * Create new administrator (SUPER_ADMIN only)
 */
const createAdmin = async (req, res) => {
  try {
    const { full_name, email, password, role, status } = req.body;

    // Validation
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ error: 'Full name, email, password, and role are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Validate role
    const validRoles = ['SUPER_ADMIN', 'ACADEMIC_ADMIN', 'FINANCE_ADMIN', 'ADMISSIONS_ADMIN', 'LECTURER_ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Prevent non-super admins from creating SUPER_ADMIN
    if (role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only SUPER_ADMIN can create SUPER_ADMIN accounts' });
    }

    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create admin
    const newAdmin = await User.create({
      full_name,
      email,
      password: hashedPassword,
      role,
      status: status || 'active'
    });

    // Log the action
    await auditActions.adminCreate(req, newAdmin.id, `Created new administrator: ${full_name} (${email}) with role ${role}`);

    const { password: _, ...adminWithoutPassword } = newAdmin;
    res.status(201).json(adminWithoutPassword);
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Failed to create administrator' });
  }
};

/**
 * Update administrator (SUPER_ADMIN only)
 */
const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, role, status } = req.body;

    // Get existing admin
    const existingAdmin = await User.findById(id);
    if (!existingAdmin) {
      return res.status(404).json({ error: 'Administrator not found' });
    }

    // Verify it's an admin
    const isAdmin = existingAdmin.role === 'admin' || 
                   existingAdmin.role === 'super_admin' ||
                   existingAdmin.role === 'SUPER_ADMIN' ||
                   existingAdmin.role === 'ACADEMIC_ADMIN' ||
                   existingAdmin.role === 'FINANCE_ADMIN' ||
                   existingAdmin.role === 'ADMISSIONS_ADMIN' ||
                   existingAdmin.role === 'LECTURER_ADMIN';

    if (!isAdmin) {
      return res.status(404).json({ error: 'Administrator not found' });
    }

    // Prevent admins from changing their own role
    if (role && parseInt(id) === req.user.id) {
      return res.status(403).json({ error: 'You cannot change your own role' });
    }

    // Prevent non-super admins from promoting to SUPER_ADMIN
    if (role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only SUPER_ADMIN can assign SUPER_ADMIN role' });
    }

    // Check if email is being changed and if it conflicts
    if (email && email !== existingAdmin.email) {
      const emailExists = await User.findByEmail(email);
      if (emailExists) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }

    // Update admin
    const updateData = { full_name, email, role, status };
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedAdmin = await User.update(id, updateData);

    // Log the action
    await auditActions.adminUpdate(req, id, `Updated administrator: ${full_name || existingAdmin.full_name}`);

    const { password, ...adminWithoutPassword } = updatedAdmin;
    res.json(adminWithoutPassword);
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ error: 'Failed to update administrator' });
  }
};

/**
 * Suspend administrator (SUPER_ADMIN only)
 */
const suspendAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Get existing admin
    const existingAdmin = await User.findById(id);
    if (!existingAdmin) {
      return res.status(404).json({ error: 'Administrator not found' });
    }

    // Verify it's an admin
    const isAdmin = existingAdmin.role === 'admin' || 
                   existingAdmin.role === 'super_admin' ||
                   existingAdmin.role === 'SUPER_ADMIN' ||
                   existingAdmin.role === 'ACADEMIC_ADMIN' ||
                   existingAdmin.role === 'FINANCE_ADMIN' ||
                   existingAdmin.role === 'ADMISSIONS_ADMIN' ||
                   existingAdmin.role === 'LECTURER_ADMIN';

    if (!isAdmin) {
      return res.status(404).json({ error: 'Administrator not found' });
    }

    // Prevent suspending self
    if (parseInt(id) === req.user.id) {
      return res.status(403).json({ error: 'You cannot suspend yourself' });
    }

    // Prevent suspending the last SUPER_ADMIN
    if (existingAdmin.role === 'SUPER_ADMIN' || existingAdmin.role === 'super_admin') {
      // Count active SUPER_ADMINs
      const allAdmins = await User.findAll({ role: 'super_admin' });
      const activeSuperAdmins = allAdmins.filter(a => 
        (a.role === 'SUPER_ADMIN' || a.role === 'super_admin') && 
        a.status === 'active' &&
        a.id !== parseInt(id)
      );

      if (activeSuperAdmins.length === 0) {
        return res.status(403).json({ error: 'Cannot suspend the last active SUPER_ADMIN' });
      }
    }

    // Suspend admin
    await User.update(id, { status: 'suspended' });

    // Log the action
    await auditActions.adminSuspend(req, id, `Suspended administrator: ${existingAdmin.full_name}`);

    res.json({ message: 'Administrator suspended successfully' });
  } catch (error) {
    console.error('Suspend admin error:', error);
    res.status(500).json({ error: 'Failed to suspend administrator' });
  }
};

/**
 * Reactivate administrator (SUPER_ADMIN only)
 */
const reactivateAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Get existing admin
    const existingAdmin = await User.findById(id);
    if (!existingAdmin) {
      return res.status(404).json({ error: 'Administrator not found' });
    }

    // Verify it's an admin
    const isAdmin = existingAdmin.role === 'admin' || 
                   existingAdmin.role === 'super_admin' ||
                   existingAdmin.role === 'SUPER_ADMIN' ||
                   existingAdmin.role === 'ACADEMIC_ADMIN' ||
                   existingAdmin.role === 'FINANCE_ADMIN' ||
                   existingAdmin.role === 'ADMISSIONS_ADMIN' ||
                   existingAdmin.role === 'LECTURER_ADMIN';

    if (!isAdmin) {
      return res.status(404).json({ error: 'Administrator not found' });
    }

    // Reactivate admin
    await User.update(id, { status: 'active' });

    // Log the action
    await auditActions.adminUpdate(req, id, `Reactivated administrator: ${existingAdmin.full_name}`);

    res.json({ message: 'Administrator reactivated successfully' });
  } catch (error) {
    console.error('Reactivate admin error:', error);
    res.status(500).json({ error: 'Failed to reactivate administrator' });
  }
};

/**
 * Delete administrator (SUPER_ADMIN only)
 */
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Get existing admin
    const existingAdmin = await User.findById(id);
    if (!existingAdmin) {
      return res.status(404).json({ error: 'Administrator not found' });
    }

    // Verify it's an admin
    const isAdmin = existingAdmin.role === 'admin' || 
                   existingAdmin.role === 'super_admin' ||
                   existingAdmin.role === 'SUPER_ADMIN' ||
                   existingAdmin.role === 'ACADEMIC_ADMIN' ||
                   existingAdmin.role === 'FINANCE_ADMIN' ||
                   existingAdmin.role === 'ADMISSIONS_ADMIN' ||
                   existingAdmin.role === 'LECTURER_ADMIN';

    if (!isAdmin) {
      return res.status(404).json({ error: 'Administrator not found' });
    }

    // Prevent deleting self
    if (parseInt(id) === req.user.id) {
      return res.status(403).json({ error: 'You cannot delete yourself' });
    }

    // Prevent deleting the last SUPER_ADMIN
    if (existingAdmin.role === 'SUPER_ADMIN' || existingAdmin.role === 'super_admin') {
      // Count SUPER_ADMINs
      const allAdmins = await User.findAll({ role: 'super_admin' });
      const superAdmins = allAdmins.filter(a => 
        (a.role === 'SUPER_ADMIN' || a.role === 'super_admin') && 
        a.id !== parseInt(id)
      );

      if (superAdmins.length === 0) {
        return res.status(403).json({ error: 'Cannot delete the last SUPER_ADMIN' });
      }
    }

    // Delete admin
    await User.delete(id);

    // Log the action
    await auditActions.adminDelete(req, id, `Deleted administrator: ${existingAdmin.full_name}`);

    res.json({ message: 'Administrator deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ error: 'Failed to delete administrator' });
  }
};

/**
 * Reset administrator password (SUPER_ADMIN only)
 */
const resetAdminPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get existing admin
    const existingAdmin = await User.findById(id);
    if (!existingAdmin) {
      return res.status(404).json({ error: 'Administrator not found' });
    }

    // Verify it's an admin
    const isAdmin = existingAdmin.role === 'admin' || 
                   existingAdmin.role === 'super_admin' ||
                   existingAdmin.role === 'SUPER_ADMIN' ||
                   existingAdmin.role === 'ACADEMIC_ADMIN' ||
                   existingAdmin.role === 'FINANCE_ADMIN' ||
                   existingAdmin.role === 'ADMISSIONS_ADMIN' ||
                   existingAdmin.role === 'LECTURER_ADMIN';

    if (!isAdmin) {
      return res.status(404).json({ error: 'Administrator not found' });
    }

    // Hash new password
    const hashedPassword = bcrypt.hashSync(new_password, 10);

    // Update password
    await User.update(id, { password: hashedPassword });

    // Log the action
    await auditActions.adminUpdate(req, id, `Reset password for administrator: ${existingAdmin.full_name}`);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset admin password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

/**
 * Get audit logs (SUPER_ADMIN only)
 */
const getAuditLogs = async (req, res) => {
  try {
    const { admin_id, action, target_type, start_date, end_date, limit = 50, offset = 0 } = req.query;

    const filters = {};
    if (admin_id) filters.admin_id = parseInt(admin_id);
    if (action) filters.action = action;
    if (target_type) filters.target_type = target_type;
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;
    filters.limit = parseInt(limit);
    filters.offset = parseInt(offset);

    const logs = await AuditLog.findAll(filters);
    res.json(logs);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

/**
 * Get recent audit logs for dashboard (SUPER_ADMIN only)
 */
const getRecentAuditLogs = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const logs = await AuditLog.getRecentLogs(parseInt(limit));
    res.json(logs);
  } catch (error) {
    console.error('Get recent audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch recent audit logs' });
  }
};

module.exports = {
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  suspendAdmin,
  reactivateAdmin,
  deleteAdmin,
  resetAdminPassword,
  getAuditLogs,
  getRecentAuditLogs
};
