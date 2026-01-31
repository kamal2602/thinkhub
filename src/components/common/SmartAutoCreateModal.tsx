import React, { useState } from 'react';
import { AlertCircle, Plus, X, Link } from 'lucide-react';

interface SmartAutoCreateModalProps {
  entityType: 'product_type' | 'supplier' | 'customer' | 'location';
  entityName: string;
  existingEntities: Array<{ id: string; name: string }>;
  onCreateNew: (name: string, aliases: string[]) => Promise<void>;
  onLinkExisting: (existingId: string, createAlias: boolean) => Promise<void>;
  onSkip: () => void;
}

export function SmartAutoCreateModal({
  entityType,
  entityName,
  existingEntities,
  onCreateNew,
  onLinkExisting,
  onSkip,
}: SmartAutoCreateModalProps) {
  const [isCreatingNew, setIsCreatingNew] = useState(true);
  const [normalizedName, setNormalizedName] = useState(
    entityName
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  );
  const [aliases, setAliases] = useState<string[]>([entityName]);
  const [newAlias, setNewAlias] = useState('');
  const [selectedExisting, setSelectedExisting] = useState('');
  const [createAliasForExisting, setCreateAliasForExisting] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const entityLabels = {
    product_type: 'Product Type',
    supplier: 'Supplier',
    customer: 'Customer',
    location: 'Location',
  };

  const handleAddAlias = () => {
    const trimmed = newAlias.trim();
    if (trimmed && !aliases.includes(trimmed)) {
      setAliases([...aliases, trimmed]);
      setNewAlias('');
    }
  };

  const handleRemoveAlias = (alias: string) => {
    setAliases(aliases.filter(a => a !== alias));
  };

  const handleCreateNew = async () => {
    setIsProcessing(true);
    try {
      await onCreateNew(normalizedName, aliases);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLinkExisting = async () => {
    if (!selectedExisting) return;
    setIsProcessing(true);
    try {
      await onLinkExisting(selectedExisting, createAliasForExisting);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  New {entityLabels[entityType]} Found
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  "{entityName}" was found in your import file but doesn't exist in the system yet.
                </p>
              </div>
            </div>
            <button
              onClick={onSkip}
              className="text-gray-400 hover:text-gray-600"
              disabled={isProcessing}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex space-x-2 mb-6 border-b">
            <button
              onClick={() => setIsCreatingNew(true)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                isCreatingNew
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Create New
            </button>
            <button
              onClick={() => setIsCreatingNew(false)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                !isCreatingNew
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Link className="w-4 h-4 inline mr-2" />
              Link to Existing
            </button>
          </div>

          {isCreatingNew ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {entityLabels[entityType]} Name
                </label>
                <input
                  type="text"
                  value={normalizedName}
                  onChange={(e) => setNormalizedName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={`e.g., ${entityName}`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be the official name in your system
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aliases (Variations)
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newAlias}
                    onChange={(e) => setNewAlias(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddAlias()}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Add variation (e.g., Notebook, NB)"
                  />
                  <button
                    onClick={handleAddAlias}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {aliases.map((alias, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                    >
                      {alias}
                      {aliases.length > 1 && (
                        <button
                          onClick={() => handleRemoveAlias(alias)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Aliases help the system recognize different variations during future imports
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">What will happen:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Create "{normalizedName}" as a new {entityLabels[entityType].toLowerCase()}</li>
                  <li>• System will learn to recognize all aliases automatically</li>
                  <li>• Future imports with these variations will map automatically</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Existing {entityLabels[entityType]}
                </label>
                <select
                  value={selectedExisting}
                  onChange={(e) => setSelectedExisting(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select --</option>
                  {existingEntities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedExisting && (
                <div>
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={createAliasForExisting}
                      onChange={(e) => setCreateAliasForExisting(e.target.checked)}
                      className="mt-1"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Create alias "{entityName}" for this {entityLabels[entityType].toLowerCase()}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        System will automatically recognize "{entityName}" as this {entityLabels[entityType].toLowerCase()} in future imports
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-amber-900 mb-2">What will happen:</h4>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Link "{entityName}" to the selected existing {entityLabels[entityType].toLowerCase()}</li>
                  {createAliasForExisting && (
                    <li>• System will learn this mapping for future imports</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
            <button
              onClick={onSkip}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              disabled={isProcessing}
            >
              Skip for Now
            </button>
            {isCreatingNew ? (
              <button
                onClick={handleCreateNew}
                disabled={!normalizedName.trim() || isProcessing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>{isProcessing ? 'Creating...' : 'Create & Learn'}</span>
              </button>
            ) : (
              <button
                onClick={handleLinkExisting}
                disabled={!selectedExisting || isProcessing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Link className="w-4 h-4" />
                <span>{isProcessing ? 'Linking...' : 'Link & Learn'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
