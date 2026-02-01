import { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { aiValuationService } from '../../services/aiValuationService';
import type { ValuationRequest } from '../../services/aiValuationService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TrendingUp, AlertCircle, CheckCircle, DollarSign, Sparkles } from 'lucide-react';

interface AIValuationWidgetProps {
  targetType: 'asset' | 'inventory_item' | 'component';
  targetId: string;
  brand?: string;
  model?: string;
  productType?: string;
  conditionGrade?: string;
  ageMonths?: number;
}

export function AIValuationWidget({
  targetType,
  targetId,
  brand,
  model,
  productType,
  conditionGrade,
  ageMonths,
}: AIValuationWidgetProps) {
  const { currentCompany } = useCompany();
  const [valuation, setValuation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentCompany?.id) {
      loadExistingValuation();
    }
  }, [currentCompany, targetId]);

  const loadExistingValuation = async () => {
    try {
      const valuations = await aiValuationService.getValuationsForTarget(targetType, targetId);
      if (valuations.length > 0) {
        setValuation(valuations[0]);
      }
    } catch (err) {
      console.error('Failed to load valuation:', err);
    }
  };

  const generateValuation = async () => {
    if (!currentCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      const request: ValuationRequest = {
        target_type: targetType,
        target_id: targetId,
        brand,
        model,
        product_type: productType,
        condition_grade: conditionGrade,
        age_months: ageMonths,
      };

      const result = await aiValuationService.generateValuation(currentCompany.id, request);
      setValuation(result);
    } catch (err: any) {
      console.error('Failed to generate valuation:', err);
      setError(err.message || 'Failed to generate valuation');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getChannelIcon = (channel: string) => {
    return <TrendingUp className="w-4 h-4" />;
  };

  const getChannelLabel = (channel: string) => {
    const labels: Record<string, string> = {
      direct_sale: 'Direct Sale',
      auction: 'Auction',
      component_harvest: 'Component Harvest',
      scrap: 'Scrap',
      donate: 'Donate',
      dispose: 'Dispose',
    };
    return labels[channel] || channel;
  };

  if (!valuation) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">AI Valuation</h3>
          </div>
          <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full font-medium">
            ADVISORY
          </span>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Get AI-powered pricing recommendations and optimal sales channel suggestions
        </p>

        <Button
          onClick={generateValuation}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Analyzing...' : 'Generate Valuation'}
        </Button>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            {error}
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">AI Valuation</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getConfidenceColor(valuation.confidence_level)}`}>
            {valuation.confidence_level?.toUpperCase()} ({Math.round(valuation.confidence_score * 100)}%)
          </span>
          <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full font-medium">
            ADVISORY
          </span>
        </div>
      </div>

      <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-lg">
            {getChannelIcon(valuation.recommended_channel)}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-blue-900 mb-1">
              Recommended: {getChannelLabel(valuation.recommended_channel)}
            </div>
            <div className="text-sm text-blue-700">{valuation.recommendation_reason}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 border border-gray-200 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">Direct Sale</div>
          <div className="text-lg font-bold text-gray-900 flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            {valuation.predicted_resale_value?.toFixed(2)}
          </div>
        </div>

        <div className="p-3 border border-gray-200 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">Auction</div>
          <div className="text-lg font-bold text-gray-900 flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            {valuation.predicted_auction_value?.toFixed(2)}
          </div>
        </div>

        <div className="p-3 border border-gray-200 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">Component Harvest</div>
          <div className="text-lg font-bold text-gray-900 flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            {valuation.predicted_component_harvest_value?.toFixed(2)}
          </div>
        </div>

        <div className="p-3 border border-gray-200 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">Scrap</div>
          <div className="text-lg font-bold text-gray-900 flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            {valuation.predicted_scrap_value?.toFixed(2)}
          </div>
        </div>
      </div>

      {valuation.prediction_factors && valuation.prediction_factors.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-700 mb-2">Factors Considered:</div>
          <div className="space-y-1">
            {valuation.prediction_factors.slice(0, 3).map((factor: any, idx: number) => (
              <div key={idx} className="text-xs text-gray-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-600" />
                {factor.factor}
                {factor.multiplier && ` (${(factor.multiplier * 100).toFixed(0)}%)`}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={generateValuation}
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={loading}
        >
          {loading ? 'Updating...' : 'Refresh'}
        </Button>
      </div>

      <div className="mt-4 text-xs text-gray-500 border-t pt-3">
        Generated {new Date(valuation.predicted_at).toLocaleDateString()} | Model: {valuation.model_version}
      </div>
    </Card>
  );
}
