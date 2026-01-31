import { Package, Building2, MapPin, Users, TrendingUp, BarChart3, Truck, User, FileText, ShoppingCart, RotateCcw, PieChart, LogOut, Laptop, Boxes, PackageCheck, Settings, ChevronDown, ChevronRight, Database, ShieldCheck, Tag, CreditCard, FileWarning, Award, Scan, ArrowRight, Cpu, Store, Menu, X, DollarSign, GripVertical, Workflow, Brain, Shield, Leaf } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../../lib/supabase';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  name: string;
  icon: any;
  page: string;
  roles?: string[];
}

function SortableNavItem({
  item,
  isActive,
  onNavigate,
  isCollapsed
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate: (page: string) => void;
  isCollapsed: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.page });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = item.icon;

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button
        onClick={() => onNavigate(item.page)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
          isActive
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        {!isCollapsed && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </div>
        )}
        <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
        {!isCollapsed && (
          <span className="font-medium flex-1 text-left">{item.name}</span>
        )}
      </button>
    </div>
  );
}

export function Sidebar({ currentPage, onNavigate, isCollapsed, onToggle }: SidebarProps) {
  const { signOut, isSuperAdmin, userRole, user } = useAuth();
  const { selectedCompany } = useCompany();
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [masterDataExpanded, setMasterDataExpanded] = useState(false);
  const [organizationExpanded, setOrganizationExpanded] = useState(false);
  const [itadExpanded, setItadExpanded] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const masterDataRef = useRef<HTMLDivElement>(null);
  const organizationRef = useRef<HTMLDivElement>(null);
  const itadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (settingsExpanded && settingsRef.current) {
      settingsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [settingsExpanded]);

  useEffect(() => {
    if (masterDataExpanded && masterDataRef.current) {
      setTimeout(() => {
        masterDataRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  }, [masterDataExpanded]);

  useEffect(() => {
    if (organizationExpanded && organizationRef.current) {
      setTimeout(() => {
        organizationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  }, [organizationExpanded]);

  useEffect(() => {
    if (itadExpanded && itadRef.current) {
      setTimeout(() => {
        itadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  }, [itadExpanded]);

  const allNavigation: NavItem[] = [
    { name: 'Dashboard', icon: BarChart3, page: 'dashboard', roles: ['admin', 'manager'] },
    { name: 'Processing', icon: Laptop, page: 'processing', roles: ['admin', 'manager', 'technician'] },
    { name: 'Purchase Orders', icon: ShoppingCart, page: 'purchases', roles: ['admin', 'manager'] },
    { name: 'Smart Receiving', icon: Scan, page: 'smart-receiving', roles: ['admin', 'manager'] },
    { name: 'Ready to Sell', icon: Store, page: 'saleable-inventory', roles: ['admin', 'manager', 'sales'] },
    { name: 'Parts & Supplies', icon: Package, page: 'inventory', roles: ['admin', 'manager', 'sales'] },
    { name: 'Components', icon: Cpu, page: 'harvested-components', roles: ['admin', 'manager', 'technician'] },
    { name: 'Component Sales', icon: DollarSign, page: 'component-sales', roles: ['admin', 'manager', 'sales'] },
    { name: 'Customers', icon: User, page: 'customers', roles: ['admin', 'manager', 'sales'] },
    { name: 'Sales Invoices', icon: FileText, page: 'sales', roles: ['admin', 'manager', 'sales'] },
    { name: 'Returns', icon: RotateCcw, page: 'returns', roles: ['admin', 'manager', 'sales'] },
    { name: 'Stock Movements', icon: TrendingUp, page: 'movements', roles: ['admin', 'manager'] },
    { name: 'Reports', icon: PieChart, page: 'reports', roles: ['admin', 'manager'] },
  ];

  const [navigationOrder, setNavigationOrder] = useState<NavItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadNavigationOrder();
  }, [selectedCompany?.id, user?.id]);

  const loadNavigationOrder = async () => {
    if (!user?.id || !selectedCompany?.id) {
      // If super admin with no company, show minimal navigation
      if (isSuperAdmin) {
        setNavigationOrder([]);
      } else {
        const filteredNav = allNavigation.filter(item =>
          !item.roles || item.roles.includes(userRole || 'technician')
        );
        setNavigationOrder(filteredNav);
      }
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_sidebar_preferences')
        .select('navigation_order')
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id)
        .maybeSingle();

      // Super admins see everything, otherwise filter by role
      const filteredNav = isSuperAdmin
        ? allNavigation
        : allNavigation.filter(item =>
            !item.roles || item.roles.includes(userRole || 'technician')
          );

      if (error || !data || !data.navigation_order) {
        setNavigationOrder(filteredNav);
      } else {
        const savedOrder = data.navigation_order as string[];
        const orderedNav = savedOrder
          .map(page => filteredNav.find(item => item.page === page))
          .filter(Boolean) as NavItem[];

        const newItems = filteredNav.filter(
          item => !savedOrder.includes(item.page)
        );

        setNavigationOrder([...orderedNav, ...newItems]);
      }
    } catch (err) {
      console.error('Error loading navigation order:', err);
      // Super admins see everything, otherwise filter by role
      const filteredNav = isSuperAdmin
        ? allNavigation
        : allNavigation.filter(item =>
            !item.roles || item.roles.includes(userRole || 'technician')
          );
      setNavigationOrder(filteredNav);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNavigationOrder = async (newOrder: NavItem[]) => {
    if (!user?.id || !selectedCompany?.id) return;

    const orderPages = newOrder.map(item => item.page);

    try {
      const { error } = await supabase
        .from('user_sidebar_preferences')
        .upsert({
          user_id: user.id,
          company_id: selectedCompany.id,
          navigation_order: orderPages,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,company_id'
        });

      if (error) {
        console.error('Error saving navigation order:', error);
      }
    } catch (err) {
      console.error('Error saving navigation order:', err);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setNavigationOrder((items) => {
        const oldIndex = items.findIndex(item => item.page === active.id);
        const newIndex = items.findIndex(item => item.page === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        saveNavigationOrder(newOrder);
        return newOrder;
      });
    }
  };

  const masterDataItems = [
    { name: 'Product Types', icon: Boxes, page: 'product-types' },
    { name: 'Product Type Aliases', icon: Tag, page: 'product-type-aliases' },
    { name: 'Model Normalization', icon: Tag, page: 'model-aliases' },
    { name: 'Locations', icon: MapPin, page: 'locations' },
    { name: 'Suppliers', icon: Truck, page: 'suppliers' },
    { name: 'Grades & Conditions', icon: Award, page: 'grades-conditions' },
    { name: 'Component Market Prices', icon: Tag, page: 'component-market-prices' },
    { name: 'Payment Terms', icon: CreditCard, page: 'payment-terms' },
    { name: 'Return Reasons', icon: FileWarning, page: 'return-reasons' },
    { name: 'Warranty Types', icon: ShieldCheck, page: 'warranty-types' },
    { name: 'Processing Stages', icon: Workflow, page: 'processing-stages' },
    { name: 'Import Field Mappings', icon: ArrowRight, page: 'import-field-mappings' },
    { name: 'Import Intelligence', icon: Brain, page: 'import-intelligence' },
  ];

  const organizationItems = [
    { name: 'Companies', icon: Building2, page: 'companies' },
    { name: 'Users', icon: Users, page: 'users' },
  ];

  const itadItems = [
    { name: 'ITAD Projects', icon: Building2, page: 'itad-projects' },
    { name: 'Data Sanitization', icon: Shield, page: 'data-sanitization' },
    { name: 'ITAD Certificates', icon: FileText, page: 'certificates' },
    { name: 'Environmental Compliance', icon: Leaf, page: 'environmental-compliance' },
  ];

  const isAdmin = isSuperAdmin || selectedCompany?.role === 'admin';
  const isManagerOrAbove = isSuperAdmin || selectedCompany?.role === 'admin' || selectedCompany?.role === 'manager';

  const filteredOrganizationItems = organizationItems.filter(item => {
    if (item.page === 'users' && !isAdmin) return false;
    if (item.page === 'companies' && !isManagerOrAbove) return false;
    return true;
  });

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 flex flex-col h-screen transition-all duration-300`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            {!isCollapsed && <div>
              <h1 className="text-xl font-bold text-gray-900">Stock Pro</h1>
              <p className="text-xs text-gray-500">Smart Inventory & Billing</p>
            </div>}
          </div>
          <button
            onClick={onToggle}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            {isCollapsed ? <Menu className="w-5 h-5 text-gray-600" /> : <X className="w-5 h-5 text-gray-600" />}
          </button>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={navigationOrder.map(item => item.page)}
              strategy={verticalListSortingStrategy}
            >
              {navigationOrder.map((item) => {
                const isActive = currentPage === item.page;
                return (
                  <SortableNavItem
                    key={item.page}
                    item={item}
                    isActive={isActive}
                    onNavigate={onNavigate}
                    isCollapsed={isCollapsed}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        )}

        {(isManagerOrAbove || isSuperAdmin) && !isCollapsed && (
          <div className="pt-2 mt-2 border-t border-gray-200" ref={settingsRef}>
            <button
              onClick={() => setSettingsExpanded(!settingsExpanded)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              <Settings className="w-5 h-5 text-gray-400" />
              <span className="font-medium flex-1 text-left">Settings</span>
              {settingsExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </button>

          {settingsExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              <button
                onClick={() => setMasterDataExpanded(!masterDataExpanded)}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                <Database className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium flex-1 text-left">Master Data</span>
                {masterDataExpanded ? (
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                )}
              </button>

              {masterDataExpanded && (
                <div className="ml-4 space-y-1" ref={masterDataRef}>
                  {masterDataItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.page;

                    return (
                      <button
                        key={item.name}
                        onClick={() => onNavigate(item.page)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                          isActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className="text-sm font-medium">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => setOrganizationExpanded(!organizationExpanded)}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium flex-1 text-left">Organization</span>
                {organizationExpanded ? (
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                )}
              </button>

              {organizationExpanded && (
                <div className="ml-4 space-y-1" ref={organizationRef}>
                  {filteredOrganizationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.page;

                    return (
                      <button
                        key={item.name}
                        onClick={() => onNavigate(item.page)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                          isActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className="text-sm font-medium">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => setItadExpanded(!itadExpanded)}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                <Shield className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium flex-1 text-left">ITAD Compliance</span>
                {itadExpanded ? (
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                )}
              </button>

              {itadExpanded && (
                <div className="ml-4 space-y-1" ref={itadRef}>
                  {itadItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.page;

                    return (
                      <button
                        key={item.name}
                        onClick={() => onNavigate(item.page)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                          isActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className="text-sm font-medium">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-700 transition"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Sign Out</span>}
        </button>
      </div>
    </div>
  );
}
