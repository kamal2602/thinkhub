import React, { useState, useEffect } from 'react';
import { Award, Plus, Edit2, Trash2, Calendar, AlertTriangle, CheckCircle, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface Certification {
  id: string;
  certification_type: string;
  certification_number: string;
  issued_date: string;
  expiration_date: string;
  issuing_organization: string;
  audit_date?: string;
  auditor_name?: string;
  status: string;
  certificate_file_path?: string;
  notes?: string;
}

export function CompanyCertifications() {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Certification | null>(null);

  const [formData, setFormData] = useState({
    certification_type: 'R2v3',
    certification_number: '',
    issued_date: '',
    expiration_date: '',
    issuing_organization: '',
    audit_date: '',
    auditor_name: '',
    status: 'active',
    notes: ''
  });

  useEffect(() => {
    if (selectedCompany?.id) {
      fetchCertifications();
    }
  }, [selectedCompany?.id]);

  const fetchCertifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_certifications')
        .select('*')
        .eq('company_id', selectedCompany?.id)
        .order('expiration_date');

      if (error) throw error;
      setCertifications(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editing) {
        const { error } = await supabase
          .from('company_certifications')
          .update(formData)
          .eq('id', editing.id);

        if (error) throw error;
        showToast('Certification updated', 'success');
      } else {
        const { error } = await supabase
          .from('company_certifications')
          .insert({
            ...formData,
            company_id: selectedCompany?.id,
            created_by: user?.id
          });

        if (error) throw error;
        showToast('Certification added', 'success');
      }

      setShowModal(false);
      resetForm();
      fetchCertifications();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this certification?')) return;

    try {
      const { error } = await supabase
        .from('company_certifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Certification deleted', 'success');
      fetchCertifications();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      certification_type: 'R2v3',
      certification_number: '',
      issued_date: '',
      expiration_date: '',
      issuing_organization: '',
      audit_date: '',
      auditor_name: '',
      status: 'active',
      notes: ''
    });
    setEditing(null);
  };

  const getDaysUntilExpiry = (date: string) => {
    const expDate = new Date(date);
    const today = new Date();
    return Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (cert: Certification) => {
    const daysUntilExpiry = getDaysUntilExpiry(cert.expiration_date);

    if (cert.status === 'expired' || daysUntilExpiry < 0) {
      return 'bg-red-100 text-red-700 border-red-200';
    } else if (daysUntilExpiry <= 90) {
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    } else {
      return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const getStatusIcon = (cert: Certification) => {
    const daysUntilExpiry = getDaysUntilExpiry(cert.expiration_date);

    if (cert.status === 'expired' || daysUntilExpiry < 0) {
      return <AlertTriangle className="w-5 h-5" />;
    } else if (daysUntilExpiry <= 90) {
      return <AlertTriangle className="w-5 h-5" />;
    } else {
      return <CheckCircle className="w-5 h-5" />;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Company Certifications</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage R2, e-Stewards, ISO and other compliance certifications
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
          Add Certification
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {certifications.map(cert => (
          <div key={cert.id} className={`border-2 rounded-lg p-6 ${getStatusColor(cert)}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {getStatusIcon(cert)}
                <div>
                  <h3 className="font-semibold text-lg">{cert.certification_type}</h3>
                  <p className="text-sm opacity-75">{cert.certification_number}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(cert);
                    setFormData({
                      certification_type: cert.certification_type,
                      certification_number: cert.certification_number,
                      issued_date: cert.issued_date,
                      expiration_date: cert.expiration_date,
                      issuing_organization: cert.issuing_organization,
                      audit_date: cert.audit_date || '',
                      auditor_name: cert.auditor_name || '',
                      status: cert.status,
                      notes: cert.notes || ''
                    });
                    setShowModal(true);
                  }}
                  className="p-1 hover:opacity-70"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(cert.id)}
                  className="p-1 hover:opacity-70"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Expires: {new Date(cert.expiration_date).toLocaleDateString()}</span>
              </div>

              {getDaysUntilExpiry(cert.expiration_date) >= 0 && (
                <div className="font-medium">
                  {getDaysUntilExpiry(cert.expiration_date)} days remaining
                </div>
              )}

              <div className="text-xs opacity-75 mt-3">
                Issued by: {cert.issuing_organization}
              </div>
            </div>
          </div>
        ))}

        {certifications.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-500">
            <Award className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p>No certifications added yet</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                {editing ? 'Edit Certification' : 'Add Certification'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Certification Type *
                    </label>
                    <select
                      value={formData.certification_type}
                      onChange={(e) => setFormData({ ...formData, certification_type: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="R2v3">R2v3</option>
                      <option value="e-Stewards">e-Stewards</option>
                      <option value="ISO-14001">ISO 14001</option>
                      <option value="ISO-9001">ISO 9001</option>
                      <option value="OHSAS-18001">OHSAS 18001</option>
                      <option value="NAID-AAA">NAID AAA</option>
                      <option value="RIOS">RIOS</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Certificate Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.certification_number}
                      onChange={(e) => setFormData({ ...formData, certification_number: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issuing Organization *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.issuing_organization}
                    onChange={(e) => setFormData({ ...formData, issuing_organization: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Issued Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.issued_date}
                      onChange={(e) => setFormData({ ...formData, issued_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiration Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.expiration_date}
                      onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Audit Date
                    </label>
                    <input
                      type="date"
                      value={formData.audit_date}
                      onChange={(e) => setFormData({ ...formData, audit_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auditor Name
                    </label>
                    <input
                      type="text"
                      value={formData.auditor_name}
                      onChange={(e) => setFormData({ ...formData, auditor_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="suspended">Suspended</option>
                    <option value="in_renewal">In Renewal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  />
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
                    {editing ? 'Update' : 'Add'}
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
