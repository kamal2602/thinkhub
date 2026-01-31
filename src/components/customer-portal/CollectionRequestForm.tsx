import React, { useState } from 'react';
import { Plus, Upload, Calendar, MapPin, User, Phone, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCustomerPortalAuth } from '../../contexts/CustomerPortalAuthContext';

interface CollectionRequestFormProps {
  onSuccess: () => void;
}

export function CollectionRequestForm({ onSuccess }: CollectionRequestFormProps) {
  const { portalUser } = useCustomerPortalAuth();
  const [formData, setFormData] = useState({
    pickup_location_address: '',
    pickup_location_city: '',
    pickup_location_state: '',
    pickup_location_zip: '',
    pickup_contact_name: portalUser?.full_name || '',
    pickup_contact_phone: portalUser?.phone || '',
    pickup_contact_email: portalUser?.email || '',
    requested_pickup_date: '',
    estimated_quantity: '',
    estimated_weight_kg: '',
    asset_types: [] as string[],
    special_instructions: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const assetTypeOptions = [
    'Desktop Computers',
    'Laptops',
    'Servers',
    'Monitors',
    'Printers',
    'Network Equipment',
    'Mobile Devices',
    'Storage Devices',
    'Other IT Equipment'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { data: requestNumber } = await supabase.rpc('generate_collection_request_number', {
        p_company_id: portalUser?.company_id
      });

      const { error: insertError } = await supabase
        .from('collection_requests')
        .insert({
          company_id: portalUser?.company_id,
          customer_id: portalUser?.customer_id,
          request_number: requestNumber,
          requested_by_portal_user_id: portalUser?.id,
          requested_by_name: portalUser?.full_name,
          requested_by_email: portalUser?.email,
          requested_by_phone: portalUser?.phone,
          ...formData,
          estimated_quantity: formData.estimated_quantity ? parseInt(formData.estimated_quantity) : null,
          estimated_weight_kg: formData.estimated_weight_kg ? parseFloat(formData.estimated_weight_kg) : null,
          status: 'pending_review'
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setFormData({
        pickup_location_address: '',
        pickup_location_city: '',
        pickup_location_state: '',
        pickup_location_zip: '',
        pickup_contact_name: portalUser?.full_name || '',
        pickup_contact_phone: portalUser?.phone || '',
        pickup_contact_email: portalUser?.email || '',
        requested_pickup_date: '',
        estimated_quantity: '',
        estimated_weight_kg: '',
        asset_types: [],
        special_instructions: ''
      });

      setTimeout(() => {
        setSuccess(false);
        onSuccess();
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Failed to submit collection request');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAssetType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      asset_types: prev.asset_types.includes(type)
        ? prev.asset_types.filter(t => t !== type)
        : [...prev.asset_types, type]
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Request Asset Collection</h2>
        <p className="text-sm text-gray-600 mt-1">
          Submit a request for us to collect your IT assets
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            Collection request submitted successfully! We'll review and contact you shortly.
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Pickup Location
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address *
              </label>
              <input
                type="text"
                required
                value={formData.pickup_location_address}
                onChange={(e) => setFormData({ ...formData, pickup_location_address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="123 Business St"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={formData.pickup_location_city}
                  onChange={(e) => setFormData({ ...formData, pickup_location_city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State *
                </label>
                <input
                  type="text"
                  required
                  value={formData.pickup_location_state}
                  onChange={(e) => setFormData({ ...formData, pickup_location_state: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="CA"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.pickup_location_zip}
                  onChange={(e) => setFormData({ ...formData, pickup_location_zip: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requested Pickup Date
                </label>
                <input
                  type="date"
                  value={formData.requested_pickup_date}
                  onChange={(e) => setFormData({ ...formData, requested_pickup_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Pickup Contact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name *
              </label>
              <input
                type="text"
                required
                value={formData.pickup_contact_name}
                onChange={(e) => setFormData({ ...formData, pickup_contact_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone *
              </label>
              <input
                type="tel"
                required
                value={formData.pickup_contact_phone}
                onChange={(e) => setFormData({ ...formData, pickup_contact_phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={formData.pickup_contact_email}
                onChange={(e) => setFormData({ ...formData, pickup_contact_email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Information</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Quantity
              </label>
              <input
                type="number"
                value={formData.estimated_quantity}
                onChange={(e) => setFormData({ ...formData, estimated_quantity: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Number of devices"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Weight (kg)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.estimated_weight_kg}
                onChange={(e) => setFormData({ ...formData, estimated_weight_kg: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asset Types
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {assetTypeOptions.map(type => (
                <label key={type} className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.asset_types.includes(type)}
                    onChange={() => toggleAssetType(type)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{type}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Special Instructions
          </label>
          <textarea
            value={formData.special_instructions}
            onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Any special requirements, access instructions, or additional information..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setFormData({
              pickup_location_address: '',
              pickup_location_city: '',
              pickup_location_state: '',
              pickup_location_zip: '',
              pickup_contact_name: portalUser?.full_name || '',
              pickup_contact_phone: portalUser?.phone || '',
              pickup_contact_email: portalUser?.email || '',
              requested_pickup_date: '',
              estimated_quantity: '',
              estimated_weight_kg: '',
              asset_types: [],
              special_instructions: ''
            })}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
