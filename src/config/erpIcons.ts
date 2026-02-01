import {
  Building,
  Users,
  Inbox,
  Factory,
  Cpu,
  Box,
  Layers,
  Recycle,
  Briefcase,
  Gavel,
  Globe,
  ClipboardList,
  FileText,
  CreditCard,
  Book,
  ShieldCheck,
  Leaf,
  Scale,
  FileUp,
  Award,
  Brain,
  TrendingUp,
  PieChart,
  Workflow,
  Key,
  Building2,
  Grid3x3,
  Settings,
  Wand2,
  Plug,
  Search,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react';

export interface ERPModule {
  id: string;
  icon: LucideIcon;
  label: string;
  description: string;
  category: 'operations' | 'sales' | 'business' | 'compliance' | 'platform';
  route?: string;
}

export const ERP_ICONS: Record<string, ERPModule> = {
  dashboard: {
    id: 'dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    description: 'Overview of key metrics and activities',
    category: 'platform',
    route: '/dashboard',
  },

  businessDirectory: {
    id: 'businessDirectory',
    icon: Building,
    label: 'Business Directory',
    description: 'Manage suppliers, customers, and partners',
    category: 'platform',
    route: '/parties',
  },

  customerManagement: {
    id: 'customerManagement',
    icon: Users,
    label: 'Customer Management',
    description: 'Customer relationships and accounts',
    category: 'sales',
    route: '/customers',
  },

  assetReceiving: {
    id: 'assetReceiving',
    icon: Inbox,
    label: 'Asset Receiving',
    description: 'Intake and receiving workflows',
    category: 'operations',
    route: '/receiving',
  },

  processingDismantling: {
    id: 'processingDismantling',
    icon: Factory,
    label: 'Processing & Dismantling',
    description: 'Asset processing and component extraction',
    category: 'operations',
    route: '/processing',
  },

  componentInventory: {
    id: 'componentInventory',
    icon: Cpu,
    label: 'Component Inventory',
    description: 'Harvested parts and components',
    category: 'operations',
    route: '/components',
  },

  stockValuation: {
    id: 'stockValuation',
    icon: Box,
    label: 'Stock & Valuation',
    description: 'Inventory levels and asset values',
    category: 'operations',
    route: '/inventory',
  },

  lotAssembly: {
    id: 'lotAssembly',
    icon: Layers,
    label: 'Lot Assembly',
    description: 'Purchase lots and batch tracking',
    category: 'operations',
    route: '/lots',
  },

  materialsRecovery: {
    id: 'materialsRecovery',
    icon: Recycle,
    label: 'Materials & Recovery',
    description: 'Recycling and material recovery',
    category: 'operations',
    route: '/recovery',
  },

  wholesaleSales: {
    id: 'wholesaleSales',
    icon: Briefcase,
    label: 'Wholesale Sales',
    description: 'Direct sales and bulk orders',
    category: 'sales',
    route: '/sales',
  },

  auctions: {
    id: 'auctions',
    icon: Gavel,
    label: 'Auctions',
    description: 'Auction lots and bidding',
    category: 'sales',
    route: '/auctions',
  },

  onlineStore: {
    id: 'onlineStore',
    icon: Globe,
    label: 'Online Store',
    description: 'E-commerce storefront',
    category: 'sales',
    route: '/store',
  },

  orderManagement: {
    id: 'orderManagement',
    icon: ClipboardList,
    label: 'Order Management',
    description: 'Purchase orders and fulfillment',
    category: 'business',
    route: '/orders',
  },

  billingInvoicing: {
    id: 'billingInvoicing',
    icon: FileText,
    label: 'Billing & Invoicing',
    description: 'Sales invoices and billing',
    category: 'business',
    route: '/invoices',
  },

  paymentsSettlements: {
    id: 'paymentsSettlements',
    icon: CreditCard,
    label: 'Payments & Settlements',
    description: 'Payment tracking and settlements',
    category: 'business',
    route: '/payments',
  },

  financialLedger: {
    id: 'financialLedger',
    icon: Book,
    label: 'Financial Ledger',
    description: 'Accounting and financial records',
    category: 'business',
    route: '/accounting',
  },

  complianceAudit: {
    id: 'complianceAudit',
    icon: ShieldCheck,
    label: 'Compliance & Audit Trail',
    description: 'Audit logs and compliance tracking',
    category: 'compliance',
    route: '/audit',
  },

  sustainabilityReporting: {
    id: 'sustainabilityReporting',
    icon: Leaf,
    label: 'Sustainability Reporting',
    description: 'Environmental impact and ESG metrics',
    category: 'compliance',
    route: '/esg',
  },

  regulatoryCompliance: {
    id: 'regulatoryCompliance',
    icon: Scale,
    label: 'Regulatory Compliance',
    description: 'Industry standards and regulations',
    category: 'compliance',
    route: '/compliance',
  },

  authoritySubmissions: {
    id: 'authoritySubmissions',
    icon: FileUp,
    label: 'Authority Submissions',
    description: 'Regulatory exports and submissions',
    category: 'compliance',
    route: '/exports',
  },

  complianceCertificates: {
    id: 'complianceCertificates',
    icon: Award,
    label: 'Compliance Certificates',
    description: 'Recycling and destruction certificates',
    category: 'compliance',
    route: '/certificates',
  },

  priceIntelligence: {
    id: 'priceIntelligence',
    icon: Brain,
    label: 'Price Intelligence',
    description: 'AI-powered pricing recommendations',
    category: 'platform',
    route: '/valuation',
  },

  yieldOptimization: {
    id: 'yieldOptimization',
    icon: TrendingUp,
    label: 'Yield Optimization',
    description: 'Recovery rate and profit analysis',
    category: 'platform',
    route: '/optimization',
  },

  businessIntelligence: {
    id: 'businessIntelligence',
    icon: PieChart,
    label: 'Business Intelligence',
    description: 'Reports and analytics',
    category: 'platform',
    route: '/reports',
  },

  processAutomation: {
    id: 'processAutomation',
    icon: Workflow,
    label: 'Process Automation',
    description: 'Workflows and automation rules',
    category: 'platform',
    route: '/automation',
  },

  userRoleManagement: {
    id: 'userRoleManagement',
    icon: Key,
    label: 'User & Role Management',
    description: 'Access control and permissions',
    category: 'platform',
    route: '/users',
  },

  organizationsEntities: {
    id: 'organizationsEntities',
    icon: Building2,
    label: 'Organizations & Legal Entities',
    description: 'Multi-company management',
    category: 'platform',
    route: '/companies',
  },

  appMarketplace: {
    id: 'appMarketplace',
    icon: Grid3x3,
    label: 'App Marketplace',
    description: 'Extensions and integrations',
    category: 'platform',
    route: '/apps',
  },

  systemSettings: {
    id: 'systemSettings',
    icon: Settings,
    label: 'System Settings',
    description: 'Configuration and preferences',
    category: 'platform',
    route: '/settings',
  },

  companySetup: {
    id: 'companySetup',
    icon: Wand2,
    label: 'Company Setup',
    description: 'Initial configuration wizard',
    category: 'platform',
    route: '/setup',
  },

  integrations: {
    id: 'integrations',
    icon: Plug,
    label: 'Integrations',
    description: 'Third-party connections',
    category: 'platform',
    route: '/integrations',
  },

  globalSearch: {
    id: 'globalSearch',
    icon: Search,
    label: 'Global Search',
    description: 'Search across all modules',
    category: 'platform',
  },
};

export const getCategoryModules = (category: ERPModule['category']): ERPModule[] => {
  return Object.values(ERP_ICONS).filter(module => module.category === category);
};

export const getCategoryColor = (category: ERPModule['category']): string => {
  const colors = {
    operations: 'blue',
    sales: 'amber',
    business: 'green',
    compliance: 'purple',
    platform: 'gray',
  };
  return colors[category];
};

export const getCategoryLabel = (category: ERPModule['category']): string => {
  const labels = {
    operations: 'Operations',
    sales: 'Sales Channels',
    business: 'Business',
    compliance: 'Compliance',
    platform: 'Platform',
  };
  return labels[category];
};
