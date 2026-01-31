import { useState, useEffect } from 'react';
import { FileText, Trash2, Eye, DollarSign, Clock, CheckCircle, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { PaymentStatus } from '../../lib/database.types';
import { UnifiedSalesCatalog } from './UnifiedSalesCatalog';
import { InvoicePrint } from './InvoicePrint';

interface SalesInvoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  cost_amount: number;
  paid_amount: number;
  payment_status: PaymentStatus;
  notes: string;
  customers: {
    name: string;
  };
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface CartItem {
  product_type_id: string;
  product_type_name: string;
  product_model: string;
  brand: string;
  grade_name: string | null;
  grade_color: string | null;
  grade_id: string | null;
  available_count: number;
  unit_price: number;
  requires_serial_tracking: boolean;
  is_component: boolean;
  tracking_mode: 'serial' | 'quantity';
  quantity: number;
}

export function SalesInvoices() {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [view, setView] = useState<'list' | 'create'>('list');
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', email: '', phone: '' });
  const [viewingInvoiceId, setViewingInvoiceId] = useState<string | null>(null);

  const canEdit = selectedCompany?.role !== 'viewer';

  useEffect(() => {
    if (selectedCompany) {
      fetchData();
    }
  }, [selectedCompany]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invoicesRes, customersRes] = await Promise.all([
        supabase
          .from('sales_invoices')
          .select('*, customers(name)')
          .eq('company_id', selectedCompany?.id)
          .order('invoice_date', { ascending: false }),
        supabase
          .from('customers')
          .select('id, name, email')
          .eq('company_id', selectedCompany?.id)
          .order('name'),
      ]);

      if (invoicesRes.error) throw invoicesRes.error;
      if (customersRes.error) throw customersRes.error;

      setInvoices(invoicesRes.data || []);
      setCustomers(customersRes.data || []);
    } catch (error: any) {
      showToast('Error fetching data: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToInvoice = (items: CartItem[]) => {
    if (!selectedCustomer) {
      showToast('Please select a customer first', 'error');
      return false;
    }
    setCartItems(items);
    return true;
  };

  const createNewCustomer = async () => {
    if (!newCustomerData.name.trim()) {
      showToast('Customer name is required', 'error');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          company_id: selectedCompany?.id,
          name: newCustomerData.name,
          email: newCustomerData.email || null,
          phone: newCustomerData.phone || null,
        })
        .select()
        .single();

      if (error) throw error;

      showToast('Customer created successfully', 'success');
      setCustomers([...customers, data]);
      setSelectedCustomer(data.id);
      setShowNewCustomerForm(false);
      setNewCustomerData({ name: '', email: '', phone: '' });
    } catch (error: any) {
      showToast('Error creating customer: ' + error.message, 'error');
    }
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}-${random}`;
  };

  const createInvoice = async () => {
    if (!selectedCustomer) {
      showToast('Please select a customer', 'error');
      return;
    }

    if (cartItems.length === 0) {
      showToast('Please add items to the invoice', 'error');
      return;
    }

    try {
      const totalAmount = cartItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      const totalCost = cartItems.reduce((sum, item) => {
        // Estimate cost at 60% of selling price if not tracked
        const costEstimate = item.unit_price * 0.6;
        return sum + (costEstimate * item.quantity);
      }, 0);
      const invoiceNumber = generateInvoiceNumber();

      // Create invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('sales_invoices')
        .insert({
          company_id: selectedCompany?.id,
          invoice_number: invoiceNumber,
          customer_id: selectedCustomer,
          invoice_date: new Date().toISOString().split('T')[0],
          total_amount: totalAmount,
          cost_amount: totalCost,
          paid_amount: 0,
          payment_status: 'unpaid',
          notes: invoiceNotes,
          created_by: user?.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice line items
      const lineItems = cartItems.map(item => ({
        invoice_id: invoiceData.id,
        product_type_id: item.product_type_id,
        product_model: item.product_model,
        tracking_mode: item.tracking_mode,
        quantity: item.quantity,
        quantity_ordered: item.quantity,
        quantity_fulfilled: 0,
        unit_price: item.unit_price,
        cost_price: item.unit_price * 0.6, // Estimated cost
        total_price: item.unit_price * item.quantity,
        grade_id: item.grade_id,
      }));

      const { error: itemsError } = await supabase
        .from('sales_invoice_items')
        .insert(lineItems);

      if (itemsError) throw itemsError;

      showToast(`Invoice ${invoiceNumber} created successfully!`, 'success');

      setView('list');
      setSelectedCustomer('');
      setInvoiceNotes('');
      setCartItems([]);
      fetchData();
    } catch (error: any) {
      showToast('Error creating invoice: ' + error.message, 'error');
    }
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      const { error } = await supabase
        .from('sales_invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Invoice deleted successfully', 'success');
      fetchData();
    } catch (error: any) {
      showToast('Error deleting invoice: ' + error.message, 'error');
    }
  };

  const getPaymentStatusConfig = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return {
          color: 'text-green-700 bg-green-100 border-green-300',
          icon: CheckCircle,
          label: 'Paid'
        };
      case 'partial':
        return {
          color: 'text-yellow-700 bg-yellow-100 border-yellow-300',
          icon: Clock,
          label: 'Partial'
        };
      case 'unpaid':
        return {
          color: 'text-red-700 bg-red-100 border-red-300',
          icon: Clock,
          label: 'Unpaid'
        };
      default:
        return {
          color: 'text-gray-700 bg-gray-100 border-gray-300',
          icon: Clock,
          label: status
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Invoice</h1>
            <p className="text-gray-600 mt-1">Browse catalog and add items to create an invoice</p>
          </div>
          <button
            onClick={() => setView('list')}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Back to Invoices
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Customer *
                </label>
                <button
                  onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showNewCustomerForm ? 'Select Existing' : '+ New Customer'}
                </button>
              </div>

              {!showNewCustomerForm ? (
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a customer...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-3 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                  <input
                    type="text"
                    placeholder="Customer Name *"
                    value={newCustomerData.name}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={newCustomerData.email}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                  <input
                    type="tel"
                    placeholder="Phone (optional)"
                    value={newCustomerData.phone}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                  <button
                    onClick={createNewCustomer}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Save Customer
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Notes
              </label>
              <input
                type="text"
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                placeholder="Optional notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {cartItems.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Invoice Summary</h3>
                <button
                  onClick={createInvoice}
                  disabled={!selectedCustomer}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                >
                  Create Invoice
                </button>
              </div>

              <div className="space-y-3">
                {cartItems.map((item, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.product_model}</div>
                        <div className="text-xs text-gray-600">
                          {item.product_type_name}
                          {item.grade_name && ` • Grade ${item.grade_name}`}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const newItems = cartItems.filter((_, i) => i !== index);
                          setCartItems(newItems);
                        }}
                        className="text-red-600 hover:text-red-800 ml-2 text-xl font-bold"
                        title="Remove item"
                      >
                        ×
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Qty</label>
                        <input
                          type="number"
                          min="1"
                          max={item.available_count}
                          value={item.quantity}
                          onChange={(e) => {
                            const newQty = parseInt(e.target.value) || 1;
                            if (newQty > 0 && newQty <= item.available_count) {
                              const newItems = [...cartItems];
                              newItems[index].quantity = newQty;
                              setCartItems(newItems);
                            }
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Unit Price</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => {
                            const newPrice = parseFloat(e.target.value) || 0;
                            if (newPrice >= 0) {
                              const newItems = [...cartItems];
                              newItems[index].unit_price = newPrice;
                              setCartItems(newItems);
                            }
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Total</label>
                        <div className="px-2 py-1 bg-gray-100 rounded font-semibold text-gray-900 text-center">
                          ${(item.unit_price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-3 mt-3 border-t border-blue-300 flex justify-between items-center">
                  <span className="font-bold text-gray-900 text-lg">Grand Total:</span>
                  <span className="font-bold text-blue-600 text-2xl">
                    ${cartItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <UnifiedSalesCatalog onAddToInvoice={handleAddToInvoice} selectedCustomerName={customers.find(c => c.id === selectedCustomer)?.name} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Invoices</h1>
          <p className="text-gray-600 mt-1">Manage sales invoices and track payments</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setView('create')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <FileText className="w-5 h-5" />
            Create Invoice
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              {canEdit && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 8 : 7} className="px-6 py-12 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">No invoices yet</p>
                  <p className="text-sm">Create your first invoice using the catalog</p>
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => {
                const statusConfig = getPaymentStatusConfig(invoice.payment_status);
                const StatusIcon = statusConfig.icon;
                const balance = invoice.total_amount - invoice.paid_amount;

                return (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {invoice.customers.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      ${invoice.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-700 font-medium">
                      ${invoice.paid_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      ${balance.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewingInvoiceId(invoice.id)}
                            className="text-blue-600 hover:text-blue-800"
                            title="View/Print Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteInvoice(invoice.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {viewingInvoiceId && (
        <InvoicePrint
          invoiceId={viewingInvoiceId}
          onClose={() => setViewingInvoiceId(null)}
        />
      )}
    </div>
  );
}
