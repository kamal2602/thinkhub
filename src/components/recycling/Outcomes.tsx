import { useState, useEffect } from 'react';
import { Layers, Save, Leaf } from 'lucide-react';
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

export function Outcomes({ onRefresh }: Props) {
  const { selectedCompany } = useCompany();
  const { addToast } = useToast();
  const [orders, setOrders] = useState<RecyclingOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [disposalMethod, setDisposalMethod] = useState('');
  const [materialCategory, setMaterialCategory] = useState('');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedCompany) {
      loadOrders();
    }
  }, [selectedCompany]);

  const loadOrders = async () => {
    if (!selectedCompany) return;

    try {
      const { data, error } = await supabase
        .from('recycling_orders')
        .select('id, order_number, total_weight')
        .eq('company_id', selectedCompany.id)
        .eq('status', 'in_progress')
        .order('order_date', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Failed to load orders:', error);
    }
  };

  const handleRecordOutcome = async () => {
    if (!selectedOrder || !disposalMethod || !materialCategory || !weight) {
      addToast('Please fill all fields', 'error');
      return;
    }

    if (!selectedCompany) return;

    setLoading(true);
    try {
      const carbonEstimate = parseFloat(weight) * 0.5;
      const co2Avoided = parseFloat(weight) * 2.1;

      const { error: esgError } = await supabase
        .from('esg_events')
        .insert({
          company_id: selectedCompany.id,
          source_type: 'recycling_order',
          source_id: selectedOrder,
          material_category: materialCategory,
          weight: parseFloat(weight),
          disposal_method: disposalMethod,
          carbon_estimate: carbonEstimate,
          co2_avoided: co2Avoided,
          event_date: new Date().toISOString().split('T')[0],
        });

      if (esgError) throw esgError;

      const { error: updateError } = await supabase
        .from('recycling_orders')
        .update({ status: 'completed' })
        .eq('id', selectedOrder);

      if (updateError) throw updateError;

      addToast('Outcome recorded successfully', 'success');
      setSelectedOrder('');
      setDisposalMethod('');
      setMaterialCategory('');
      setWeight('');
      loadOrders();
      onRefresh?.();
    } catch (error: any) {
      console.error('Failed to record outcome:', error);
      addToast('Failed to record outcome', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-100 rounded-lg">
              <Layers className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Record Outcomes</h2>
              <p className="text-sm text-gray-600">Document disposal methods and create ESG events</p>
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
                    {order.order_number} ({order.total_weight} kg)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Material Category
              </label>
              <select
                value={materialCategory}
                onChange={(e) => setMaterialCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose category...</option>
                <option value="Laptops">Laptops</option>
                <option value="Desktops">Desktops</option>
                <option value="Monitors">Monitors</option>
                <option value="Servers">Servers</option>
                <option value="Mobile Devices">Mobile Devices</option>
                <option value="Peripherals">Peripherals</option>
                <option value="Mixed E-Waste">Mixed E-Waste</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Disposal Method
              </label>
              <select
                value={disposalMethod}
                onChange={(e) => setDisposalMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose method...</option>
                <option value="Refurbishment">Refurbishment (Resale)</option>
                <option value="Donation">Donation</option>
                <option value="Material Recovery">Material Recovery</option>
                <option value="Recycling">Recycling</option>
                <option value="Incineration">Incineration (Energy Recovery)</option>
                <option value="Landfill">Landfill (Last Resort)</option>
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
                placeholder="Enter weight"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800 mb-2">
                <Leaf className="w-5 h-5" />
                <span className="font-medium">ESG Impact (Estimated)</span>
              </div>
              {weight && (
                <div className="text-sm text-green-700 space-y-1">
                  <div>Carbon Estimate: {(parseFloat(weight) * 0.5).toFixed(2)} kg CO2e</div>
                  <div>CO2 Avoided: {(parseFloat(weight) * 2.1).toFixed(2)} kg (vs. landfill)</div>
                </div>
              )}
            </div>

            <button
              onClick={handleRecordOutcome}
              disabled={loading || !selectedOrder || !disposalMethod || !materialCategory || !weight}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Record Outcome
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
