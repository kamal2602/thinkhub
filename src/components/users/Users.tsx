import { useState, useEffect } from 'react';
import { Plus, Users as UsersIcon, UserPlus, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { UserRole } from '../../lib/database.types';

interface UserAccess {
  id: string;
  user_id: string;
  company_id: string;
  role: UserRole;
  created_at: string;
  profiles: {
    email: string;
    full_name: string;
  };
}

interface Location {
  id: string;
  name: string;
}

interface LocationAccess {
  location_id: string;
  can_view: boolean;
  can_edit: boolean;
}

export function Users() {
  const { selectedCompany } = useCompany();
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAccess | null>(null);
  const [userLocationAccess, setUserLocationAccess] = useState<LocationAccess[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    role: 'viewer' as UserRole,
  });
  const [error, setError] = useState('');

  const isAdmin = selectedCompany?.role === 'admin';

  useEffect(() => {
    if (selectedCompany && isAdmin) {
      fetchData();
    }
  }, [selectedCompany, isAdmin]);

  const fetchData = async () => {
    try {
      const [usersRes, locationsRes] = await Promise.all([
        supabase
          .from('user_company_access')
          .select(`
            *,
            profiles(email, full_name)
          `)
          .eq('company_id', selectedCompany?.id)
          .order('created_at'),
        supabase
          .from('locations')
          .select('id, name')
          .eq('company_id', selectedCompany?.id)
          .order('name'),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (locationsRes.error) throw locationsRes.error;

      setUsers(usersRes.data || []);
      setLocations(locationsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.email)
        .maybeSingle();

      if (!existingUser) {
        setError('User not found. Please ensure the user has created an account.');
        return;
      }

      const { data: existingAccess } = await supabase
        .from('user_company_access')
        .select('id')
        .eq('user_id', existingUser.id)
        .eq('company_id', selectedCompany?.id)
        .maybeSingle();

      if (existingAccess) {
        setError('User already has access to this company.');
        return;
      }

      const { error } = await supabase
        .from('user_company_access')
        .insert({
          user_id: existingUser.id,
          company_id: selectedCompany?.id,
          role: formData.role,
        });

      if (error) throw error;

      await fetchData();
      setShowModal(false);
      setFormData({ email: '', role: 'viewer' });
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_company_access')
        .update({ role: newRole })
        .eq('user_id', userId)
        .eq('company_id', selectedCompany?.id);

      if (error) throw error;
      await fetchData();
    } catch (error: any) {
      alert('Error updating role: ' + error.message);
    }
  };

  const handleRemoveAccess = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user\'s access?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_company_access')
        .delete()
        .eq('user_id', userId)
        .eq('company_id', selectedCompany?.id);

      if (error) throw error;
      await fetchData();
    } catch (error: any) {
      alert('Error removing access: ' + error.message);
    }
  };

  const openLocationModal = async (user: UserAccess) => {
    setSelectedUser(user);
    try {
      const { data, error } = await supabase
        .from('user_location_access')
        .select('location_id, can_view, can_edit')
        .eq('user_id', user.user_id);

      if (error) throw error;

      const accessMap: LocationAccess[] = locations.map(loc => {
        const access = data?.find(a => a.location_id === loc.id);
        return {
          location_id: loc.id,
          can_view: access?.can_view || false,
          can_edit: access?.can_edit || false,
        };
      });

      setUserLocationAccess(accessMap);
      setShowLocationModal(true);
    } catch (error) {
      console.error('Error fetching location access:', error);
    }
  };

  const handleLocationAccessChange = (locationId: string, field: 'can_view' | 'can_edit', value: boolean) => {
    setUserLocationAccess(prev =>
      prev.map(access =>
        access.location_id === locationId
          ? { ...access, [field]: value }
          : access
      )
    );
  };

  const saveLocationAccess = async () => {
    if (!selectedUser) return;

    try {
      await supabase
        .from('user_location_access')
        .delete()
        .eq('user_id', selectedUser.user_id);

      const accessesToInsert = userLocationAccess
        .filter(access => access.can_view || access.can_edit)
        .map(access => ({
          user_id: selectedUser.user_id,
          location_id: access.location_id,
          can_view: access.can_view,
          can_edit: access.can_edit,
        }));

      if (accessesToInsert.length > 0) {
        const { error } = await supabase
          .from('user_location_access')
          .insert(accessesToInsert);

        if (error) throw error;
      }

      setShowLocationModal(false);
      setSelectedUser(null);
    } catch (error: any) {
      alert('Error saving location access: ' + error.message);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'manager': return 'bg-blue-100 text-blue-700';
      case 'staff': return 'bg-green-100 text-green-700';
      case 'viewer': return 'bg-gray-100 text-gray-700';
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">You don't have permission to manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage user access for {selectedCompany.name}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Add User
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No users yet</h3>
          <p className="text-gray-600 mb-6">Start by adding users to your company</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Add User
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.profiles.full_name || 'Unnamed User'}
                        </div>
                        <div className="text-sm text-gray-500">{user.profiles.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.user_id, e.target.value as UserRole)}
                        className={`text-sm px-3 py-1 rounded-full font-medium border-0 cursor-pointer ${getRoleBadgeColor(user.role)}`}
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="staff">Staff</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openLocationModal(user)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition"
                        >
                          <Shield className="w-4 h-4" />
                          Locations
                        </button>
                        <button
                          onClick={() => handleRemoveAccess(user.user_id)}
                          className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Add User</h2>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="user@example.com"
                />
                <p className="mt-1 text-xs text-gray-500">
                  User must have an existing account
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="viewer">Viewer - Read only access</option>
                  <option value="staff">Staff - Can edit inventory</option>
                  <option value="manager">Manager - Can manage locations</option>
                  <option value="admin">Admin - Full access</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({ email: '', role: 'viewer' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLocationModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Location Access - {selectedUser.profiles.full_name || selectedUser.profiles.email}
            </h2>

            <div className="space-y-3 mb-6">
              {locations.map((location) => {
                const access = userLocationAccess.find(a => a.location_id === location.id);
                return (
                  <div key={location.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{location.name}</span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={access?.can_view || false}
                          onChange={(e) => handleLocationAccessChange(location.id, 'can_view', e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">View</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={access?.can_edit || false}
                          onChange={(e) => handleLocationAccessChange(location.id, 'can_edit', e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Edit</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowLocationModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveLocationAccess}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
