import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MapPin, Star, StarOff } from 'lucide-react';
import { addressService } from '../../services/addressService';
import type { Database } from '../../lib/database.types';

type Address = Database['public']['Tables']['addresses']['Row'];

interface CustomerAddressesProps {
  customerId: string;
  canEdit: boolean;
}

export function CustomerAddresses({ customerId, canEdit }: CustomerAddressesProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState({
    address_type: 'billing',
    address_line1: '',
    address_line2: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: 'US',
    is_primary: false,
    notes: '',
  });

  useEffect(() => {
    fetchAddresses();
  }, [customerId]);

  const fetchAddresses = async () => {
    try {
      const data = await addressService.getByCustomer(customerId);
      setAddresses(data);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAddress) {
        await addressService.update(editingAddress.id, formData);
      } else {
        await addressService.create({
          customer_id: customerId,
          ...formData,
        });
      }
      await fetchAddresses();
      closeModal();
    } catch (error: any) {
      alert('Error saving address: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      await addressService.delete(id);
      await fetchAddresses();
    } catch (error: any) {
      alert('Error deleting address: ' + error.message);
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      await addressService.setPrimary(id, customerId);
      await fetchAddresses();
    } catch (error: any) {
      alert('Error setting primary address: ' + error.message);
    }
  };

  const openModal = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setFormData({
        address_type: address.address_type,
        address_line1: address.address_line1,
        address_line2: address.address_line2 || '',
        city: address.city || '',
        state_province: address.state_province || '',
        postal_code: address.postal_code || '',
        country: address.country || 'US',
        is_primary: address.is_primary || false,
        notes: address.notes || '',
      });
    } else {
      setEditingAddress(null);
      setFormData({
        address_type: 'billing',
        address_line1: '',
        address_line2: '',
        city: '',
        state_province: '',
        postal_code: '',
        country: 'US',
        is_primary: false,
        notes: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAddress(null);
  };

  const getAddressTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      billing: 'blue',
      shipping: 'green',
      physical: 'purple',
      registered: 'orange',
    };
    return colors[type] || 'gray';
  };

  const formatAddress = (address: Address) => {
    const parts = [
      address.address_line1,
      address.address_line2,
      address.city,
      address.state_province,
      address.postal_code,
      address.country,
    ].filter(Boolean);
    return parts.join(', ');
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading addresses...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Addresses</h3>
        {canEdit && (
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Address
          </button>
        )}
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No addresses added yet</p>
          {canEdit && (
            <button
              onClick={() => openModal()}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Add your first address
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded bg-${getAddressTypeColor(address.address_type)}-100 text-${getAddressTypeColor(address.address_type)}-700 capitalize`}>
                    {address.address_type}
                  </span>
                  {address.is_primary && (
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    {!address.is_primary && (
                      <button
                        onClick={() => handleSetPrimary(address.id)}
                        className="p-1 text-gray-400 hover:text-yellow-500"
                        title="Set as primary"
                      >
                        <StarOff className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openModal(address)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-900">{address.address_line1}</p>
                {address.address_line2 && (
                  <p className="text-sm text-gray-900">{address.address_line2}</p>
                )}
                <p className="text-sm text-gray-600">
                  {[address.city, address.state_province, address.postal_code]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                <p className="text-sm text-gray-600">{address.country}</p>
              </div>

              {address.notes && (
                <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
                  {address.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingAddress ? 'Edit Address' : 'Add Address'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Type *
                  </label>
                  <select
                    value={formData.address_type}
                    onChange={(e) => setFormData({ ...formData, address_type: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="billing">Billing</option>
                    <option value="shipping">Shipping</option>
                    <option value="physical">Physical Location</option>
                    <option value="registered">Registered Office</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    value={formData.address_line1}
                    onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Street address"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={formData.address_line2}
                    onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Apartment, suite, unit, building, floor, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State/Province
                  </label>
                  <input
                    type="text"
                    value={formData.state_province}
                    onChange={(e) => setFormData({ ...formData, state_province: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_primary}
                      onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Primary Address</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingAddress ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
