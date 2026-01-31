import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Package, DollarSign, AlertCircle, Clock, Users, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';

interface WidgetData {
  totalAssets: number;
  assetsInProcess: number;
  readyForSale: number;
  totalValue: number;
  avgProcessingTime: number;
  priorityItems: number;
  staleItems: number;
  todayReceived: number;
}

export function DashboardWidgets() {
  const { selectedCompany } = useCompany();
  const [data, setData] = useState<WidgetData>({
    totalAssets: 0,
    assetsInProcess: 0,
    readyForSale: 0,
    totalValue: 0,
    avgProcessingTime: 0,
    priorityItems: 0,
    staleItems: 0,
    todayReceived: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedCompany) {
      fetchData();
    }
  }, [selectedCompany]);

  const fetchData = async () => {
    try {
      const { data: assets, error } = await supabase
        .from('assets')
        .select('*')
        .eq('company_id', selectedCompany?.id);

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let totalDays = 0;
      let countWithDays = 0;
      let staleCount = 0;

      assets?.forEach((asset) => {
        if (asset.stage_started_at) {
          const start = new Date(asset.stage_started_at);
          const now = new Date();
          const days = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          totalDays += days;
          countWithDays++;

          if (days > 7) {
            staleCount++;
          }
        }
      });

      const todayAssets = assets?.filter((a) => {
        const created = new Date(a.created_at);
        return created >= today;
      });

      setData({
        totalAssets: assets?.length || 0,
        assetsInProcess: assets?.filter((a) => a.processing_stage !== 'ready').length || 0,
        readyForSale: assets?.filter((a) => a.processing_stage === 'ready').length || 0,
        totalValue: assets?.reduce((sum, a) => sum + (a.purchase_price || 0) + (a.refurbishment_cost || 0), 0) || 0,
        avgProcessingTime: countWithDays > 0 ? totalDays / countWithDays : 0,
        priorityItems: assets?.filter((a) => a.is_priority).length || 0,
        staleItems: staleCount,
        todayReceived: todayAssets?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const widgets = [
    {
      label: 'Total Assets',
      value: data.totalAssets,
      icon: Package,
      color: 'blue',
      format: 'number',
    },
    {
      label: 'In Processing',
      value: data.assetsInProcess,
      icon: Clock,
      color: 'orange',
      format: 'number',
    },
    {
      label: 'Ready for Sale',
      value: data.readyForSale,
      icon: CheckCircle2,
      color: 'green',
      format: 'number',
    },
    {
      label: 'Total Inventory Value',
      value: data.totalValue,
      icon: DollarSign,
      color: 'teal',
      format: 'currency',
    },
    {
      label: 'Avg Processing Time',
      value: data.avgProcessingTime,
      icon: TrendingUp,
      color: 'purple',
      format: 'days',
    },
    {
      label: 'Priority Items',
      value: data.priorityItems,
      icon: AlertCircle,
      color: 'red',
      format: 'number',
    },
    {
      label: 'Stale Items (7+ days)',
      value: data.staleItems,
      icon: TrendingDown,
      color: 'yellow',
      format: 'number',
    },
    {
      label: 'Received Today',
      value: data.todayReceived,
      icon: Package,
      color: 'blue',
      format: 'number',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      teal: 'bg-teal-50 text-teal-700 border-teal-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      red: 'bg-red-50 text-red-700 border-red-200',
      yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    };
    return colors[color] || colors.blue;
  };

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'days':
        return `${Math.round(value)} days`;
      default:
        return value.toLocaleString();
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {widgets.map((widget) => {
        const Icon = widget.icon;
        return (
          <div
            key={widget.label}
            className={`rounded-lg border-2 p-6 transition hover:shadow-lg ${getColorClasses(widget.color)}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium opacity-75">{widget.label}</p>
                <p className="text-3xl font-bold mt-2">
                  {formatValue(widget.value, widget.format)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white bg-opacity-50">
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
