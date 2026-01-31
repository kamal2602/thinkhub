import { useState, useEffect } from 'react';
import { Clock, User, DollarSign, AlertCircle, Edit2, Eye, Copy, Trash2, ArrowRight, CheckCircle2, Flag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface Asset {
  id: string;
  serial_number: string;
  brand: string;
  model: string;
  cosmetic_grade: string;
  functional_status: string;
  status: string;
  refurbishment_cost: number;
  purchase_price: number;
  assigned_technician_id: string | null;
  stage_started_at: string;
  is_priority: boolean;
  processing_notes?: string;
  cpu?: string;
  ram?: string;
  storage?: string;
  product_types?: {
    name: string;
  };
  profiles?: {
    full_name: string;
  };
}

interface ProcessingKanbanProps {
  assets: Asset[];
  onAssetClick: (asset: Asset) => void;
  onStageChange: (assetId: string, newStage: string) => void;
  gradeColors: Record<string, string>;
  stages?: ProcessingStage[];
  onEdit?: (asset: Asset) => void;
  onClone?: (asset: Asset) => void;
  onDelete?: (assetId: string) => void;
  onTogglePriority?: (assetId: string, isPriority: boolean) => void;
}

interface ProcessingStage {
  id: string;
  stage_name: string;
  stage_key: string;
  stage_order: number;
  stage_color: string;
  stage_type: string;
  description: string;
}

const getStageColorClasses = (color: string) => {
  const colorMap: Record<string, { bg: string; border: string; header: string }> = {
    gray: { bg: 'bg-gray-50', border: 'border-gray-200', header: 'bg-gray-100 text-gray-700' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', header: 'bg-blue-100 text-blue-700' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', header: 'bg-yellow-100 text-yellow-700' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', header: 'bg-orange-100 text-orange-700' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', header: 'bg-purple-100 text-purple-700' },
    teal: { bg: 'bg-teal-50', border: 'border-teal-200', header: 'bg-teal-100 text-teal-700' },
    green: { bg: 'bg-green-50', border: 'border-green-200', header: 'bg-green-100 text-green-700' },
    red: { bg: 'bg-red-50', border: 'border-red-200', header: 'bg-red-100 text-red-700' },
  };
  return colorMap[color] || colorMap.gray;
};

export function ProcessingKanban({ assets, onAssetClick, onStageChange, gradeColors, stages: propStages, onEdit, onClone, onDelete, onTogglePriority }: ProcessingKanbanProps) {
  const [draggedAsset, setDraggedAsset] = useState<Asset | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const toast = useToast();

  const stages = propStages || [];

  const getAssetsByStage = (stage: string) => {
    const filtered = assets.filter(asset => {
      const assetStage = asset.status || 'received';
      return assetStage === stage;
    });
    return filtered;
  };

  const getDaysInStage = (startedAt: string | null) => {
    if (!startedAt) return 0;
    const start = new Date(startedAt);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const getTotalCost = (asset: Asset) => {
    return (asset.purchase_price || 0) + (asset.refurbishment_cost || 0);
  };

  const handleDragStart = (e: React.DragEvent, asset: Asset) => {
    setDraggedAsset(asset);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedAsset(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverStage(null);

    if (draggedAsset && draggedAsset.status !== stageId) {
      onStageChange(draggedAsset.id, stageId);
    }
    setDraggedAsset(null);
  };

  if (stages.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-500">No processing stages configured</div>;
  }

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {stages.map(stage => {
        const colorClasses = getStageColorClasses(stage.stage_color);
        const stageAssets = getAssetsByStage(stage.stage_key);
        const totalValue = stageAssets.reduce((sum, a) => sum + getTotalCost(a), 0);
        const isDragOver = dragOverStage === stage.stage_key;

        return (
          <div
            key={stage.id}
            className="flex-shrink-0 w-80 flex flex-col"
            onDragOver={(e) => handleDragOver(e, stage.stage_key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.stage_key)}
          >
            <div className={`${colorClasses.header} px-4 py-3 rounded-t-lg border-b-2 border-opacity-50`}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-sm">{stage.stage_name}</h3>
                <span className="bg-white bg-opacity-60 px-2 py-0.5 rounded-full text-xs font-medium">
                  {stageAssets.length}
                </span>
              </div>
              {stage.description && <p className="text-xs opacity-75">{stage.description}</p>}
              {totalValue > 0 && (
                <p className="text-xs mt-1 font-medium">
                  ${totalValue.toLocaleString()}
                </p>
              )}
            </div>

            <div
              className={`${colorClasses.bg} ${colorClasses.border} ${isDragOver ? 'ring-2 ring-blue-400 bg-blue-50' : ''} border-l border-r border-b rounded-b-lg flex-1 overflow-y-auto p-3 space-y-3 min-h-[600px] transition-all`}
            >
              {stageAssets.map(asset => {
                const daysInStage = getDaysInStage(asset.stage_started_at);
                const isStale = daysInStage > 7;
                const isDragging = draggedAsset?.id === asset.id;

                return (
                  <div
                    key={asset.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, asset)}
                    onDragEnd={handleDragEnd}
                    onMouseEnter={() => setHoveredCard(asset.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    className={`bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-move hover:shadow-lg transition-all relative group ${isDragging ? 'opacity-50 scale-95' : ''}`}
                  >
                    {asset.is_priority && (
                      <div className="flex items-center gap-1 text-red-600 text-xs font-medium mb-2">
                        <AlertCircle className="w-3 h-3" />
                        <span>PRIORITY</span>
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0" onClick={() => !isDragging && onAssetClick(asset)}>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {asset.cosmetic_grade && (
                            <span
                              className="px-2 py-0.5 rounded text-xs font-medium text-white"
                              style={{ backgroundColor: gradeColors[asset.cosmetic_grade] || '#6B7280' }}
                            >
                              {asset.cosmetic_grade}
                            </span>
                          )}
                          {asset.product_types && (
                            <span className="text-xs text-gray-500">
                              {asset.product_types.name}
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-sm text-gray-900 truncate">
                          {asset.brand} {asset.model}
                        </h4>
                        <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">
                          {asset.serial_number}
                        </p>
                      </div>
                    </div>

                    {(asset.cpu || asset.ram || asset.storage) && (
                      <div className="mb-2 pb-2 border-b border-gray-100">
                        <div className="flex flex-wrap gap-1 text-xs text-gray-600">
                          {asset.cpu && <span className="bg-gray-100 px-2 py-0.5 rounded">{asset.cpu}</span>}
                          {asset.ram && <span className="bg-gray-100 px-2 py-0.5 rounded">{asset.ram}</span>}
                          {asset.storage && <span className="bg-gray-100 px-2 py-0.5 rounded">{asset.storage}</span>}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {asset.profiles && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <User className="w-3 h-3" />
                          <span className="truncate">{asset.profiles.full_name}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <DollarSign className="w-3 h-3" />
                        <span>Cost: ${getTotalCost(asset).toLocaleString()}</span>
                      </div>

                      <div className={`flex items-center gap-1.5 text-xs ${isStale ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        <Clock className="w-3 h-3" />
                        <span>{daysInStage} {daysInStage === 1 ? 'day' : 'days'}</span>
                        {isStale && <span className="text-xs">(Stale)</span>}
                      </div>
                    </div>

                    {asset.functional_status && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500 truncate block">
                          {asset.functional_status}
                        </span>
                      </div>
                    )}

                    {asset.processing_notes && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-600 line-clamp-2">{asset.processing_notes}</p>
                      </div>
                    )}

                    {hoveredCard === asset.id && (
                      <div className="absolute top-2 right-2 flex gap-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAssetClick(asset);
                          }}
                          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded transition"
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {onEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(asset);
                            }}
                            className="p-1.5 hover:bg-green-50 text-green-600 rounded transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onTogglePriority && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePriority(asset.id, !asset.is_priority);
                            }}
                            className={`p-1.5 hover:bg-red-50 rounded transition ${asset.is_priority ? 'text-red-600' : 'text-gray-400'}`}
                            title={asset.is_priority ? 'Remove priority' : 'Mark as priority'}
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onClone && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onClone(asset);
                            }}
                            className="p-1.5 hover:bg-gray-50 text-gray-600 rounded transition"
                            title="Clone"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {stageAssets.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-sm">No items</p>
                  {isDragOver && (
                    <p className="text-xs mt-2 text-blue-600 font-medium">Drop here</p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
