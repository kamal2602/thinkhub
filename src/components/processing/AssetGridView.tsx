import { Package, Copy } from 'lucide-react';
import { IntakeTypeBadge } from '../common/IntakeTypeBadge';

interface Asset {
  id: string;
  serial_number: string;
  imei: string;
  brand: string;
  model: string;
  cosmetic_grade: string;
  functional_status: string;
  refurbishment_status: string;
  status: string;
  purchase_price: number;
  refurbishment_cost: number;
  selling_price: number;
  created_at: string;
  intake_type?: 'resale' | 'itad' | 'recycling';
  product_types?: {
    name: string;
  };
  locations?: {
    name: string;
  };
}

interface AssetGridViewProps {
  assets: Asset[];
  selectedAssets: Set<string>;
  onToggleSelection: (id: string) => void;
  onOpenDetails: (asset: Asset) => void;
  onClone: (asset: Asset) => void;
  getStatusBadgeColor: (status: string) => string;
  getGradeBadgeColor: (grade: string) => string;
  getGradeBadgeStyle: (grade: string) => { backgroundColor: string };
  getStatusBadgeStyle: (status: string) => { backgroundColor: string };
}

export function AssetGridView({
  assets,
  selectedAssets,
  onToggleSelection,
  onOpenDetails,
  onClone,
  getStatusBadgeColor,
  getGradeBadgeColor,
  getGradeBadgeStyle,
  getStatusBadgeStyle,
}: AssetGridViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {assets.map((asset) => (
        <div
          key={asset.id}
          className={`bg-white rounded-lg border-2 transition-all hover:shadow-lg cursor-pointer ${
            selectedAssets.has(asset.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
          }`}
        >
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="checkbox"
                  checked={selectedAssets.has(asset.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleSelection(asset.id);
                  }}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0" onClick={() => onOpenDetails(asset)}>
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <h3 className="font-semibold text-gray-900 truncate">
                      {asset.brand} {asset.model}
                    </h3>
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClone(asset);
                }}
                className="p-1 text-gray-400 hover:text-blue-600 transition"
                title="Clone asset"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2" onClick={() => onOpenDetails(asset)}>
              <div className="text-sm">
                <span className="text-gray-600">Serial: </span>
                <span className="font-mono text-gray-900">{asset.serial_number}</span>
              </div>

              {asset.imei && (
                <div className="text-sm">
                  <span className="text-gray-600">IMEI: </span>
                  <span className="font-mono text-gray-900">{asset.imei}</span>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {asset.intake_type && (
                  <IntakeTypeBadge type={asset.intake_type} size="sm" />
                )}
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(asset.status)}`}
                  style={getStatusBadgeStyle(asset.status)}
                >
                  {asset.status}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getGradeBadgeColor(asset.cosmetic_grade)}`}
                  style={getGradeBadgeStyle(asset.cosmetic_grade)}
                >
                  {asset.cosmetic_grade}
                </span>
              </div>

              {asset.product_types && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Type:</span> {asset.product_types.name}
                </div>
              )}

              {asset.locations && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Location:</span> {asset.locations.name}
                </div>
              )}

              <div className="pt-2 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Purchase:</span>
                  <span className="font-semibold text-gray-900">${asset.purchase_price?.toFixed(2) || '0.00'}</span>
                </div>
                {asset.selling_price > 0 && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Selling:</span>
                    <span className="font-semibold text-green-600">${asset.selling_price.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {assets.length === 0 && (
        <div className="col-span-full text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No assets found</p>
        </div>
      )}
    </div>
  );
}
