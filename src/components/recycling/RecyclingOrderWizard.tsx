import { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface RecyclingOrderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RecyclingOrderWizard({ isOpen, onClose, onSuccess }: RecyclingOrderWizardProps) {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    contact_id: '',
    order_date: new Date().toISOString().split('T')[0],
    processing_intent: 'recycle',
    expected_weight: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen && currentCompany) {
      loadContacts();
    }
  }, [isOpen, currentCompany]);

  const loadContacts = async () => {
    if (!currentCompany) return;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, contact_code')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error('Error loading contacts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentCompany) {
      showToast('No company selected', 'error');
      return;
    }

    if (!formData.contact_id) {
      showToast('Contact/TSDF Partner is required', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderData: any = {
        company_id: currentCompany.id,
        contact_id: formData.contact_id,
        order_date: formData.order_date,
        processing_intent: formData.processing_intent,
        expected_weight: formData.expected_weight ? parseFloat(formData.expected_weight) : null,
        status: 'pending',
        notes: formData.notes.trim() || null,
      };

      const { error } = await supabase.from('recycling_orders').insert(orderData);

      if (error) throw error;

      showToast('Recycling order created successfully', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating recycling order:', error);
      showToast(error.message || 'Failed to create recycling order', 'error');
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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Create Recycling Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              TSDF Partner / Recycler <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.contact_id}
              onChange={(e) => handleChange('contact_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Partner...</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name} ({contact.contact_code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
              <input
                type="date"
                value={formData.order_date}
                onChange={(e) => handleChange('order_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Weight (kg)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.expected_weight}
                onChange={(e) => handleChange('expected_weight', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1000.00"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Processing Intent
            </label>
            <select
              value={formData.processing_intent}
              onChange={(e) => handleChange('processing_intent', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="recycle">Recycle</option>
              <option value="refurbish">Refurbish</option>
              <option value="reuse">Reuse</option>
              <option value="dispose">Dispose</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Additional information about this recycling order..."
            />
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
              Create Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
