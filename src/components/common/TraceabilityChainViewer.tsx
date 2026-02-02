import React, { useEffect, useState } from 'react';
import { Package, Users, FileText, Leaf, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import { traceabilityService, TraceabilityChain, TraceabilityNode } from '../../services/traceabilityService';

interface TraceabilityChainViewerProps {
  entityType: 'inventory_item' | 'party' | 'sales_order';
  entityId: string;
}

export function TraceabilityChainViewer({ entityType, entityId }: TraceabilityChainViewerProps) {
  const [chain, setChain] = useState<TraceabilityChain | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadChain();
  }, [entityType, entityId]);

  const loadChain = async () => {
    setLoading(true);
    try {
      const data = await traceabilityService.getFullTraceability(entityType, entityId);
      setChain(data);

      const allNodeIds = new Set(data.nodes.map(n => n.id));
      setExpandedNodes(allNodeIds);
    } catch (error) {
      console.error('Failed to load traceability chain:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'party':
        return Users;
      case 'inventory':
        return Package;
      case 'order':
        return FileText;
      case 'invoice':
        return FileText;
      case 'esg_event':
        return Leaf;
      case 'movement':
        return ArrowRight;
      default:
        return Package;
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'party':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'inventory':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'order':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'invoice':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'esg_event':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'movement':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return '';

    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
      case 'paid':
      case 'available':
        return 'bg-green-100 text-green-700';
      case 'pending':
      case 'draft':
        return 'bg-yellow-100 text-yellow-700';
      case 'cancelled':
      case 'void':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const buildHierarchy = () => {
    if (!chain) return [];

    const nodeMap = new Map(chain.nodes.map(n => [n.id, n]));
    const childrenMap = new Map<string, string[]>();

    chain.relationships.forEach(rel => {
      const children = childrenMap.get(rel.from) || [];
      children.push(rel.to);
      childrenMap.set(rel.from, children);
    });

    const rootNodes = chain.nodes.filter(node =>
      !chain.relationships.some(rel => rel.to === node.id)
    );

    return rootNodes.map(root => ({
      node: root,
      children: buildNodeTree(root.id, childrenMap, nodeMap)
    }));
  };

  const buildNodeTree = (
    nodeId: string,
    childrenMap: Map<string, string[]>,
    nodeMap: Map<string, TraceabilityNode>
  ): any[] => {
    const childIds = childrenMap.get(nodeId) || [];
    return childIds
      .map(childId => {
        const childNode = nodeMap.get(childId);
        if (!childNode) return null;
        return {
          node: childNode,
          children: buildNodeTree(childId, childrenMap, nodeMap)
        };
      })
      .filter(Boolean);
  };

  const renderNode = (item: { node: TraceabilityNode; children: any[] }, level: number = 0) => {
    const Icon = getNodeIcon(item.node.type);
    const isExpanded = expandedNodes.has(item.node.id);
    const hasChildren = item.children.length > 0;

    return (
      <div key={item.node.id} className="space-y-2">
        <div
          className={`flex items-start space-x-3 p-4 rounded-lg border-2 ${getNodeColor(item.node.type)} ${
            hasChildren ? 'cursor-pointer hover:shadow-md' : ''
          } transition-shadow`}
          style={{ marginLeft: `${level * 2}rem` }}
          onClick={() => hasChildren && toggleNode(item.node.id)}
        >
          {hasChildren && (
            <button className="mt-1">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}

          <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{item.node.label}</h4>
              {item.node.status && (
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(item.node.status)}`}>
                  {item.node.status}
                </span>
              )}
            </div>

            <p className="text-sm opacity-75 mt-1">
              {item.node.type.replace('_', ' ')} • {new Date(item.node.timestamp).toLocaleDateString()}
            </p>

            {item.node.data && (
              <div className="mt-2 text-xs space-y-1 opacity-75">
                {Object.entries(item.node.data)
                  .filter(([key]) => !['id', 'company_id', 'created_at', 'updated_at', 'metadata'].includes(key))
                  .slice(0, 3)
                  .map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium">{key}:</span> {String(value).substring(0, 50)}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {isExpanded && item.children.length > 0 && (
          <div className="space-y-2">
            {item.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading traceability chain...</p>
      </div>
    );
  }

  if (!chain || chain.nodes.length === 0) {
    return (
      <div className="p-8 text-center">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No traceability data available</p>
      </div>
    );
  }

  const hierarchy = buildHierarchy();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Traceability Chain</h2>
          <p className="text-gray-600 mt-1">
            {chain.nodes.length} nodes • {chain.relationships.length} relationships
          </p>
        </div>

        <button
          onClick={() => setExpandedNodes(
            expandedNodes.size === chain.nodes.length
              ? new Set()
              : new Set(chain.nodes.map(n => n.id))
          )}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {expandedNodes.size === chain.nodes.length ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      <div className="space-y-4">
        {hierarchy.map(item => renderNode(item))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <Users className="w-6 h-6 text-blue-600 mb-2" />
          <div className="text-sm text-gray-600">Contacts</div>
          <div className="text-2xl font-bold text-gray-900">
            {chain.nodes.filter(n => n.type === 'party').length}
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <Package className="w-6 h-6 text-green-600 mb-2" />
          <div className="text-sm text-gray-600">Inventory</div>
          <div className="text-2xl font-bold text-gray-900">
            {chain.nodes.filter(n => n.type === 'inventory').length}
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <FileText className="w-6 h-6 text-purple-600 mb-2" />
          <div className="text-sm text-gray-600">Orders</div>
          <div className="text-2xl font-bold text-gray-900">
            {chain.nodes.filter(n => n.type === 'order').length}
          </div>
        </div>
        <div className="bg-emerald-50 p-4 rounded-lg">
          <Leaf className="w-6 h-6 text-emerald-600 mb-2" />
          <div className="text-sm text-gray-600">ESG Events</div>
          <div className="text-2xl font-bold text-gray-900">
            {chain.nodes.filter(n => n.type === 'esg_event').length}
          </div>
        </div>
      </div>
    </div>
  );
}
