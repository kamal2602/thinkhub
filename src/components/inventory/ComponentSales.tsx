import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { DollarSign, Plus, TrendingUp, Package, User, Calendar } from 'lucide-react';

interface ComponentSale {
  id: string;
  component_type: string;
  component_name: string;
  component_serial: string;
  capacity: string;
  customer_id: string;
  cost_basis: number;
  selling_price: number;
  profit: number;
  quantity: number;
  sale_date: string;
  customers?: { name: string };
  source_serial_number?: string;
}

interface HarvestedComponent {
  id: string;
  component_type: string;
  component_name: string;
  component_serial: string;
  capacity: string;
  technology_type?: string;
  manufacturer?: string;
  market_value_at_harvest: number;
  quantity_available: number;
  source_asset_id?: string;
  source_serial_number?: string;
  status: string;
}

interface Customer {
  id: string;
  name: string;
}

export default function ComponentSales() {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [sales, setSales] = useState<ComponentSale[]>([]);
  const [components, setComponents] = useState<HarvestedComponent[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<HarvestedComponent | null>(null);
  const [saleData, setSaleData] = useState({
    customer_id: '',
    selling_price: '',
    quantity: 1,
    notes: ''
  });

  useEffect(() => {
    if (selectedCompany) {
      fetchSales();
      fetchAvailableComponents();
      fetchCustomers();
    }
  }, [selectedCompany]);

  const fetchSales = async () => {
    if (!selectedCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('component_sales')
        .select('*, customers(name)')
        .eq('company_id', selectedCompany.id)
        .order('sale_date', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableComponents = async () => {
    if (!selectedCompany) return;

    try {
      const { data, error } = await supabase
        .from('harvested_components_inventory')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .eq('status', 'available')
        .gt('quantity_available', 0)
        .order('component_type');

      if (error) throw error;
      setComponents(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const fetchCustomers = async () => {
    if (!selectedCompany) return;

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .eq('company_id', selectedCompany.id)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleSellComponent = (component: HarvestedComponent) => {
    setSelectedComponent(component);
    setSaleData({
      customer_id: '',
      selling_price: component.market_value_at_harvest?.toString() || '',
      quantity: 1,
      notes: ''
    });
    setShowSaleModal(true);
  };

  const handleSubmitSale = async () => {
    if (!selectedComponent || !selectedCompany) return;

    if (!saleData.customer_id || !saleData.selling_price) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    const sellingPrice = parseFloat(saleData.selling_price);
    if (isNaN(sellingPrice) || sellingPrice <= 0) {
      showToast('Please enter a valid selling price', 'error');
      return;
    }

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data: assetData } = await supabase
        .from('assets')
        .select('purchase_lot_id')
        .eq('id', selectedComponent.source_asset_id)
        .maybeSingle();

      const costBasis = selectedComponent.market_value_at_harvest || 0;

      const { error } = await supabase
        .from('component_sales')
        .insert({
          company_id: selectedCompany.id,
          harvested_component_id: selectedComponent.id,
          component_type: selectedComponent.component_type,
          component_name: selectedComponent.component_name,
          component_serial: selectedComponent.component_serial,
          capacity: selectedComponent.capacity,
          customer_id: saleData.customer_id,
          cost_basis: costBasis,
          selling_price: sellingPrice,
          quantity: saleData.quantity,
          source_asset_id: selectedComponent.source_asset_id,
          source_lot_id: assetData?.purchase_lot_id || null,
          notes: saleData.notes || null,
          created_by: userId
        });

      if (error) throw error;

      showToast(
        `Component sold for $${sellingPrice.toFixed(2)} (Profit: $${(sellingPrice - costBasis).toFixed(2)})`,
        'success'
      );

      setShowSaleModal(false);
      setSelectedComponent(null);
      fetchSales();
      fetchAvailableComponents();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.selling_price, 0);
  const totalCost = sales.reduce((sum, sale) => sum + sale.cost_basis, 0);
  const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Component Sales</h2>
          <p className="text-gray-600 mt-1">Track sales of harvested components to customers</p>
        </div>
        <button
          onClick={() => setShowSaleModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Sale
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-green-600 font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-green-900">${totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-sm text-red-600 font-medium">Total Cost</p>
              <p className="text-2xl font-bold text-red-900">${totalCost.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Profit</p>
              <p className="text-2xl font-bold text-blue-900">${totalProfit.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-amber-600" />
            <div>
              <p className="text-sm text-amber-600 font-medium">Total Sales</p>
              <p className="text-2xl font-bold text-amber-900">{sales.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Component</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selling Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sales.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No component sales yet</p>
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(sale.sale_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{sale.component_name}</div>
                    <div className="text-sm text-gray-500">{sale.capacity}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{sale.component_serial}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{sale.customers?.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">${sale.cost_basis.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-green-600">
                    ${sale.selling_price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        sale.profit >= 0
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      ${sale.profit.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showSaleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sell Component</h3>

              {!selectedComponent ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Component
                  </label>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {components.map((comp) => (
                      <div
                        key={comp.id}
                        onClick={() => handleSellComponent(comp)}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{comp.component_name}</div>
                            <div className="text-sm text-gray-600">
                              {comp.capacity} • {comp.technology_type}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Serial: {comp.component_serial}
                              {comp.source_serial_number && ` • From: ${comp.source_serial_number}`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-green-600">
                              ${comp.market_value_at_harvest?.toFixed(2) || '0.00'}
                            </div>
                            <div className="text-xs text-gray-500">Market Value</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="font-medium text-gray-900">{selectedComponent.component_name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {selectedComponent.capacity} • {selectedComponent.technology_type}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Serial: {selectedComponent.component_serial}
                    </div>
                    <div className="text-sm font-semibold text-green-600 mt-2">
                      Cost Basis: ${selectedComponent.market_value_at_harvest?.toFixed(2) || '0.00'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={saleData.customer_id}
                      onChange={(e) => setSaleData({ ...saleData, customer_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    >
                      <option value="">Select customer...</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Selling Price (USD) <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={saleData.selling_price}
                        onChange={(e) => setSaleData({ ...saleData, selling_price: e.target.value })}
                        className="w-full pl-8 pr-4 py-2 border rounded-lg"
                        required
                      />
                    </div>
                    {saleData.selling_price && selectedComponent.market_value_at_harvest && (
                      <p className="text-sm text-gray-600 mt-1">
                        Profit:{' '}
                        <span
                          className={
                            parseFloat(saleData.selling_price) - selectedComponent.market_value_at_harvest >= 0
                              ? 'text-green-600 font-semibold'
                              : 'text-red-600 font-semibold'
                          }
                        >
                          $
                          {(
                            parseFloat(saleData.selling_price) - selectedComponent.market_value_at_harvest
                          ).toFixed(2)}
                        </span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={saleData.notes}
                      onChange={(e) => setSaleData({ ...saleData, notes: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={3}
                      placeholder="Optional notes..."
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowSaleModal(false);
                    setSelectedComponent(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                {selectedComponent && (
                  <button
                    onClick={handleSubmitSale}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Complete Sale
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
