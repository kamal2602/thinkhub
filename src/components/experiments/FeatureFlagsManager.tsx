import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useCompany } from '../../contexts/CompanyContext';
import { featureFlagService, FeatureFlag } from '../../services/featureFlagService';
import { useToast } from '../../contexts/ToastContext';

export function FeatureFlagsManager() {
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);

  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    enabled: false,
    rollout_percentage: 0,
    target_user_roles: [] as string[],
  });

  useEffect(() => {
    loadFlags();
  }, [currentCompany]);

  const loadFlags = async () => {
    if (!currentCompany) return;

    try {
      const data = await featureFlagService.getFeatureFlags(currentCompany.id);
      setFlags(data);
    } catch (error) {
      showToast('Failed to load feature flags', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    try {
      if (editingFlag) {
        await featureFlagService.updateFeatureFlag(editingFlag.id, formData);
        showToast('Feature flag updated successfully');
      } else {
        await featureFlagService.createFeatureFlag({
          ...formData,
          company_id: currentCompany.id,
          metadata: {},
        });
        showToast('Feature flag created successfully');
      }

      setShowModal(false);
      setEditingFlag(null);
      resetForm();
      loadFlags();
    } catch (error) {
      showToast('Failed to save feature flag', 'error');
    }
  };

  const handleToggle = async (flag: FeatureFlag) => {
    try {
      await featureFlagService.updateFeatureFlag(flag.id, {
        enabled: !flag.enabled,
      });
      showToast(`Feature flag ${flag.enabled ? 'disabled' : 'enabled'}`);
      loadFlags();
    } catch (error) {
      showToast('Failed to toggle feature flag', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feature flag?')) return;

    try {
      await featureFlagService.deleteFeatureFlag(id);
      showToast('Feature flag deleted successfully');
      loadFlags();
    } catch (error) {
      showToast('Failed to delete feature flag', 'error');
    }
  };

  const handleEdit = (flag: FeatureFlag) => {
    setEditingFlag(flag);
    setFormData({
      key: flag.key,
      name: flag.name,
      description: flag.description || '',
      enabled: flag.enabled,
      rollout_percentage: flag.rollout_percentage,
      target_user_roles: flag.target_user_roles || [],
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      key: '',
      name: '',
      description: '',
      enabled: false,
      rollout_percentage: 0,
      target_user_roles: [],
    });
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
          <p className="text-gray-600">Control feature rollout and availability</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingFlag(null);
            setShowModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Flag
        </Button>
      </div>

      <div className="grid gap-4">
        {flags.map((flag) => (
          <Card key={flag.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{flag.name}</h3>
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                    {flag.key}
                  </span>
                  {flag.enabled ? (
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                      Enabled
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">{flag.description}</p>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span>Rollout: {flag.rollout_percentage}%</span>
                  {flag.target_user_roles && flag.target_user_roles.length > 0 && (
                    <span>Roles: {flag.target_user_roles.join(', ')}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggle(flag)}
                >
                  {flag.enabled ? (
                    <ToggleRight className="w-5 h-5 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-gray-400" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(flag)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(flag.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {flags.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-gray-600">No feature flags yet. Create one to get started.</p>
          </Card>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl p-6 m-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingFlag ? 'Edit Feature Flag' : 'New Feature Flag'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Key
                  </label>
                  <input
                    type="text"
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="feature_name"
                    required
                    disabled={!!editingFlag}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Feature Name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="What does this flag control?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rollout Percentage
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.rollout_percentage}
                    onChange={(e) => setFormData({ ...formData, rollout_percentage: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Percentage of users who will see this feature (0-100%)
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="enabled" className="ml-2 text-sm font-medium text-gray-700">
                    Enable this flag
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button type="submit">
                  {editingFlag ? 'Update Flag' : 'Create Flag'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    setEditingFlag(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
