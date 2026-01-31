import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbsProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface BreadcrumbItem {
  label: string;
  page: string;
}

export function Breadcrumbs({ currentPage, onNavigate }: BreadcrumbsProps) {
  const pageMapping: Record<string, { label: string; parent?: string }> = {
    'dashboard': { label: 'Dashboard' },
    'processing': { label: 'Processing Dashboard' },
    'processing-stages': { label: 'Processing Stages', parent: 'processing' },
    'purchases': { label: 'Purchase Orders' },
    'smart-receiving': { label: 'Smart Receiving' },
    'suppliers': { label: 'Suppliers' },
    'saleable-inventory': { label: 'Ready to Sell' },
    'inventory': { label: 'Parts & Supplies' },
    'harvested-components': { label: 'Components' },
    'movements': { label: 'Stock Movements' },
    'locations': { label: 'Locations' },
    'sales': { label: 'Sales Invoices' },
    'component-sales': { label: 'Component Sales' },
    'customers': { label: 'Customers' },
    'returns': { label: 'Returns' },
    'itad-projects': { label: 'ITAD Projects' },
    'data-sanitization': { label: 'Data Sanitization', parent: 'itad-projects' },
    'certificates': { label: 'ITAD Certificates', parent: 'itad-projects' },
    'environmental-compliance': { label: 'Environmental Compliance', parent: 'itad-projects' },
    'reports': { label: 'Reports' },
    'product-types': { label: 'Product Types' },
    'product-type-aliases': { label: 'Product Type Aliases', parent: 'product-types' },
    'grades-conditions': { label: 'Grades & Conditions' },
    'component-market-prices': { label: 'Component Market Prices' },
    'payment-terms': { label: 'Payment Terms' },
    'return-reasons': { label: 'Return Reasons' },
    'warranty-types': { label: 'Warranty Types' },
    'import-field-mappings': { label: 'Import Field Mappings' },
    'import-intelligence': { label: 'Import Intelligence' },
    'model-aliases': { label: 'Model Normalization' },
    'companies': { label: 'Companies' },
    'users': { label: 'Users' },
  };

  const buildBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [{ label: 'Stock Pro', page: 'dashboard' }];

    const currentPageData = pageMapping[currentPage];
    if (!currentPageData) return breadcrumbs;

    if (currentPageData.parent) {
      const parentData = pageMapping[currentPageData.parent];
      if (parentData) {
        breadcrumbs.push({ label: parentData.label, page: currentPageData.parent });
      }
    }

    breadcrumbs.push({ label: currentPageData.label, page: currentPage });

    return breadcrumbs;
  };

  const breadcrumbs = buildBreadcrumbs();

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isFirst = index === 0;

          return (
            <div key={crumb.page} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
              {isFirst ? (
                <button
                  onClick={() => onNavigate(crumb.page)}
                  className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition"
                >
                  <Home className="w-4 h-4" />
                </button>
              ) : isLast ? (
                <span className="text-gray-900 font-medium">{crumb.label}</span>
              ) : (
                <button
                  onClick={() => onNavigate(crumb.page)}
                  className="text-gray-600 hover:text-blue-600 transition"
                >
                  {crumb.label}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
