interface AssetComponentsProps {
  assetId: string;
  companyId?: string;
  serialNumber?: string;
  [key: string]: any;
}

export function AssetComponents({ assetId }: AssetComponentsProps) {
  return (
    <div className="p-4">
      <h3 className="font-bold mb-2">Asset Components</h3>
      <p className="text-gray-600">Components for asset {assetId}</p>
    </div>
  );
}
