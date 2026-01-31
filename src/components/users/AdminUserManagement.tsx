import { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Building2, Key } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../lib/database.types';

interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  is_super_admin: boolean;
}

interface Company {
  id: string;
  name: string;
}

interface UserCompanyAccess {
  company_id: string;
  role: UserRole;
  companies: {
    name: string;
  };
}

export function AdminUserManagement() {
  const { isSuperAdmin, userRole, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userAccess, setUserAccess] = useState<UserCompanyAccess[]>([]);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAccess, setNewAccess] = useState({
    company_id: '',
    role: 'viewer' as UserRole,
  });
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'technician' as 'admin' | 'manager' | 'technician' | 'sales',
    companyId: '',
  });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    if (isSuperAdmin || userRole === 'admin') {
      fetchData();
    }
  }, [isSuperAdmin, userRole]);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const [usersRes, companiesRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users/list-users`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }),
        supabase
          .from('companies')
          .select('id, name')
          .order('name'),
      ]);

      if (!usersRes.ok) {
        throw new Error('Failed to fetch users');
      }

      const { users: authUsers } = await usersRes.json();

      if (companiesRes.error) throw companiesRes.error;

      const userIds = authUsers.map((u: any) => u.id);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, is_super_admin')
        .in('id', userIds);

      const usersWithProfiles = authUsers.map((u: any) => {
        const profile = profiles?.find(p => p.id === u.id);
        return {
          id: u.id,
          email: u.email || '',
          full_name: u.user_metadata?.full_name || 'Unknown',
          created_at: u.created_at,
          is_super_admin: profile?.is_super_admin || false,
        };
      });

      setUsers(usersWithProfiles);
      setCompanies(companiesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAccess = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_company_access')
        .select('company_id, role, companies(name)')
        .eq('user_id', userId);

      if (error) throw error;
      setUserAccess(data || []);
    } catch (error) {
      console.error('Error fetching user access:', error);
    }
  };

  const openAccessModal = async (user: User) => {
    setSelectedUser(user);
    await fetchUserAccess(user.id);
    setShowAccessModal(true);
  };

  const addCompanyAccess = async () => {
    if (!selectedUser || !newAccess.company_id) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users/assign-company`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          companyId: newAccess.company_id,
          role: newAccess.role,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign company');
      }

      await fetchUserAccess(selectedUser.id);
      setNewAccess({ company_id: '', role: 'viewer' });
    } catch (error: any) {
      alert('Error adding access: ' + error.message);
    }
  };

  const removeCompanyAccess = async (companyId: string) => {
    if (!selectedUser) return;
    if (!confirm('Remove this company access?')) return;

    try {
      const { error } = await supabase
        .from('user_company_access')
        .delete()
        .eq('user_id', selectedUser.id)
        .eq('company_id', companyId);

      if (error) throw error;
      await fetchUserAccess(selectedUser.id);
    } catch (error: any) {
      alert('Error removing access: ' + error.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users/create-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: createForm.email,
          password: createForm.password,
          full_name: createForm.fullName,
          role: createForm.role,
          companyId: createForm.companyId || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      alert(`User created successfully!\n\nEmail: ${createForm.email}\nPassword: ${createForm.password}\n\nPlease share these credentials with the user.`);

      await fetchData();
      setShowCreateModal(false);
      setCreateForm({
        email: '',
        password: '',
        fullName: '',
        role: 'technician',
        companyId: '',
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      setCreateError(error.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const toggleSuperAdmin = async (targetUser: User) => {
    if (user?.id === targetUser.id) {
      alert('You cannot revoke your own super admin privileges.');
      return;
    }

    if (!confirm(`${targetUser.is_super_admin ? 'Remove' : 'Grant'} super admin privileges for ${targetUser.email}?`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users/toggle-super-admin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: targetUser.id,
          isSuperAdmin: !targetUser.is_super_admin,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update super admin status');
      }

      fetchData();
    } catch (error: any) {
      alert('Error updating super admin status: ' + error.message);
    }
  };

  const openPasswordModal = (targetUser: User) => {
    setPasswordResetUser(targetUser);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetUser || !newPassword) return;

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setResettingPassword(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: passwordResetUser.id,
          newPassword: newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reset password');
      }

      alert(`Password reset successfully for ${passwordResetUser.email}!\n\nNew Password: ${newPassword}\n\nPlease share this with the user.`);
      setShowPasswordModal(false);
      setPasswordResetUser(null);
      setNewPassword('');
    } catch (error: any) {
      alert('Error resetting password: ' + error.message);
    } finally {
      setResettingPassword(false);
    }
  };

  if (!isSuperAdmin && userRole !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Access Denied: Admin privileges required
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            Super Admin: User Management
          </h1>
          <p className="text-gray-600 mt-1">Create and manage all users with role assignment</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Create User
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Super Admin</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((listUser) => (
              <tr key={listUser.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{listUser.email}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{listUser.full_name}</td>
                <td className="px-6 py-4 text-sm">
                  {listUser.is_super_admin ? (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      Super Admin
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                      Regular User
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {new Date(listUser.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-3">
                    <button
                      onClick={() => openAccessModal(listUser)}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Building2 className="w-4 h-4" />
                      Manage Access
                    </button>
                    <button
                      onClick={() => openPasswordModal(listUser)}
                      className="text-purple-600 hover:text-purple-800 flex items-center gap-1"
                    >
                      <Key className="w-4 h-4" />
                      Reset Password
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => toggleSuperAdmin(listUser)}
                        disabled={listUser.id === user?.id}
                        className={`flex items-center gap-1 ${
                          listUser.id === user?.id
                            ? 'text-gray-400 cursor-not-allowed'
                            : listUser.is_super_admin
                            ? 'text-red-600 hover:text-red-800'
                            : 'text-green-600 hover:text-green-800'
                        }`}
                        title={listUser.id === user?.id ? 'Cannot modify your own super admin status' : ''}
                      >
                        <Shield className="w-4 h-4" />
                        {listUser.is_super_admin ? 'Revoke' : 'Grant'} Admin
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAccessModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Manage Company Access: {selectedUser.email}
              </h2>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Current Access</h3>
                {userAccess.length === 0 ? (
                  <p className="text-gray-500 text-sm">No company access assigned</p>
                ) : (
                  <div className="space-y-2">
                    {userAccess.map((access) => (
                      <div
                        key={access.company_id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{access.companies.name}</p>
                          <p className="text-sm text-gray-600">Role: {access.role}</p>
                        </div>
                        <button
                          onClick={() => removeCompanyAccess(access.company_id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Add Company Access</h3>
                <div className="flex gap-3">
                  <select
                    value={newAccess.company_id}
                    onChange={(e) => setNewAccess({ ...newAccess, company_id: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Company</option>
                    {companies
                      .filter(c => !userAccess.some(a => a.company_id === c.id))
                      .map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                  </select>
                  <select
                    value={newAccess.role}
                    onChange={(e) => setNewAccess({ ...newAccess, role: e.target.value as UserRole })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={addCompanyAccess}
                    disabled={!newAccess.company_id}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowAccessModal(false);
                    setSelectedUser(null);
                    setUserAccess([]);
                    setNewAccess({ company_id: '', role: 'viewer' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New User</h2>

            {createError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="john@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Minimum 6 characters"
                />
                <p className="mt-1 text-xs text-gray-500">
                  You'll receive the credentials to share with the user
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="technician">Technician - Processing only</option>
                  <option value="sales">Sales - Inventory & Sales</option>
                  <option value="manager">Manager - All except User Mgmt</option>
                  <option value="admin">Admin - Full access</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Company (Optional)
                </label>
                {companies.length === 0 ? (
                  <p className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                    No companies available. Create a company first or assign later.
                  </p>
                ) : (
                  <select
                    value={createForm.companyId}
                    onChange={(e) => setCreateForm({ ...createForm, companyId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No company (assign later)</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({
                      email: '',
                      password: '',
                      fullName: '',
                      role: 'technician',
                      companyId: '',
                    });
                    setCreateError('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && passwordResetUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Key className="w-6 h-6 text-purple-600" />
              Reset Password
            </h2>

            <p className="text-gray-600 mb-4">
              Reset password for: <strong>{passwordResetUser.email}</strong>
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter new password (min 6 characters)"
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500">
                  The password will be shown in a popup after reset
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordResetUser(null);
                    setNewPassword('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  disabled={resettingPassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword || newPassword.length < 6}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resettingPassword ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
