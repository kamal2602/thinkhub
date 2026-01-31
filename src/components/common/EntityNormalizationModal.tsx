import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { EntityGroup, NormalizationDecision, EntityNormalizationService } from '../../lib/entityNormalization';

interface EntityNormalizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityGroups: EntityGroup[];
  companyId: string;
  onComplete: (decisions: NormalizationDecision[]) => void;
}

interface GroupDecision {
  canonicalName: string;
  action: 'create_new' | 'skip';
  saveAsAliases: boolean;
  createIntelligenceRules: boolean;
  expanded: boolean;
}

export default function EntityNormalizationModal({
  isOpen,
  onClose,
  entityGroups,
  companyId,
  onComplete,
}: EntityNormalizationModalProps) {
  const [enrichedGroups, setEnrichedGroups] = useState<EntityGroup[]>([]);
  const [groupDecisions, setGroupDecisions] = useState<Record<number, GroupDecision>>({});

  useEffect(() => {
    if (isOpen && entityGroups.length > 0) {
      enrichGroups();
    }
  }, [isOpen, entityGroups]);

  useEffect(() => {
    if (enrichedGroups.length > 0) {
      const initialDecisions: Record<number, GroupDecision> = {};
      enrichedGroups.forEach((group, index) => {
        initialDecisions[index] = {
          canonicalName: group.suggestedCanonical,
          action: 'create_new',
          saveAsAliases: true,
          createIntelligenceRules: true,
          expanded: false,
        };
      });
      setGroupDecisions(initialDecisions);
    }
  }, [enrichedGroups]);

  const enrichGroups = async () => {
    const service = new EntityNormalizationService(companyId);
    const enriched = await Promise.all(
      entityGroups.map(async (group) => {
        const matches = await service.checkExistingEntities(group.field, group.variants);
        return { ...group, existingMatches: matches };
      })
    );
    setEnrichedGroups(enriched);
  };

  if (!isOpen || enrichedGroups.length === 0) return null;

  const updateGroupDecision = (index: number, updates: Partial<GroupDecision>) => {
    setGroupDecisions(prev => ({
      ...prev,
      [index]: { ...prev[index], ...updates }
    }));
  };

  const toggleExpanded = (index: number) => {
    setGroupDecisions(prev => ({
      ...prev,
      [index]: { ...prev[index], expanded: !prev[index].expanded }
    }));
  };

  const handleComplete = () => {
    const decisions: NormalizationDecision[] = enrichedGroups.map((group, index) => {
      const decision = groupDecisions[index];
      return {
        field: group.field,
        variants: group.variants.map(v => v.normalizedValue),
        action: decision.action,
        canonicalName: decision.action === 'skip' ? undefined : decision.canonicalName,
        saveAsAliases: decision.action !== 'skip' && decision.saveAsAliases,
        createIntelligenceRules: decision.action !== 'skip' && decision.createIntelligenceRules,
      };
    });
    onComplete(decisions);
  };

  const handleSkipAll = () => {
    const skipDecisions: NormalizationDecision[] = enrichedGroups.map(group => ({
      field: group.field,
      variants: group.variants.map(v => v.normalizedValue),
      action: 'skip',
      saveAsAliases: false,
      createIntelligenceRules: false,
    }));
    onComplete(skipDecisions);
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      product_type: 'Product Type',
      supplier: 'Supplier',
      brand: 'Brand',
      model: 'Model',
      location: 'Location',
      'specifications.cpu': 'CPU / Processor',
    };
    return labels[field] || field;
  };

  const isFormValid = () => {
    return Object.entries(groupDecisions).every(([index, decision]) => {
      if (decision.action === 'skip') return true;
      return decision.canonicalName.trim().length > 0;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-semibold">Normalize Entities</h2>
              <p className="text-blue-100 text-sm">
                Found {enrichedGroups.length} {enrichedGroups.length === 1 ? 'group' : 'groups'} that need normalization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Multiple variants detected</p>
                <p>Review each group below and set canonical names for standardization.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {enrichedGroups.map((group, groupIndex) => {
              const decision = groupDecisions[groupIndex];
              if (!decision) return null;

              return (
                <div
                  key={groupIndex}
                  className="border-2 border-gray-200 rounded-lg overflow-hidden"
                >
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="font-mono text-lg font-semibold text-gray-900">
                        {group.variants[0].normalizedValue}
                      </span>
                      <span className="text-sm text-gray-500">
                        {group.variants[0].count} items
                      </span>
                    </div>
                    <button
                      onClick={() => toggleExpanded(groupIndex)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      {decision.expanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={decision.action === 'create_new'}
                          onChange={() => updateGroupDecision(groupIndex, { action: 'create_new' })}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Normalize</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={decision.action === 'skip'}
                          onChange={() => updateGroupDecision(groupIndex, { action: 'skip' })}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Skip (keep as-is)</span>
                      </label>
                    </div>

                    {decision.action === 'create_new' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Canonical Name
                          </label>
                          <input
                            type="text"
                            value={decision.canonicalName}
                            onChange={(e) => updateGroupDecision(groupIndex, { canonicalName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter standard name"
                          />
                        </div>

                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={decision.saveAsAliases}
                              onChange={(e) => updateGroupDecision(groupIndex, { saveAsAliases: e.target.checked })}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm text-gray-700">Save as alias</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={decision.createIntelligenceRules}
                              onChange={(e) => updateGroupDecision(groupIndex, { createIntelligenceRules: e.target.checked })}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm text-gray-700">Auto-recognize in future</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {decision.expanded && (
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-500 mb-2">Details:</p>
                        <div className="text-xs text-gray-600">
                          <p>Original value: {group.variants[0].originalValue}</p>
                          <p>Appears in rows: {group.variants[0].count} times</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
          <button
            onClick={handleSkipAll}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Skip all
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleComplete}
              disabled={!isFormValid()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Complete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
