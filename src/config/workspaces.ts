import {
  Home,
  Wrench,
  DollarSign,
  Shield,
  Recycle,
  Gavel,
  Users,
  Globe,
  Calculator,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { EngineToggles } from '../services/engineService';

export interface PageConfig {
  name: string;
  page: string;
  requiredRoles?: string[];
  requiredEngine?: keyof EngineToggles;
}

export interface ModuleConfig {
  id: string;
  name: string;
  pages: PageConfig[];
}

export interface WorkspaceConfig {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  requiredEngine?: keyof EngineToggles;
  requiredRoles?: string[];
  modules?: ModuleConfig[];
  pages?: PageConfig[];
}

export const WORKSPACES: WorkspaceConfig[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: Home,
    color: 'blue',
    pages: [
      { name: 'Dashboard', page: 'dashboard' },
    ],
  },
  {
    id: 'operations',
    name: 'Operations',
    icon: Wrench,
    color: 'blue',
    requiredRoles: ['admin', 'manager', 'technician', 'staff'],
    modules: [
      {
        id: 'purchasing',
        name: 'Purchasing',
        pages: [
          { name: 'Purchase Orders', page: 'purchases', requiredRoles: ['admin', 'manager'] },
          { name: 'Receiving', page: 'smart-receiving', requiredRoles: ['admin', 'manager', 'staff'] },
          { name: 'Purchase Lots', page: 'purchase-lots', requiredRoles: ['admin', 'manager'] },
          { name: 'Suppliers', page: 'suppliers', requiredRoles: ['admin', 'manager'] },
        ],
      },
      {
        id: 'processing',
        name: 'Asset Processing',
        pages: [
          { name: 'Assets', page: 'processing' },
          { name: 'Bulk Update', page: 'asset-bulk-update', requiredRoles: ['admin', 'manager'] },
        ],
      },
      {
        id: 'inventory',
        name: 'Inventory',
        pages: [
          { name: 'Saleable Inventory', page: 'saleable-inventory' },
          { name: 'Stock Levels', page: 'inventory' },
          { name: 'Stock Movements', page: 'movements', requiredRoles: ['admin', 'manager'] },
          { name: 'Locations', page: 'locations', requiredRoles: ['admin', 'manager'] },
        ],
      },
    ],
  },
  {
    id: 'sales',
    name: 'Sales',
    icon: DollarSign,
    color: 'emerald',
    requiredRoles: ['admin', 'manager', 'sales', 'staff'],
    modules: [
      {
        id: 'direct-sales',
        name: 'Direct Sales',
        pages: [
          { name: 'Sales Catalog', page: 'sales-catalog' },
          { name: 'Sales Invoices', page: 'sales' },
          { name: 'Customers', page: 'customers' },
          { name: 'Returns & Repairs', page: 'returns' },
        ],
      },
    ],
  },
  {
    id: 'itad',
    name: 'ITAD',
    icon: Shield,
    color: 'red',
    requiredEngine: 'itad_enabled',
    requiredRoles: ['admin', 'manager', 'staff'],
    modules: [
      {
        id: 'itad-projects',
        name: 'Project Management',
        pages: [
          { name: 'ITAD Projects', page: 'itad-projects', requiredEngine: 'itad_enabled' },
        ],
      },
      {
        id: 'itad-compliance',
        name: 'Compliance',
        pages: [
          { name: 'Data Sanitization', page: 'data-sanitization', requiredEngine: 'itad_enabled' },
          { name: 'Certificates', page: 'certificates', requiredEngine: 'itad_enabled' },
          { name: 'Environmental', page: 'environmental-compliance', requiredEngine: 'itad_enabled' },
          { name: 'ITAD Compliance', page: 'itad-compliance', requiredEngine: 'itad_enabled' },
          { name: 'Company Certifications', page: 'company-certifications', requiredRoles: ['admin'], requiredEngine: 'itad_enabled' },
        ],
      },
      {
        id: 'itad-revenue',
        name: 'Revenue Settlement',
        pages: [
          { name: 'Revenue Settlements', page: 'itad-revenue-settlements', requiredEngine: 'itad_enabled' },
          { name: 'Downstream Vendors', page: 'downstream-vendors', requiredEngine: 'itad_enabled' },
        ],
      },
    ],
  },
  {
    id: 'recycling',
    name: 'Recycling',
    icon: Recycle,
    color: 'green',
    requiredEngine: 'recycling_enabled',
    requiredRoles: ['admin', 'manager', 'technician', 'staff'],
    modules: [
      {
        id: 'harvesting',
        name: 'Component Harvesting',
        pages: [
          { name: 'Harvested Inventory', page: 'harvested-components', requiredEngine: 'recycling_enabled' },
          { name: 'Component Sales', page: 'component-sales', requiredEngine: 'recycling_enabled' },
          { name: 'Component Prices', page: 'component-market-prices', requiredRoles: ['admin', 'manager'], requiredEngine: 'recycling_enabled' },
        ],
      },
    ],
  },
  {
    id: 'auctions',
    name: 'Auctions',
    icon: Gavel,
    color: 'yellow',
    requiredEngine: 'auction_enabled',
    requiredRoles: ['admin', 'manager', 'staff'],
    pages: [
      { name: 'Auctions', page: 'auctions', requiredEngine: 'auction_enabled' },
    ],
  },
  {
    id: 'crm',
    name: 'CRM',
    icon: Users,
    color: 'pink',
    requiredEngine: 'crm_enabled',
    requiredRoles: ['admin', 'manager', 'sales'],
    pages: [
      { name: 'CRM Dashboard', page: 'crm' },
    ],
  },
  {
    id: 'website',
    name: 'Website',
    icon: Globe,
    color: 'teal',
    requiredEngine: 'website_enabled',
    requiredRoles: ['admin', 'manager'],
    pages: [
      { name: 'Website Dashboard', page: 'website' },
    ],
  },
  {
    id: 'finance',
    name: 'Finance',
    icon: Calculator,
    color: 'green',
    requiredRoles: ['admin', 'manager'],
    modules: [
      {
        id: 'accounting',
        name: 'Accounting',
        pages: [
          { name: 'Chart of Accounts', page: 'chart-of-accounts' },
          { name: 'Journal Entries', page: 'journal-entries' },
        ],
      },
    ],
  },
  {
    id: 'reports',
    name: 'Reports',
    icon: BarChart3,
    color: 'violet',
    requiredRoles: ['admin', 'manager'],
    pages: [
      { name: 'Analytics', page: 'reports' },
    ],
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: Settings,
    color: 'slate',
    requiredRoles: ['admin', 'manager'],
    modules: [
      {
        id: 'system',
        name: 'System',
        pages: [
          { name: 'Engine Toggles', page: 'engine-toggles', requiredRoles: ['admin'] },
          { name: 'Product Setup', page: 'product-setup' },
          { name: 'Business Rules', page: 'business-rules' },
          { name: 'System Config', page: 'system-config', requiredRoles: ['admin'] },
        ],
      },
      {
        id: 'master-data',
        name: 'Master Data',
        pages: [
          { name: 'Product Types', page: 'product-types' },
          { name: 'Processing Stages', page: 'processing-stages' },
          { name: 'Grades & Conditions', page: 'grades-conditions' },
          { name: 'Payment Terms', page: 'payment-terms' },
          { name: 'Return Reasons', page: 'return-reasons' },
          { name: 'Warranty Types', page: 'warranty-types' },
        ],
      },
      {
        id: 'import-intelligence',
        name: 'Import Intelligence',
        pages: [
          { name: 'Field Mappings', page: 'import-field-mappings' },
          { name: 'Import Intelligence', page: 'import-intelligence' },
          { name: 'Model Aliases', page: 'model-aliases' },
          { name: 'Product Type Aliases', page: 'product-type-aliases' },
        ],
      },
    ],
  },
  {
    id: 'account',
    name: 'Account',
    icon: Users,
    color: 'gray',
    requiredRoles: ['admin', 'manager'],
    pages: [
      { name: 'Companies', page: 'companies' },
      { name: 'Users', page: 'users', requiredRoles: ['admin'] },
    ],
  },
];

/**
 * Get all pages from a workspace (flattened)
 */
export function getWorkspacePages(workspace: WorkspaceConfig): PageConfig[] {
  const pages: PageConfig[] = [];

  if (workspace.pages) {
    pages.push(...workspace.pages);
  }

  if (workspace.modules) {
    workspace.modules.forEach((module) => {
      pages.push(...module.pages);
    });
  }

  return pages;
}

/**
 * Find which workspace a page belongs to
 */
export function findWorkspaceForPage(pageName: string): WorkspaceConfig | null {
  for (const workspace of WORKSPACES) {
    const pages = getWorkspacePages(workspace);
    if (pages.some((p) => p.page === pageName)) {
      return workspace;
    }
  }
  return null;
}

/**
 * Get workspaces that should be enabled based on engine configuration
 */
export function getWorkspacesForEngine(engine: keyof EngineToggles): string[] {
  return WORKSPACES
    .filter((ws) => ws.requiredEngine === engine)
    .map((ws) => ws.name);
}
