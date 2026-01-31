interface Asset {
  id: string;
  [key: string]: any;
}

interface AssetGridViewProps {
  assets: Asset[];
  onAssetClick?: (asset: Asset) => void;
  onOpenDetails?: (asset: Asset) => void;
  [key: string]: any;
}

export function AssetGridView({ assets, onAssetClick, onOpenDetails }: AssetGridViewProps) {
  const handleClick = onOpenDetails || onAssetClick;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {assets.map((asset) => (
        <div
          key={asset.id}
          onClick={() => handleClick && handleClick(asset)}
          className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
        >
          <p className="font-medium">ID: {asset.id}</p>
        </div>
      ))}
    </div>
  );
}
