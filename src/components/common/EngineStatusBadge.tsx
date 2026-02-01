import { useEngines } from '../../hooks/useEngines';
import { EngineToggles } from '../../services/engineService';
import { CheckCircle2, XCircle } from 'lucide-react';

interface EngineStatusBadgeProps {
  engine: keyof EngineToggles;
  showIcon?: boolean;
}

export function EngineStatusBadge({ engine, showIcon = true }: EngineStatusBadgeProps) {
  const { isEnabled, loading } = useEngines();

  if (loading) {
    return (
      <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-500 animate-pulse">
        Loading...
      </span>
    );
  }

  const enabled = isEnabled(engine);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
        enabled
          ? 'bg-green-100 text-green-700'
          : 'bg-slate-100 text-slate-500'
      }`}
    >
      {showIcon && (
        enabled ? (
          <CheckCircle2 className="w-3 h-3" />
        ) : (
          <XCircle className="w-3 h-3" />
        )
      )}
      {enabled ? 'Enabled' : 'Disabled'}
    </span>
  );
}
