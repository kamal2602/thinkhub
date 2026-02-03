import React, { useState, useEffect } from 'react';
import { Plus, Play, Pause, CheckCircle, BarChart3, Edit2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useCompany } from '../../contexts/CompanyContext';
import { featureFlagService, ABExperiment } from '../../services/featureFlagService';
import { useToast } from '../../contexts/ToastContext';

export function ABExperimentsManager() {
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const [experiments, setExperiments] = useState<ABExperiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExperiment, setEditingExperiment] = useState<ABExperiment | null>(null);
  const [showStats, setShowStats] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    variant_a_name: 'Control',
    variant_b_name: 'Test',
    variant_a_config: '{}',
    variant_b_config: '{}',
    traffic_split: 50,
    target_metric: '',
  });

  useEffect(() => {
    loadExperiments();
  }, [currentCompany]);

  const loadExperiments = async () => {
    if (!currentCompany) return;

    try {
      const data = await featureFlagService.getExperiments(currentCompany.id);
      setExperiments(data);
    } catch (error) {
      showToast('Failed to load experiments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    try {
      let variantAConfig, variantBConfig;
      try {
        variantAConfig = JSON.parse(formData.variant_a_config);
        variantBConfig = JSON.parse(formData.variant_b_config);
      } catch {
        showToast('Invalid JSON in variant configuration', 'error');
        return;
      }

      if (editingExperiment) {
        await featureFlagService.updateExperiment(editingExperiment.id, {
          ...formData,
          variant_a_config: variantAConfig,
          variant_b_config: variantBConfig,
        });
        showToast('Experiment updated successfully');
      } else {
        await featureFlagService.createExperiment({
          ...formData,
          company_id: currentCompany.id,
          status: 'draft',
          variant_a_config: variantAConfig,
          variant_b_config: variantBConfig,
        });
        showToast('Experiment created successfully');
      }

      setShowModal(false);
      setEditingExperiment(null);
      resetForm();
      loadExperiments();
    } catch (error) {
      showToast('Failed to save experiment', 'error');
    }
  };

  const handleStart = async (id: string) => {
    try {
      await featureFlagService.startExperiment(id);
      showToast('Experiment started');
      loadExperiments();
    } catch (error) {
      showToast('Failed to start experiment', 'error');
    }
  };

  const handlePause = async (id: string) => {
    try {
      await featureFlagService.pauseExperiment(id);
      showToast('Experiment paused');
      loadExperiments();
    } catch (error) {
      showToast('Failed to pause experiment', 'error');
    }
  };

  const handleComplete = async (id: string) => {
    if (!confirm('Are you sure you want to complete this experiment?')) return;

    try {
      await featureFlagService.completeExperiment(id);
      showToast('Experiment completed');
      loadExperiments();
    } catch (error) {
      showToast('Failed to complete experiment', 'error');
    }
  };

  const handleViewStats = async (experimentId: string) => {
    try {
      const data = await featureFlagService.getExperimentStats(experimentId);
      setStats(data);
      setShowStats(experimentId);
    } catch (error) {
      showToast('Failed to load experiment stats', 'error');
    }
  };

  const handleEdit = (experiment: ABExperiment) => {
    setEditingExperiment(experiment);
    setFormData({
      name: experiment.name,
      description: experiment.description || '',
      variant_a_name: experiment.variant_a_name,
      variant_b_name: experiment.variant_b_name,
      variant_a_config: JSON.stringify(experiment.variant_a_config, null, 2),
      variant_b_config: JSON.stringify(experiment.variant_b_config, null, 2),
      traffic_split: experiment.traffic_split,
      target_metric: experiment.target_metric || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      variant_a_name: 'Control',
      variant_b_name: 'Test',
      variant_a_config: '{}',
      variant_b_config: '{}',
      traffic_split: 50,
      target_metric: '',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-700';
      case 'paused':
        return 'bg-yellow-100 text-yellow-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">A/B Experiments</h1>
          <p className="text-gray-600">Test variations and measure impact</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingExperiment(null);
            setShowModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Experiment
        </Button>
      </div>

      <div className="grid gap-4">
        {experiments.map((experiment) => (
          <Card key={experiment.id} className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{experiment.name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(experiment.status)}`}>
                    {experiment.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{experiment.description}</p>
                {experiment.target_metric && (
                  <p className="text-sm text-gray-600">Target Metric: {experiment.target_metric}</p>
                )}
              </div>
              <div className="flex gap-2">
                {experiment.status === 'draft' && (
                  <Button size="sm" onClick={() => handleStart(experiment.id)}>
                    <Play className="w-4 h-4 mr-1" />
                    Start
                  </Button>
                )}
                {experiment.status === 'running' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handlePause(experiment.id)}>
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </Button>
                    <Button size="sm" onClick={() => handleComplete(experiment.id)}>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Complete
                    </Button>
                  </>
                )}
                {experiment.status === 'paused' && (
                  <Button size="sm" onClick={() => handleStart(experiment.id)}>
                    <Play className="w-4 h-4 mr-1" />
                    Resume
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewStats(experiment.id)}
                >
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Stats
                </Button>
                {experiment.status === 'draft' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(experiment)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Variant A: {experiment.variant_a_name}
                </h4>
                <p className="text-xs text-gray-600">
                  {100 - experiment.traffic_split}% traffic
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Variant B: {experiment.variant_b_name}
                </h4>
                <p className="text-xs text-gray-600">
                  {experiment.traffic_split}% traffic
                </p>
              </div>
            </div>
          </Card>
        ))}

        {experiments.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-gray-600">No experiments yet. Create one to get started.</p>
          </Card>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <Card className="w-full max-w-4xl p-6 m-4 my-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingExperiment ? 'Edit Experiment' : 'New Experiment'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Experiment Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Metric
                    </label>
                    <input
                      type="text"
                      value={formData.target_metric}
                      onChange={(e) => setFormData({ ...formData, target_metric: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., conversion_rate"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Variant A Name (Control)
                    </label>
                    <input
                      type="text"
                      value={formData.variant_a_name}
                      onChange={(e) => setFormData({ ...formData, variant_a_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Variant B Name (Test)
                    </label>
                    <input
                      type="text"
                      value={formData.variant_b_name}
                      onChange={(e) => setFormData({ ...formData, variant_b_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Variant A Config (JSON)
                    </label>
                    <textarea
                      value={formData.variant_a_config}
                      onChange={(e) => setFormData({ ...formData, variant_a_config: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      rows={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Variant B Config (JSON)
                    </label>
                    <textarea
                      value={formData.variant_b_config}
                      onChange={(e) => setFormData({ ...formData, variant_b_config: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      rows={6}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Traffic Split for Variant B: {formData.traffic_split}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.traffic_split}
                    onChange={(e) => setFormData({ ...formData, traffic_split: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>All A</span>
                    <span>50/50</span>
                    <span>All B</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button type="submit">
                  {editingExperiment ? 'Update Experiment' : 'Create Experiment'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    setEditingExperiment(null);
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

      {showStats && stats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-3xl p-6 m-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Experiment Results</h2>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Variant A (Control)</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Users:</span>
                    <span className="font-semibold">{stats.variantA.users}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Events:</span>
                    <span className="font-semibold">{stats.variantA.events}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Conversions:</span>
                    <span className="font-semibold">{stats.variantA.conversions}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-600">Conversion Rate:</span>
                    <span className="font-bold text-lg">{stats.variantA.conversionRate.toFixed(2)}%</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-blue-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Variant B (Test)</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Users:</span>
                    <span className="font-semibold">{stats.variantB.users}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Events:</span>
                    <span className="font-semibold">{stats.variantB.events}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Conversions:</span>
                    <span className="font-semibold">{stats.variantB.conversions}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-600">Conversion Rate:</span>
                    <span className="font-bold text-lg">{stats.variantB.conversionRate.toFixed(2)}%</span>
                  </div>
                </div>
              </Card>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Relative Improvement:</span>
                <span className={`text-xl font-bold ${
                  stats.variantB.conversionRate > stats.variantA.conversionRate
                    ? 'text-green-600'
                    : stats.variantB.conversionRate < stats.variantA.conversionRate
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}>
                  {stats.variantA.conversionRate > 0
                    ? ((stats.variantB.conversionRate - stats.variantA.conversionRate) / stats.variantA.conversionRate * 100).toFixed(2)
                    : '0'}%
                </span>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={() => setShowStats(null)}>Close</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
