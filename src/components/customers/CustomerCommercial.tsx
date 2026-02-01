import { useState, useEffect } from 'react';
import { DollarSign, CreditCard, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type Customer = Database['public']['Tables']['customers']['Row'];
type PaymentTerm = Database['public']['Tables']['payment_terms']['Row'];

interface CustomerCommercialProps {
  customer: Customer;
  onUpdate: (updates: Partial<Customer>) => Promise<void>;
  canEdit: boolean;
}

export function CustomerCommercial({ customer, onUpdate, canEdit }: CustomerCommercialProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [formData, setFormData] = useState({
    payment_terms_id: customer.payment_terms_id || '',
    credit_limit: customer.credit_limit || '',
    currency: customer.currency || 'USD',
    billing_email: customer.billing_email || '',
    billing_phone: customer.billing_phone || '',
  });

  useEffect(() => {
    fetchPaymentTerms();
  }, []);

  useEffect(() => {
    setFormData({
      payment_terms_id: customer.payment_terms_id || '',
      credit_limit: customer.credit_limit || '',
      currency: customer.currency || 'USD',
      billing_email: customer.billing_email || '',
      billing_phone: customer.billing_phone || '',
    });
  }, [customer]);

  const fetchPaymentTerms = async () => {
    const { data } = await supabase
      .from('payment_terms')
      .select('*')
      .order('name');
    if (data) setPaymentTerms(data);
  };

  const handleSave = async () => {
    await onUpdate({
      payment_terms_id: formData.payment_terms_id || null,
      credit_limit: formData.credit_limit || null,
      currency: formData.currency,
      billing_email: formData.billing_email || null,
      billing_phone: formData.billing_phone || null,
    });
    setIsEditing(false);
  };

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  ];

  const selectedPaymentTerm = paymentTerms.find(pt => pt.id === customer.payment_terms_id);

  if (!isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Commercial Terms</h3>
          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <label className="text-sm font-medium text-blue-900">Payment Terms</label>
            </div>
            <p className="text-blue-900 font-semibold">
              {selectedPaymentTerm?.name || 'Not set'}
            </p>
            {selectedPaymentTerm?.description && (
              <p className="text-sm text-blue-700 mt-1">{selectedPaymentTerm.description}</p>
            )}
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              <label className="text-sm font-medium text-green-900">Credit Limit</label>
            </div>
            <p className="text-green-900 font-semibold text-xl">
              {customer.credit_limit
                ? `${currencies.find(c => c.code === customer.currency)?.symbol || '$'}${parseFloat(customer.credit_limit.toString()).toLocaleString()}`
                : 'Not set'
              }
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              <label className="text-sm font-medium text-purple-900">Currency</label>
            </div>
            <p className="text-purple-900 font-semibold">
              {currencies.find(c => c.code === customer.currency)?.name || customer.currency || 'USD'}
            </p>
            <p className="text-sm text-purple-700">
              {currencies.find(c => c.code === customer.currency)?.symbol || '$'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Billing Contact</label>
            <div className="space-y-1">
              {customer.billing_email && (
                <p className="text-sm text-gray-900">{customer.billing_email}</p>
              )}
              {customer.billing_phone && (
                <p className="text-sm text-gray-900">{customer.billing_phone}</p>
              )}
              {!customer.billing_email && !customer.billing_phone && (
                <p className="text-sm text-gray-500">Not set</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-2">Commercial Summary</h4>
          <div className="space-y-1 text-sm text-yellow-800">
            <p>
              Customer is on{' '}
              <span className="font-semibold">{selectedPaymentTerm?.name || 'standard'}</span> payment terms
            </p>
            {customer.credit_limit && (
              <p>
                Credit limit:{' '}
                <span className="font-semibold">
                  {currencies.find(c => c.code === customer.currency)?.symbol || '$'}
                  {parseFloat(customer.credit_limit.toString()).toLocaleString()}
                </span>
              </p>
            )}
            <p>All transactions will be in <span className="font-semibold">{customer.currency || 'USD'}</span></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Edit Commercial Terms</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms</label>
          <select
            value={formData.payment_terms_id}
            onChange={(e) => setFormData({ ...formData, payment_terms_id: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select payment terms</option>
            {paymentTerms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name} {term.description && `- ${term.description}`}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Defines when payment is due after invoice date
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
          <select
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {currencies.map((curr) => (
              <option key={curr.code} value={curr.code}>
                {curr.code} - {curr.name} ({curr.symbol})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Credit Limit</label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-500">
              {currencies.find(c => c.code === formData.currency)?.symbol || '$'}
            </span>
            <input
              type="number"
              step="0.01"
              value={formData.credit_limit}
              onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
              className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Maximum amount customer can owe at any time
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Billing Email</label>
          <input
            type="email"
            value={formData.billing_email}
            onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="billing@customer.com"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Billing Phone</label>
          <input
            type="tel"
            value={formData.billing_phone}
            onChange={(e) => setFormData({ ...formData, billing_phone: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="+1 (555) 000-0000"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={() => setIsEditing(false)}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
