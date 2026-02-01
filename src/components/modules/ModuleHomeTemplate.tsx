import React, { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus, Plus } from 'lucide-react';

interface StatCard {
  label: string;
  value: string | number;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
  };
  icon?: React.ComponentType<{ className?: string }>;
}

interface Action {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  user?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface ModuleHomeTemplateProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  stats: StatCard[];
  actions: Action[];
  recentActivity?: ActivityItem[];
  children?: ReactNode;
}

export function ModuleHomeTemplate({
  title,
  description,
  icon: Icon,
  stats,
  actions,
  recentActivity = [],
  children
}: ModuleHomeTemplateProps) {
  const getTrendIcon = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityColor = (type: string = 'info') => {
    const colors = {
      info: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    };
    return colors[type as keyof typeof colors] || colors.info;
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
              <Icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              <p className="text-gray-600 mt-1">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {actions.map((action, idx) => {
              const ActionIcon = action.icon;
              const isPrimary = action.variant === 'primary' || idx === 0;

              return (
                <button
                  key={idx}
                  onClick={action.onClick}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isPrimary
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {ActionIcon && <ActionIcon className="w-4 h-4" />}
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => {
            const StatIcon = stat.icon;

            return (
              <div key={idx} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-600">{stat.label}</span>
                  {StatIcon && (
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <StatIcon className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                  {stat.trend && (
                    <div className="flex items-center gap-1">
                      {getTrendIcon(stat.trend.direction)}
                      <span className={`text-sm font-medium ${
                        stat.trend.direction === 'up' ? 'text-green-600' :
                        stat.trend.direction === 'down' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {stat.trend.value}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {children && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {children}
          </div>
        )}

        {recentActivity.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {recentActivity.map((item) => (
                <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">{item.title}</h3>
                        {item.type && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getActivityColor(item.type)}`}>
                            {item.type}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{item.description}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        {item.user && <span>{item.user}</span>}
                        {item.user && <span>•</span>}
                        <span>{item.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
