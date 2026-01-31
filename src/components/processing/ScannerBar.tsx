import { useState, useRef, useEffect } from 'react';
import { Scan, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface ScannerBarProps {
  onAssetScanned: () => void;
  onAssetOpened?: (assetId: string) => void;
}

export function ScannerBar({ onAssetScanned, onAssetOpened }: ScannerBarProps) {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const toast = useToast();

  const [serialInput, setSerialInput] = useState('');
  const [internalIdInput, setInternalIdInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [waitingForInternalId, setWaitingForInternalId] = useState(false);
  const [currentAssetId, setCurrentAssetId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const serialInputRef = useRef<HTMLInputElement>(null);
  const internalIdInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (serialInputRef.current) {
      serialInputRef.current.focus();
    }
  }, []);

  const searchAsset = async (barcode: string) => {
    const searchValue = barcode.trim().toUpperCase();

    const { data: assetBySerial, error: serialError } = await supabase
      .from('assets')
      .select('id, serial_number, internal_asset_id, brand, model, status, assigned_technician_id')
      .eq('company_id', selectedCompany?.id)
      .eq('serial_number', searchValue)
      .maybeSingle();

    if (serialError) throw serialError;
    if (assetBySerial) return assetBySerial;

    const { data: internalIds, error: internalError } = await supabase
      .from('asset_internal_ids')
      .select('asset_id')
      .eq('company_id', selectedCompany?.id)
      .eq('internal_id', searchValue)
      .eq('status', 'active')
      .maybeSingle();

    if (internalError) throw internalError;

    if (internalIds) {
      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .select('id, serial_number, internal_asset_id, brand, model, status, assigned_technician_id')
        .eq('id', internalIds.asset_id)
        .maybeSingle();

      if (assetError) throw assetError;
      return asset;
    }

    return null;
  };

  const assignAndOpenAsset = async (assetId: string) => {
    const { error: updateError } = await supabase
      .from('assets')
      .update({
        assigned_technician_id: user?.id,
        status: 'refurbishing',
        stage_started_at: new Date().toISOString()
      })
      .eq('id', assetId);

    if (updateError) throw updateError;

    onAssetScanned();
    if (onAssetOpened) {
      onAssetOpened(assetId);
    }
  };

  const handleSerialScan = async (scannedValue: string) => {
    if (!scannedValue.trim() || scanning) return;

    setScanning(true);
    setStatusMessage('');

    try {
      const asset = await searchAsset(scannedValue);

      if (!asset) {
        setStatusMessage(`Asset not found: ${scannedValue}`);
        toast.error(`Asset not found: ${scannedValue}`);
        setSerialInput('');
        setScanning(false);
        return;
      }

      if (asset.internal_asset_id) {
        setStatusMessage(`Opening ${asset.brand} ${asset.model}...`);
        await assignAndOpenAsset(asset.id);

        toast.success(`Opened: ${asset.brand} ${asset.model}`);

        setSerialInput('');
        setScanning(false);

        setTimeout(() => {
          if (serialInputRef.current) {
            serialInputRef.current.focus();
          }
        }, 100);
      } else {
        setWaitingForInternalId(true);
        setCurrentAssetId(asset.id);
        setStatusMessage(`Asset found: ${asset.brand} ${asset.model}. Scan internal barcode...`);

        setTimeout(() => {
          if (internalIdInputRef.current) {
            internalIdInputRef.current.focus();
          }
        }, 100);

        setScanning(false);
      }
    } catch (error: any) {
      console.error('Scan error:', error);
      setStatusMessage('Error: ' + error.message);
      toast.error('Failed to process scan: ' + error.message);
      setSerialInput('');
      setScanning(false);
    }
  };

  const handleInternalIdScan = async (internalId: string) => {
    if (!internalId.trim() || !currentAssetId || scanning) return;

    setScanning(true);
    const internalBarcode = internalId.trim().toUpperCase();

    try {
      const { data: existingId, error: checkError } = await supabase
        .from('asset_internal_ids')
        .select('id')
        .eq('company_id', selectedCompany?.id)
        .eq('internal_id', internalBarcode)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingId) {
        setStatusMessage('This internal ID is already in use');
        toast.error('This internal ID is already in use. Try another barcode.');
        setInternalIdInput('');
        setScanning(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('asset_internal_ids')
        .insert({
          asset_id: currentAssetId,
          internal_id: internalBarcode,
          is_primary: true,
          reason: 'Initial internal ID assignment',
          status: 'active',
          company_id: selectedCompany?.id
        });

      if (insertError) throw insertError;

      await assignAndOpenAsset(currentAssetId);

      toast.success(`Linked ${internalBarcode} and opened asset`);

      setSerialInput('');
      setInternalIdInput('');
      setWaitingForInternalId(false);
      setCurrentAssetId(null);
      setStatusMessage('');
      setScanning(false);

      setTimeout(() => {
        if (serialInputRef.current) {
          serialInputRef.current.focus();
        }
      }, 100);
    } catch (error: any) {
      console.error('Internal ID link error:', error);
      setStatusMessage('Error linking ID: ' + error.message);
      toast.error('Failed to link internal ID: ' + error.message);
      setInternalIdInput('');
      setScanning(false);
    }
  };

  const handleSerialKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSerialScan(serialInput);
    }
  };

  const handleInternalIdKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInternalIdScan(internalIdInput);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              1️⃣ Scan Serial or Internal ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Scan className={`w-5 h-5 ${scanning && !waitingForInternalId ? 'text-blue-500 animate-pulse' : 'text-gray-400'}`} />
              </div>
              <input
                ref={serialInputRef}
                type="text"
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                onKeyDown={handleSerialKeyDown}
                placeholder="Scan here to start..."
                disabled={scanning || waitingForInternalId}
                className="w-full pl-10 pr-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:opacity-50 disabled:bg-gray-50"
                autoComplete="off"
                autoFocus
              />
            </div>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              2️⃣ Scan Internal Barcode {!waitingForInternalId && <span className="text-gray-400">(if needed)</span>}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {waitingForInternalId ? (
                  <ArrowRight className="w-5 h-5 text-green-500 animate-pulse" />
                ) : (
                  <Scan className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <input
                ref={internalIdInputRef}
                type="text"
                value={internalIdInput}
                onChange={(e) => setInternalIdInput(e.target.value)}
                onKeyDown={handleInternalIdKeyDown}
                placeholder={waitingForInternalId ? "Scan internal barcode now..." : "Auto-scans if needed"}
                disabled={!waitingForInternalId || scanning}
                className={`w-full pl-10 pr-4 py-3 text-lg border-2 rounded-lg transition ${
                  waitingForInternalId
                    ? 'border-green-500 bg-green-50 focus:ring-2 focus:ring-green-500'
                    : 'border-gray-300 bg-gray-50 cursor-not-allowed'
                }`}
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        {statusMessage && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">{statusMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
