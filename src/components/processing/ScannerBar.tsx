interface ScannerBarProps {
  onScan?: (value: string) => void;
  onAssetScanned?: () => Promise<void>;
  onAssetOpened?: (assetId: any) => Promise<void>;
  [key: string]: any;
}

export function ScannerBar({ onScan, onAssetScanned }: ScannerBarProps) {
  return (
    <div className="bg-white p-4 border-b border-gray-200">
      <input
        type="text"
        placeholder="Scan barcode..."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (onScan) {
              onScan((e.target as HTMLInputElement).value);
            }
            if (onAssetScanned) {
              onAssetScanned();
            }
            (e.target as HTMLInputElement).value = '';
          }
        }}
      />
    </div>
  );
}
