import { useEffect, useState } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InvoiceData {
  invoice: {
    id: string;
    invoice_number: string;
    invoice_date: string;
    total_amount: number;
    cost_amount: number;
    paid_amount: number;
    payment_status: string;
    notes: string;
    customers: {
      name: string;
      email: string;
      phone: string;
      address: string;
    };
  };
  items: Array<{
    product_type_id: string;
    product_model: string;
    quantity_ordered: number;
    unit_price: number;
    total_price: number;
    product_types: {
      name: string;
    };
  }>;
  company: {
    name: string;
  };
}

interface InvoicePrintProps {
  invoiceId: string;
  onClose: () => void;
}

export function InvoicePrint({ invoiceId, onClose }: InvoicePrintProps) {
  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoiceData();
  }, [invoiceId]);

  const fetchInvoiceData = async () => {
    try {
      const [invoiceRes, itemsRes] = await Promise.all([
        supabase
          .from('sales_invoices')
          .select(`
            *,
            customers(name, email, phone, address),
            companies(name)
          `)
          .eq('id', invoiceId)
          .single(),
        supabase
          .from('sales_invoice_items')
          .select(`
            *,
            product_types(name)
          `)
          .eq('invoice_id', invoiceId),
      ]);

      if (invoiceRes.error) throw invoiceRes.error;
      if (itemsRes.error) throw itemsRes.error;

      setData({
        invoice: invoiceRes.data,
        items: itemsRes.data,
        company: invoiceRes.data.companies,
      });
    } catch (error) {
      console.error('Error fetching invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const balance = data.invoice.total_amount - data.invoice.paid_amount;
  const profit = data.invoice.total_amount - data.invoice.cost_amount;
  const profitMargin = data.invoice.total_amount > 0
    ? ((profit / data.invoice.total_amount) * 100).toFixed(1)
    : '0.0';

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-print, #invoice-print * {
            visibility: visible;
          }
          #invoice-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full my-8 relative">
          {/* Close X button in top-right */}
          <button
            onClick={onClose}
            className="no-print absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition z-10"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="no-print flex justify-end gap-2 p-4 border-b border-gray-200 bg-gray-50">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Download className="w-4 h-4" />
              Download / Print
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              Close
            </button>
          </div>

          <div id="invoice-print" className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{data.company.name}</h1>
              <p className="text-gray-600">SALES INVOICE</p>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-2">BILL TO:</h2>
                <div className="text-gray-900">
                  <p className="font-semibold">{data.invoice.customers.name}</p>
                  {data.invoice.customers.email && <p className="text-sm">{data.invoice.customers.email}</p>}
                  {data.invoice.customers.phone && <p className="text-sm">{data.invoice.customers.phone}</p>}
                  {data.invoice.customers.address && <p className="text-sm mt-1">{data.invoice.customers.address}</p>}
                </div>
              </div>

              <div className="text-right">
                <div className="mb-4">
                  <p className="text-sm text-gray-600">Invoice Number</p>
                  <p className="text-lg font-bold text-gray-900">{data.invoice.invoice_number}</p>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-600">Invoice Date</p>
                  <p className="text-gray-900">{new Date(data.invoice.invoice_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-gray-900 font-semibold capitalize">{data.invoice.payment_status}</p>
                </div>
              </div>
            </div>

            <table className="w-full mb-8">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 text-sm font-semibold text-gray-700">ITEM</th>
                  <th className="text-center py-3 text-sm font-semibold text-gray-700">QTY</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-700">UNIT PRICE</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-700">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-3 text-gray-900">
                      <div className="font-medium">{item.product_types.name}</div>
                      <div className="text-sm text-gray-600">{item.product_model}</div>
                    </td>
                    <td className="py-3 text-center text-gray-900">{item.quantity_ordered}</td>
                    <td className="py-3 text-right text-gray-900">${item.unit_price.toFixed(2)}</td>
                    <td className="py-3 text-right font-medium text-gray-900">${item.total_price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mb-8">
              <div className="w-64">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium text-gray-900">${data.invoice.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium text-gray-900">$0.00</span>
                </div>
                <div className="flex justify-between py-3 border-b-2 border-gray-300">
                  <span className="text-lg font-semibold text-gray-900">TOTAL:</span>
                  <span className="text-lg font-bold text-gray-900">${data.invoice.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200 mt-2">
                  <span className="text-gray-600">Paid:</span>
                  <span className="font-medium text-green-700">${data.invoice.paid_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-lg font-semibold text-gray-900">Balance Due:</span>
                  <span className="text-lg font-bold text-red-600">${balance.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="no-print bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Internal Profitability</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Cost:</p>
                  <p className="font-semibold text-gray-900">${data.invoice.cost_amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Profit:</p>
                  <p className="font-semibold text-green-700">${profit.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Margin:</p>
                  <p className="font-semibold text-blue-700">{profitMargin}%</p>
                </div>
              </div>
            </div>

            {data.invoice.notes && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">NOTES:</h3>
                <p className="text-sm text-gray-600">{data.invoice.notes}</p>
              </div>
            )}

            <div className="mt-8 pt-8 border-t border-gray-200 text-center text-xs text-gray-500">
              <p>Thank you for your business!</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
