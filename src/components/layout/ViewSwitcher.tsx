import { LayoutGrid, List, Calendar, BarChart3 } from 'lucide-react';

export type ViewType = 'kanban' | 'list' | 'calendar' | 'graph';

interface ViewSwitcherProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  availableViews?: ViewType[];
}

const viewConfig: Record<ViewType, { icon: any; label: string }> = {
  kanban: { icon: LayoutGrid, label: 'Kanban' },
  list: { icon: List, label: 'List' },
  calendar: { icon: Calendar, label: 'Calendar' },
  graph: { icon: BarChart3, label: 'Graph' },
};

export function ViewSwitcher({
  currentView,
  onViewChange,
  availableViews = ['kanban', 'list']
}: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {availableViews.map((view) => {
        const config = viewConfig[view];
        const Icon = config.icon;
        const isActive = currentView === view;

        return (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition text-sm font-medium ${
              isActive
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title={config.label}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
