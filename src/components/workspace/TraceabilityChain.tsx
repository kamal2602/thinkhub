import React from 'react';
import { ChevronRight, Package, Archive, Gavel, FileText, Receipt } from 'lucide-react';
import { Badge } from '../ui/Badge';

export interface ChainNode {
  id: string;
  type: 'purchase_lot' | 'inventory' | 'auction' | 'sales_order' | 'invoice';
  label: string;
  subtitle?: string;
  value?: string;
  status?: string;
  onClick?: () => void;
}

export interface TraceabilityChainProps {
  nodes: ChainNode[];
  currentNodeId?: string;
  showValues?: boolean;
  orientation?: 'vertical' | 'horizontal';
}

const nodeIcons = {
  purchase_lot: Package,
  inventory: Archive,
  auction: Gavel,
  sales_order: FileText,
  invoice: Receipt,
};

const nodeColors = {
  purchase_lot: 'bg-blue-100 text-blue-700',
  inventory: 'bg-green-100 text-green-700',
  auction: 'bg-purple-100 text-purple-700',
  sales_order: 'bg-orange-100 text-orange-700',
  invoice: 'bg-red-100 text-red-700',
};

const nodeLabels = {
  purchase_lot: 'Purchase Lot',
  inventory: 'Inventory',
  auction: 'Auction',
  sales_order: 'Sales Order',
  invoice: 'Invoice',
};

export function TraceabilityChain({
  nodes,
  currentNodeId,
  showValues = true,
  orientation = 'vertical',
}: TraceabilityChainProps) {
  if (nodes.length === 0) {
    return (
      <div className="text-sm text-secondary text-center py-4">
        No traceability data available
      </div>
    );
  }

  if (orientation === 'horizontal') {
    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {nodes.map((node, index) => {
          const Icon = nodeIcons[node.type];
          const isCurrent = node.id === currentNodeId;

          return (
            <React.Fragment key={node.id}>
              <div
                className={`
                  flex items-center gap-3 px-4 py-2 rounded-lg border-2 transition-all
                  ${isCurrent
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-neutral-200 bg-white'
                  }
                  ${node.onClick ? 'cursor-pointer hover:border-primary-300' : ''}
                `}
                onClick={node.onClick}
              >
                <div className={`p-2 rounded ${nodeColors[node.type]}`}>
                  <Icon size={16} />
                </div>
                <div className="text-sm">
                  <div className="font-medium text-primary whitespace-nowrap">
                    {node.label}
                  </div>
                  {showValues && node.value && (
                    <div className="text-xs text-secondary">{node.value}</div>
                  )}
                </div>
              </div>

              {index < nodes.length - 1 && (
                <ChevronRight size={16} className="text-neutral-400 flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {nodes.map((node, index) => {
        const Icon = nodeIcons[node.type];
        const isCurrent = node.id === currentNodeId;

        return (
          <div key={node.id}>
            <div
              className={`
                card relative transition-all
                ${isCurrent
                  ? 'ring-2 ring-primary-500 ring-offset-2'
                  : ''
                }
                ${node.onClick ? 'cursor-pointer card-hover' : ''}
              `}
              onClick={node.onClick}
            >
              {isCurrent && (
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-full bg-primary-600 rounded-r" />
              )}

              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${nodeColors[node.type]} flex-shrink-0`}>
                  <Icon size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-secondary uppercase tracking-wide">
                      {nodeLabels[node.type]}
                    </span>
                    {node.status && (
                      <Badge variant="neutral" size="sm">
                        {node.status}
                      </Badge>
                    )}
                  </div>

                  <div className="font-semibold text-primary mb-1">
                    {node.label}
                  </div>

                  {node.subtitle && (
                    <div className="text-sm text-secondary">
                      {node.subtitle}
                    </div>
                  )}

                  {showValues && node.value && (
                    <div className="text-sm font-medium text-primary mt-2">
                      {node.value}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {index < nodes.length - 1 && (
              <div className="flex justify-center py-1">
                <ChevronRight
                  size={20}
                  className="text-neutral-400 transform rotate-90"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function TraceabilitySection({
  title = 'Traceability Chain',
  nodes,
  currentNodeId,
  className = '',
}: {
  title?: string;
  nodes: ChainNode[];
  currentNodeId?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">
        {title}
      </h3>
      <TraceabilityChain
        nodes={nodes}
        currentNodeId={currentNodeId}
        orientation="vertical"
      />
    </div>
  );
}
