import { lazy, LazyExoticComponent, ComponentType } from 'react';

export const ENGINE_COMPONENT_MAP: Record<string, LazyExoticComponent<ComponentType<any>>> = {
  'inventory': lazy(() => import('../components/inventory/Inventory').then(m => ({ default: m.Inventory }))),
  'processing': lazy(() => import('../components/processing/Processing').then(m => ({ default: m.Processing }))),
  'receiving': lazy(() => import('../components/receiving/SmartReceivingWorkflow').then(m => ({ default: m.SmartReceivingWorkflow }))),
  'lots': lazy(() => import('../components/purchase-lots/PurchaseLots').then(m => ({ default: m.PurchaseLots }))),
  'recycling': lazy(() => import('../components/recycling/RecyclingWorkspace').then(m => ({ default: m.RecyclingWorkspace }))),
  'repairs': lazy(() => import('../components/repairs/Repairs').then(m => ({ default: m.Repairs }))),

  'auction': lazy(() => import('../components/auctions/AuctionManagement').then(m => ({ default: m.AuctionManagement }))),
  'reseller': lazy(() => import('../components/sales/ResaleWorkspace').then(m => ({ default: m.ResaleWorkspace }))),
  'website': lazy(() => import('../components/website/WebsiteDashboard').then(m => ({ default: m.WebsiteDashboard }))),

  'crm': lazy(() => import('../components/crm/CRMWorkspace').then(m => ({ default: m.CRMWorkspace }))),
  'accounting': lazy(() => import('../components/accounting/ChartOfAccounts').then(m => ({ default: m.ChartOfAccounts }))),
  'itad': lazy(() => import('../components/itad/ITADWorkspace').then(m => ({ default: m.ITADWorkspace }))),
  'esg': lazy(() => import('../components/esg/ESGDashboard').then(m => ({ default: m.ESGDashboard }))),
  'contacts': lazy(() => import('../components/contacts/ContactsDirectory').then(m => ({ default: m.ContactsDirectory }))),
  'orders': lazy(() => import('../components/purchases/PurchaseOrders').then(m => ({ default: m.PurchaseOrders }))),
  'invoices': lazy(() => import('../components/sales/SalesInvoices').then(m => ({ default: m.SalesInvoices }))),
  'payments': lazy(() => import('../components/finance/Page_Payments').then(m => ({ default: m.Page_Payments }))),

  'reports': lazy(() => import('../components/reports/Reports').then(m => ({ default: m.Reports }))),
  'users': lazy(() => import('../components/users/Users').then(m => ({ default: m.Users }))),

  'apps': lazy(() => import('../components/apps/AppsInstaller').then(m => ({ default: m.AppsInstaller }))),
  'settings': lazy(() => import('../components/settings/SystemConfig').then(m => ({ default: m.SystemConfig }))),
  'company': lazy(() => import('../components/companies/Companies').then(m => ({ default: m.Companies }))),
  'automation': lazy(() => import('../components/system/Page_Apps_Management').then(m => ({ default: m.Page_Apps_Management }))),

  // Legacy aliases for backward compatibility
  'parties': lazy(() => import('../components/contacts/ContactsDirectory').then(m => ({ default: m.ContactsDirectory }))),
};

export function hasEngineComponent(engineKey: string): boolean {
  return engineKey in ENGINE_COMPONENT_MAP;
}

export function getEngineComponent(engineKey: string): LazyExoticComponent<ComponentType<any>> | null {
  return ENGINE_COMPONENT_MAP[engineKey] || null;
}
