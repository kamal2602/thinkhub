import { useState, useEffect } from 'react';
import { ShoppingCart, Search, X, Plus, Minus, Package, Cpu, Laptop, Monitor, Tablet, Smartphone, HardDrive, MemoryStick, Battery, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface CatalogItem {
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
}

interface CartItem extends CatalogItem {
  quantity: number;
}

interface CatalogSection {
  name: string;
  icon: any;
  items: CatalogItem[];
  type: 'device' | 'component';
}

interface UnifiedSalesCatalogProps {
  onAddToInvoice?: (items: CartItem[]) => boolean | void;
  selectedCustomerName?: string;
}

export function UnifiedSalesCatalog({ onAddToInvoice, selectedCustomerName }: UnifiedSalesCatalogProps) {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();

  const [catalogSections, setCatalogSections] = useState<CatalogSection[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCompany) {
      fetchCatalogItems();
    }
  }, [selectedCompany]);

  const getIconForType = (typeName: string) => {
    const lowerType = typeName.toLowerCase();
    if (lowerType.includes('laptop') || lowerType.includes('notebook')) return Laptop;
    if (lowerType.includes('desktop') || lowerType.includes('pc')) return Monitor;
    if (lowerType.includes('tablet') || lowerType.includes('ipad')) return Tablet;
    if (lowerType.includes('phone') || lowerType.includes('mobile')) return Smartphone;
    if (lowerType.includes('ram') || lowerType.includes('memory')) return MemoryStick;
    if (lowerType.includes('hdd') || lowerType.includes('ssd') || lowerType.includes('nvme') || lowerType.includes('storage')) return HardDrive;
    if (lowerType.includes('battery')) return Battery;
    if (lowerType.includes('component')) return Cpu;
    return Package;
  };

  const fetchCatalogItems = async () => {
    if (!selectedCompany) return;

    try {
      setLoading(true);

      const { data: gradesData } = await supabase
        .from('cosmetic_grades')
        .select('*')
        .eq('company_id', selectedCompany.id);

      const gradesMap = new Map(
        (gradesData || []).map(g => [g.grade, { id: g.id, grade: g.grade, color: g.color }])
      );

      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select(`
          id,
          serial_number,
          brand,
          model,
          selling_price,
          status,
          product_type_id,
          cosmetic_grade,
          processing_stage,
          product_types!inner (
            id,
            name,
            requires_serial_tracking,
            allows_bulk_sales,
            is_component
          )
        `)
        .eq('company_id', selectedCompany.id)
        .eq('is_sales_ready', true)
        .gt('selling_price', 0);

      if (assetsError) throw assetsError;

      const deviceGroups = new Map<string, CatalogItem>();

      assets?.forEach((asset: any) => {
        const gradeInfo = gradesMap.get(asset.cosmetic_grade);
        const key = `${asset.product_type_id}-${asset.brand}-${asset.model}-${asset.cosmetic_grade || 'no-grade'}`;

        if (deviceGroups.has(key)) {
          const existing = deviceGroups.get(key)!;
          existing.available_count += 1;
        } else {
          deviceGroups.set(key, {
            product_type_id: asset.product_type_id,
            product_type_name: asset.product_types?.name || 'Unknown',
            product_model: `${asset.brand} ${asset.model}`,
            brand: asset.brand,
            grade_name: gradeInfo?.grade || null,
            grade_color: gradeInfo?.color || null,
            grade_id: gradeInfo?.id || null,
            available_count: 1,
            unit_price: asset.selling_price || 0,
            requires_serial_tracking: asset.product_types?.requires_serial_tracking || false,
            is_component: false,
            tracking_mode: 'serial'
          });
        }
      });

      const { data: components, error: componentsError } = await supabase
        .from('harvested_components_inventory')
        .select(`
          id,
          component_type,
          component_name,
          manufacturer,
          model_number,
          capacity,
          quantity_available,
          market_value_at_harvest,
          status
        `)
        .eq('company_id', selectedCompany.id)
        .eq('status', 'available')
        .gt('quantity_available', 0)
        .gt('market_value_at_harvest', 0);

      if (componentsError) throw componentsError;

      const componentGroups = new Map<string, CatalogItem>();

      components?.forEach((comp: any) => {
        const modelStr = `${comp.manufacturer || ''} ${comp.model_number || ''} ${comp.capacity || ''}`.trim();
        const key = `component-${comp.component_type}-${modelStr}`;

        if (componentGroups.has(key)) {
          const existing = componentGroups.get(key)!;
          existing.available_count += comp.quantity_available;
        } else {
          componentGroups.set(key, {
            product_type_id: comp.component_type,
            product_type_name: comp.component_type,
            product_model: modelStr || comp.component_name,
            brand: comp.manufacturer || '',
            grade_name: null,
            grade_color: null,
            grade_id: null,
            available_count: comp.quantity_available,
            unit_price: comp.market_value_at_harvest || 0,
            requires_serial_tracking: false,
            is_component: true,
            tracking_mode: 'quantity'
          });
        }
      });

      const allDevices = Array.from(deviceGroups.values());
      const allComponents = Array.from(componentGroups.values());

      const devicesByType = new Map<string, CatalogItem[]>();
      allDevices.forEach(device => {
        const typeName = device.product_type_name;
        if (!devicesByType.has(typeName)) {
          devicesByType.set(typeName, []);
        }
        devicesByType.get(typeName)!.push(device);
      });

      const componentsByType = new Map<string, CatalogItem[]>();
      allComponents.forEach(component => {
        const typeName = component.product_type_name;
        if (!componentsByType.has(typeName)) {
          componentsByType.set(typeName, []);
        }
        componentsByType.get(typeName)!.push(component);
      });

      const sections: CatalogSection[] = [];

      Array.from(devicesByType.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([typeName, items]) => {
          sections.push({
            name: typeName,
            icon: getIconForType(typeName),
            items: items.sort((a, b) => a.product_model.localeCompare(b.product_model)),
            type: 'device'
          });
        });

      Array.from(componentsByType.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([typeName, items]) => {
          sections.push({
            name: typeName,
            icon: getIconForType(typeName),
            items: items.sort((a, b) => a.product_model.localeCompare(b.product_model)),
            type: 'component'
          });
        });

      setCatalogSections(sections);
    } catch (error: any) {
      showToast('Error loading catalog: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: CatalogItem, quantity: number = 1) => {
    const existingIndex = cart.findIndex(
      ci => ci.product_type_id === item.product_type_id &&
           ci.product_model === item.product_model &&
           ci.grade_id === item.grade_id
    );

    if (existingIndex >= 0) {
      const newCart = [...cart];
      const newQuantity = newCart[existingIndex].quantity + quantity;

      if (newQuantity > item.available_count) {
        showToast(`Only ${item.available_count} units available`, 'error');
        return;
      }

      newCart[existingIndex].quantity = newQuantity;
      setCart(newCart);
    } else {
      if (quantity > item.available_count) {
        showToast(`Only ${item.available_count} units available`, 'error');
        return;
      }

      setCart([...cart, { ...item, quantity }]);
    }

    showToast(`Added to cart`, 'success');
    setShowCart(true);
  };

  const updateCartQuantity = (index: number, newQuantity: number, skipValidation: boolean = false) => {
    if (newQuantity <= 0) {
      removeFromCart(index);
      return;
    }

    const item = cart[index];
    if (!skipValidation && newQuantity > item.available_count) {
      showToast(`Only ${item.available_count} units available`, 'error');
      return;
    }

    const newCart = [...cart];
    newCart[index].quantity = newQuantity;
    setCart(newCart);
  };

  const updateCartPrice = (index: number, newPrice: number) => {
    if (newPrice < 0) return;

    const newCart = [...cart];
    newCart[index].unit_price = newPrice;
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const filteredSections = catalogSections
    .map(section => ({
      ...section,
      items: section.items.filter(item =>
        item.product_model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product_type_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }))
    .filter(section => section.items.length > 0);

  const visibleSections = selectedSection
    ? filteredSections.filter(s => s.name === selectedSection)
    : filteredSections;

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Sales Catalog</h1>
            <p className="text-blue-100">Browse our inventory of devices and components</p>
          </div>

          <button
            onClick={() => setShowCart(!showCart)}
            className="relative flex items-center gap-3 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 shadow-lg transition-all"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="font-semibold">Cart</span>
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg">
                {getCartItemCount()}
              </span>
            )}
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by model, brand, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-300 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 mt-4">Loading catalog...</p>
        </div>
      ) : filteredSections.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No items found</p>
          <p className="text-gray-500 text-sm">Try adjusting your search</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedSection(null)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                !selectedSection
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              All Categories
            </button>
            {catalogSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.name}
                  onClick={() => setSelectedSection(section.name === selectedSection ? null : section.name)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap flex items-center gap-2 transition-colors ${
                    selectedSection === section.name
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {section.name}
                  <span className="ml-1 text-xs opacity-75">
                    ({section.items.length})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-8">
            {visibleSections.map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.name} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <Icon className="w-6 h-6 text-blue-600" />
                      <h2 className="text-xl font-bold text-gray-900">{section.name}</h2>
                      <span className="text-sm text-gray-500">
                        ({section.items.length} {section.items.length === 1 ? 'item' : 'items'})
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {section.items.map((item, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white"
                        >
                          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
                            <Icon className="w-16 h-16 text-gray-400" />
                          </div>

                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                                  {item.product_model}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {item.brand || item.product_type_name}
                                </p>
                              </div>
                            </div>

                            {item.grade_name && (
                              <span
                                className="inline-block px-2 py-1 text-xs font-semibold rounded-full mb-3"
                                style={{
                                  backgroundColor: item.grade_color + '20',
                                  color: item.grade_color
                                }}
                              >
                                Grade {item.grade_name}
                              </span>
                            )}

                            <div className="flex items-center justify-between mb-3 pt-3 border-t border-gray-100">
                              <div>
                                <div className="text-2xl font-bold text-blue-600">
                                  ${item.unit_price.toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {item.available_count} in stock
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => addToCart(item, 1)}
                              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              Add to Cart
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showCart && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowCart(false)}
          />

          <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold">Shopping Cart</h3>
                <button
                  onClick={() => setShowCart(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-blue-100">
                {getCartItemCount()} {getCartItemCount() === 1 ? 'item' : 'items'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg font-medium">Your cart is empty</p>
                  <p className="text-gray-400 text-sm mt-2">Start adding items to create an invoice</p>
                </div>
              ) : (
                cart.map((item, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{item.product_model}</h4>
                        <p className="text-sm text-gray-600">{item.product_type_name}</p>
                        {item.grade_name && (
                          <span
                            className="inline-block px-2 py-1 text-xs font-semibold rounded-full mt-1"
                            style={{
                              backgroundColor: item.grade_color + '20',
                              color: item.grade_color
                            }}
                          >
                            Grade {item.grade_name}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromCart(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full p-1 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 font-medium">Quantity:</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCartQuantity(index, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '') {
                                const newCart = [...cart];
                                newCart[index].quantity = '' as any;
                                setCart(newCart);
                                return;
                              }
                              const newQty = parseInt(val);
                              if (!isNaN(newQty) && newQty > 0) {
                                updateCartQuantity(index, newQty, true);
                              }
                            }}
                            onBlur={(e) => {
                              const val = e.target.value;
                              const newQty = parseInt(val);
                              if (val === '' || isNaN(newQty) || newQty < 1) {
                                updateCartQuantity(index, 1, true);
                              } else if (newQty > item.available_count) {
                                showToast(`Only ${item.available_count} units available`, 'error');
                                updateCartQuantity(index, item.available_count, true);
                              } else {
                                updateCartQuantity(index, newQty, true);
                              }
                            }}
                            className="w-16 text-center font-semibold text-lg border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <button
                            onClick={() => updateCartQuantity(index, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 font-medium">Unit Price:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-700 font-medium">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '') {
                                return;
                              }
                              const newPrice = parseFloat(val);
                              if (!isNaN(newPrice) && newPrice >= 0) {
                                updateCartPrice(index, newPrice);
                              }
                            }}
                            onBlur={(e) => {
                              if (e.target.value === '' || parseFloat(e.target.value) < 0) {
                                updateCartPrice(index, 0);
                              }
                            }}
                            className="w-24 text-right font-semibold border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-300">
                        <span className="text-sm font-semibold text-gray-700">Total:</span>
                        <span className="font-bold text-gray-900 text-lg">
                          ${(item.unit_price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-gray-200 bg-gray-50 p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-700">Subtotal:</span>
                <span className="text-3xl font-bold text-blue-600">
                  ${getCartTotal().toFixed(2)}
                </span>
              </div>

              {selectedCustomerName && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <div className="text-sm font-medium">
                      Customer: {selectedCustomerName}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  if (onAddToInvoice && cart.length > 0) {
                    const result = onAddToInvoice(cart);
                    if (result !== false) {
                      setCart([]);
                      setShowCart(false);
                      showToast('Items added to invoice', 'success');
                    }
                  }
                }}
                disabled={cart.length === 0}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed font-semibold text-lg shadow-lg transition-all"
              >
                Add to Invoice
              </button>

              <button
                onClick={() => setShowCart(false)}
                className="w-full px-6 py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
