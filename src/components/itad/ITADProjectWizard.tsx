import { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface ITADProjectWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ITADProjectWizard({ isOpen, onClose, onSuccess }: ITADProjectWizardProps) {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    project_name: '',
    itad_customer_id: '',
    service_type: 'buyback',
    expected_quantity: '',
    service_fee: '',
    revenue_share_percentage: '',
    data_sanitization_required: true,
    data_sanitization_standard: 'NIST 800-88',
    environmental_reporting_required: false,
    r2_certified_required: false,
    certificate_required: true,
  });

  useEffect(() => {
    if (isOpen && currentCompany) {
      loadCustomers();
    }
  }, [isOpen, currentCompany]);

  const loadCustomers = async () => {
    if (!currentCompany) return;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, contact_code')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error('Error loading customers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentCompany) {
      showToast('No company selected', 'error');
      return;
    }

    if (!formData.project_name.trim()) {
      showToast('Project name is required', 'error');
      return;
    }

    if (!formData.itad_customer_id) {
      showToast('Customer is required', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const projectData: any = {
        company_id: currentCompany.id,
        project_name: formData.project_name.trim(),
        itad_customer_id: formData.itad_customer_id,
        service_type: formData.service_type,
        expected_quantity: formData.expected_quantity ? parseInt(formData.expected_quantity) : null,
        service_fee: formData.service_fee ? parseFloat(formData.service_fee) : null,
        service_fee_currency: 'USD',
        revenue_share_percentage: formData.revenue_share_percentage
          ? parseFloat(formData.revenue_share_percentage)
          : null,
        data_sanitization_required: formData.data_sanitization_required,
        data_sanitization_standard: formData.data_sanitization_standard,
        environmental_reporting_required: formData.environmental_reporting_required,
        r2_certified_required: formData.r2_certified_required,
        certificate_required: formData.certificate_required,
        status: 'active',
        created_by: user?.id,
      };

      const { error } = await supabase.from('itad_projects').insert(projectData);

      if (error) throw error;

      showToast('ITAD project created successfully', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating ITAD project:', error);
      showToast(error.message || 'Failed to create ITAD project', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Create ITAD Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.project_name}
                onChange={(e) => handleChange('project_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enterprise Device Refresh 2024"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.itad_customer_id}
                onChange={(e) => handleChange('itad_customer_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Customer...</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.contact_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
              <select
                value={formData.service_type}
                onChange={(e) => handleChange('service_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="buyback">Buyback</option>
                <option value="revenue_share">Revenue Share</option>
                <option value="service_fee">Service Fee</option>
                <option value="zero_cost">Zero Cost</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Quantity
              </label>
              <input
                type="number"
                value={formData.expected_quantity}
                onChange={(e) => handleChange('expected_quantity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="100"
                min="0"
              />
            </div>

            {formData.service_type === 'service_fee' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Fee ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.service_fee}
                  onChange={(e) => handleChange('service_fee', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="5000.00"
                  min="0"
                />
              </div>
            )}

            {formData.service_type === 'revenue_share' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Revenue Share (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.revenue_share_percentage}
                  onChange={(e) => handleChange('revenue_share_percentage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="50.00"
                  min="0"
                  max="100"
                />
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Compliance Requirements</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.data_sanitization_required}
                  onChange={(e) => handleChange('data_sanitization_required', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Data Sanitization Required</span>
              </label>

              {formData.data_sanitization_required && (
                <div className="ml-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sanitization Standard
                  </label>
                  <select
                    value={formData.data_sanitization_standard}
                    onChange={(e) => handleChange('data_sanitization_standard', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="NIST 800-88">NIST 800-88</option>
                    <option value="DoD 5220.22-M">DoD 5220.22-M</option>
                    <option value="HMG IS5">HMG IS5</option>
                    <option value="Physical Destruction">Physical Destruction</option>
                  </select>
                </div>
              )}

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.certificate_required}
                  onChange={(e) => handleChange('certificate_required', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Certificate of Destruction Required</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.environmental_reporting_required}
                  onChange={(e) => handleChange('environmental_reporting_required', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Environmental Reporting Required</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.r2_certified_required}
                  onChange={(e) => handleChange('r2_certified_required', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">R2 Certified Facility Required</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && <Loader className="w-4 h-4 animate-spin" />}
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
