import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Award, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface DownstreamVendor {
  id: string;
  vendor_name: string;
  vendor_type: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country: string;
  r2_certified: boolean;
  r2_cert_number?: string;
  r2_expiration_date?: string;
  e_stewards_certified: boolean;
  e_stewards_cert_number?: string;
  e_stewards_expiration_date?: string;
  iso_14001_certified: boolean;
  iso_14001_cert_number?: string;
  iso_14001_expiration_date?: string;
  epa_id?: string;
  accepted_materials: string[];
  services_offered: string[];
  notes?: string;
  is_active: boolean;
}

export function DownstreamVendors() {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [vendors, setVendors] = useState<DownstreamVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<DownstreamVendor | null>(null);

  const [formData, setFormData] = useState({
    vendor_name: '',
    vendor_type: 'recycler',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'USA',
    r2_certified: false,
    r2_cert_number: '',
    r2_expiration_date: '',
    e_stewards_certified: false,
    e_stewards_cert_number: '',
    e_stewards_expiration_date: '',
    iso_14001_certified: false,
    iso_14001_cert_number: '',
    iso_14001_expiration_date: '',
    epa_id: '',
    accepted_materials: [] as string[],
    services_offered: [] as string[],
    notes: '',
    is_active: true
  });

  const materialOptions = [
    'Aluminum', 'Copper', 'Steel', 'Plastic', 'Glass', 'Circuit Boards',
    'Hard Drives', 'Batteries', 'Monitors/CRTs', 'Cables', 'Other Metals'
  ];

  const serviceOptions = [
    'Recycling', 'Physical Destruction', 'Smelting', 'Refining',
    'Data Destruction', 'Certificate Issuance', 'Logistics'
  ];

  useEffect(() => {
    if (selectedCompany?.id) {
      fetchVendors();
    }
  }, [selectedCompany?.id]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('downstream_vendors')
        .select('*')
        .eq('company_id', selectedCompany?.id)
        .order('vendor_name');

      if (error) throw error;
      setVendors(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingVendor) {
        const { error } = await supabase
          .from('downstream_vendors')
          .update(formData)
          .eq('id', editingVendor.id);

        if (error) throw error;
        showToast('Vendor updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('downstream_vendors')
          .insert({
            ...formData,
            company_id: selectedCompany?.id
          });

        if (error) throw error;
        showToast('Vendor created successfully', 'success');
      }

      setShowModal(false);
      resetForm();
      fetchVendors();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleEdit = (vendor: DownstreamVendor) => {
    setEditingVendor(vendor);
    setFormData({
      vendor_name: vendor.vendor_name,
      vendor_type: vendor.vendor_type,
      contact_name: vendor.contact_name || '',
      contact_email: vendor.contact_email || '',
      contact_phone: vendor.contact_phone || '',
      address: vendor.address || '',
      city: vendor.city || '',
      state: vendor.state || '',
      zip: vendor.zip || '',
      country: vendor.country,
      r2_certified: vendor.r2_certified,
      r2_cert_number: vendor.r2_cert_number || '',
      r2_expiration_date: vendor.r2_expiration_date || '',
      e_stewards_certified: vendor.e_stewards_certified,
      e_stewards_cert_number: vendor.e_stewards_cert_number || '',
      e_stewards_expiration_date: vendor.e_stewards_expiration_date || '',
      iso_14001_certified: vendor.iso_14001_certified,
      iso_14001_cert_number: vendor.iso_14001_cert_number || '',
      iso_14001_expiration_date: vendor.iso_14001_expiration_date || '',
      epa_id: vendor.epa_id || '',
      accepted_materials: vendor.accepted_materials || [],
      services_offered: vendor.services_offered || [],
      notes: vendor.notes || '',
      is_active: vendor.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;

    try {
      const { error } = await supabase
        .from('downstream_vendors')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Vendor deleted successfully', 'success');
      fetchVendors();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      vendor_name: '',
      vendor_type: 'recycler',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      country: 'USA',
      r2_certified: false,
      r2_cert_number: '',
      r2_expiration_date: '',
      e_stewards_certified: false,
      e_stewards_cert_number: '',
      e_stewards_expiration_date: '',
      iso_14001_certified: false,
      iso_14001_cert_number: '',
      iso_14001_expiration_date: '',
      epa_id: '',
      accepted_materials: [],
      services_offered: [],
      notes: '',
      is_active: true
    });
    setEditingVendor(null);
  };

  const toggleMaterial = (material: string) => {
    setFormData(prev => ({
      ...prev,
      accepted_materials: prev.accepted_materials.includes(material)
        ? prev.accepted_materials.filter(m => m !== material)
        : [...prev.accepted_materials, material]
    }));
  };

  const toggleService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services_offered: prev.services_offered.includes(service)
        ? prev.services_offered.filter(s => s !== service)
        : [...prev.services_offered, service]
    }));
  };

  const isCertificationExpiring = (date?: string) => {
    if (!date) return false;
    const expDate = new Date(date);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 90 && daysUntilExpiry >= 0;
  };

  const isCertificationExpired = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contact_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || vendor.vendor_type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading vendors...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Downstream Vendors</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage recycling facilities and downstream processors
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Vendor
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="recycler">Recycler</option>
              <option value="smelter">Smelter</option>
              <option value="refiner">Refiner</option>
              <option value="destruction_facility">Destruction Facility</option>
              <option value="donation_partner">Donation Partner</option>
              <option value="reseller">Reseller</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
          {filteredVendors.map(vendor => (
            <div key={vendor.id} className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{vendor.vendor_name}</h3>
                  <p className="text-sm text-gray-600 capitalize">{vendor.vendor_type.replace('_', ' ')}</p>
                  {!vendor.is_active && (
                    <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full mt-1">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(vendor)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(vendor.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {vendor.contact_name && (
                <div className="text-sm text-gray-600 mb-2">
                  Contact: {vendor.contact_name}
                </div>
              )}

              {(vendor.city || vendor.state) && (
                <div className="text-sm text-gray-600 mb-4">
                  {vendor.city}, {vendor.state} {vendor.zip}
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                {vendor.r2_certified && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                    isCertificationExpired(vendor.r2_expiration_date)
                      ? 'bg-red-100 text-red-700'
                      : isCertificationExpiring(vendor.r2_expiration_date)
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    <Award className="w-3 h-3" />
                    R2
                    {isCertificationExpiring(vendor.r2_expiration_date) && !isCertificationExpired(vendor.r2_expiration_date) && (
                      <AlertCircle className="w-3 h-3" />
                    )}
                  </div>
                )}

                {vendor.e_stewards_certified && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                    isCertificationExpired(vendor.e_stewards_expiration_date)
                      ? 'bg-red-100 text-red-700'
                      : isCertificationExpiring(vendor.e_stewards_expiration_date)
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    <Award className="w-3 h-3" />
                    e-Stewards
                    {isCertificationExpiring(vendor.e_stewards_expiration_date) && !isCertificationExpired(vendor.e_stewards_expiration_date) && (
                      <AlertCircle className="w-3 h-3" />
                    )}
                  </div>
                )}

                {vendor.iso_14001_certified && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    <Award className="w-3 h-3" />
                    ISO 14001
                  </div>
                )}
              </div>

              {vendor.accepted_materials && vendor.accepted_materials.length > 0 && (
                <div className="text-xs text-gray-600 mb-2">
                  <span className="font-medium">Materials:</span> {vendor.accepted_materials.join(', ')}
                </div>
              )}

              {vendor.services_offered && vendor.services_offered.length > 0 && (
                <div className="text-xs text-gray-600">
                  <span className="font-medium">Services:</span> {vendor.services_offered.join(', ')}
                </div>
              )}
            </div>
          ))}

          {filteredVendors.length === 0 && (
            <div className="col-span-2 text-center py-12 text-gray-500">
              <p>No downstream vendors found</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingVendor ? 'Edit Vendor' : 'Add Downstream Vendor'}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.vendor_name}
                      onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor Type *
                    </label>
                    <select
                      value={formData.vendor_type}
                      onChange={(e) => setFormData({ ...formData, vendor_type: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="recycler">Recycler</option>
                      <option value="smelter">Smelter</option>
                      <option value="refiner">Refiner</option>
                      <option value="destruction_facility">Destruction Facility</option>
                      <option value="donation_partner">Donation Partner</option>
                      <option value="reseller">Reseller</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Certifications
                  </label>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.r2_certified}
                          onChange={(e) => setFormData({ ...formData, r2_certified: e.target.checked })}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">R2 Certified</span>
                      </label>
                      {formData.r2_certified && (
                        <>
                          <input
                            type="text"
                            placeholder="Cert Number"
                            value={formData.r2_cert_number}
                            onChange={(e) => setFormData({ ...formData, r2_cert_number: e.target.value })}
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <input
                            type="date"
                            value={formData.r2_expiration_date}
                            onChange={(e) => setFormData({ ...formData, r2_expiration_date: e.target.value })}
                            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.e_stewards_certified}
                          onChange={(e) => setFormData({ ...formData, e_stewards_certified: e.target.checked })}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">e-Stewards</span>
                      </label>
                      {formData.e_stewards_certified && (
                        <>
                          <input
                            type="text"
                            placeholder="Cert Number"
                            value={formData.e_stewards_cert_number}
                            onChange={(e) => setFormData({ ...formData, e_stewards_cert_number: e.target.value })}
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <input
                            type="date"
                            value={formData.e_stewards_expiration_date}
                            onChange={(e) => setFormData({ ...formData, e_stewards_expiration_date: e.target.value })}
                            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.iso_14001_certified}
                          onChange={(e) => setFormData({ ...formData, iso_14001_certified: e.target.checked })}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">ISO 14001</span>
                      </label>
                      {formData.iso_14001_certified && (
                        <>
                          <input
                            type="text"
                            placeholder="Cert Number"
                            value={formData.iso_14001_cert_number}
                            onChange={(e) => setFormData({ ...formData, iso_14001_cert_number: e.target.value })}
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <input
                            type="date"
                            value={formData.iso_14001_expiration_date}
                            onChange={(e) => setFormData({ ...formData, iso_14001_expiration_date: e.target.value })}
                            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Accepted Materials
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {materialOptions.map(material => (
                      <label key={material} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.accepted_materials.includes(material)}
                          onChange={() => toggleMaterial(material)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">{material}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Services Offered
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {serviceOptions.map(service => (
                      <label key={service} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.services_offered.includes(service)}
                          onChange={() => toggleService(service)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">{service}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    Active Vendor
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingVendor ? 'Update Vendor' : 'Create Vendor'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
