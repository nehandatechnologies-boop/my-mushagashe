const User = require('../models/User');

// Get pending accounts for admin approval
const getPendingAccounts = async (req, res) => {
  try {
    const { role } = req.query;
    
    let filters = { status: 'pending' };
    if (role) {
      filters.role = role;
    }

    const pendingAccounts = await User.findAll(filters);
    
    res.json({
      count: pendingAccounts.length,
      accounts: pendingAccounts
    });
  } catch (error) {
    console.error('Get pending accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch pending accounts' });
  }
};

// Get all accounts with status filter
const getAllAccounts = async (req, res) => {
  try {
    const { status, role, search } = req.query;
    
    let filters = {};
    if (status) {
      filters.status = status;
    }
    if (role) {
      filters.role = role;
    }
    if (search) {
      filters.search = search;
    }

    const accounts = await User.findAll(filters);
    
    res.json({
      count: accounts.length,
      accounts: accounts
    });
  } catch (error) {
    console.error('Get all accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
};

// Approve an account
const approveAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Get the account to approve
    const account = await User.findById(id);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check if account is already approved
    if (account.status === 'active') {
      return res.status(400).json({ error: 'Account is already active' });
    }

    // Update account status to active
    const updatedAccount = await User.update(id, { status: 'active' });

    // Log audit trail
    await logAuditTrail(req.user.id, 'APPROVE_ACCOUNT', 'user', id, {
      previous_status: account.status,
      new_status: 'active',
      reason: reason || 'Account approved by administrator'
    });

    res.json({
      message: 'Account approved successfully',
      account: updatedAccount
    });
  } catch (error) {
    console.error('Approve account error:', error);
    res.status(500).json({ error: 'Failed to approve account' });
  }
};

// Reject an account
const rejectAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Get the account to reject
    const account = await User.findById(id);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check if account is already rejected
    if (account.status === 'rejected') {
      return res.status(400).json({ error: 'Account is already rejected' });
    }

    // Update account status to rejected
    const updatedAccount = await User.update(id, { status: 'rejected' });

    // Log audit trail
    await logAuditTrail(req.user.id, 'REJECT_ACCOUNT', 'user', id, {
      previous_status: account.status,
      new_status: 'rejected',
      reason: reason || 'Account rejected by administrator'
    });

    res.json({
      message: 'Account rejected successfully',
      account: updatedAccount
    });
  } catch (error) {
    console.error('Reject account error:', error);
    res.status(500).json({ error: 'Failed to reject account' });
  }
};

// Suspend an account
const suspendAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Get the account to suspend
    const account = await User.findById(id);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check if account is already suspended
    if (account.status === 'suspended') {
      return res.status(400).json({ error: 'Account is already suspended' });
    }

    // Update account status to suspended
    const updatedAccount = await User.update(id, { status: 'suspended' });

    // Log audit trail
    await logAuditTrail(req.user.id, 'SUSPEND_ACCOUNT', 'user', id, {
      previous_status: account.status,
      new_status: 'suspended',
      reason: reason || 'Account suspended by administrator'
    });

    res.json({
      message: 'Account suspended successfully',
      account: updatedAccount
    });
  } catch (error) {
    console.error('Suspend account error:', error);
    res.status(500).json({ error: 'Failed to suspend account' });
  }
};

// Reactivate a suspended account
const reactivateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Get the account to reactivate
    const account = await User.findById(id);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check if account is already active
    if (account.status === 'active') {
      return res.status(400).json({ error: 'Account is already active' });
    }

    // Update account status to active
    const updatedAccount = await User.update(id, { status: 'active' });

    // Log audit trail
    await logAuditTrail(req.user.id, 'REACTIVATE_ACCOUNT', 'user', id, {
      previous_status: account.status,
      new_status: 'active',
      reason: reason || 'Account reactivated by administrator'
    });

    res.json({
      message: 'Account reactivated successfully',
      account: updatedAccount
    });
  } catch (error) {
    console.error('Reactivate account error:', error);
    res.status(500).json({ error: 'Failed to reactivate account' });
  }
};

// Helper function to log audit trail
async function logAuditTrail(userId, action, entityType, entityId, details) {
  try {
    const supabase = require('../config/supabase');
    
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: action,
        entity_type: entityType,
        entity_id: entityId,
        details: JSON.stringify(details),
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log audit trail:', error);
    }
  } catch (error) {
    console.error('Audit trail logging error:', error);
  }
}

module.exports = {
  getPendingAccounts,
  getAllAccounts,
  approveAccount,
  rejectAccount,
  suspendAccount,
  reactivateAccount
};
