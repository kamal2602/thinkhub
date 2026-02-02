import { useState, useEffect } from 'react';
import { Scale, Upload, Save } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';

interface RecyclingOrder {
  id: string;
  order_number: string;
  total_weight: number | null;
}

interface Props {
  onRefresh?: () => void;
}

export function WeighStation({ onRefresh }: Props) {
  const { selectedCompany } = useCompany();
  const { addToast } = useToast();
  const [orders, setOrders] = useState<RecyclingOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedCompany) {
      loadPendingOrders();
    }
  }, [selectedCompany]);

  const loadPendingOrders = async () => {
    if (!selectedCompany) return;

    try {
      const { data, error } = await supabase
        .from('recycling_orders')
        .select('id, order_number, total_weight')
        .eq('company_id', selectedCompany.id)
        .in('status', ['pending', 'in_progress'])
        .order('order_date', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Failed to load orders:', error);
    }
  };

  const handleSaveWeight = async () => {
    if (!selectedOrder || !weight) {
      addToast('Please select an order and enter weight', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('recycling_orders')
        .update({
          total_weight: parseFloat(weight),
          status: 'in_progress',
        })
        .eq('id', selectedOrder);

      if (error) throw error;

      addToast('Weight recorded successfully', 'success');
      setWeight('');
      setSelectedOrder('');
      loadPendingOrders();
      onRefresh?.();
    } catch (error: any) {
      console.error('Failed to save weight:', error);
      addToast('Failed to save weight', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Scale className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Weigh Station</h2>
              <p className="text-sm text-gray-600">Record actual weight received</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Order
              </label>
              <select
                value={selectedOrder}
                onChange={(e) => setSelectedOrder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose an order...</option>
                {orders.map(order => (
                  <option key={order.id} value={order.id}>
                    {order.order_number} {order.total_weight ? `(${order.total_weight} kg)` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Enter weight in kilograms"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Upload weigh ticket photo (optional)
              </p>
              <button className="mt-2 text-sm text-blue-600 hover:text-blue-700">
                Select file
              </button>
            </div>

            <button
              onClick={handleSaveWeight}
              disabled={loading || !selectedOrder || !weight}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Weight
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
