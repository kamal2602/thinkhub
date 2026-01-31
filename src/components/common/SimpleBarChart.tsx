interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: BarChartData[];
  maxValue?: number;
  showPercentage?: boolean;
}

export function SimpleBarChart({ data, maxValue, showPercentage = true }: SimpleBarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((item, i) => {
        const percentage = (item.value / max) * 100;
        return (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700">{item.label}</span>
              <span className="font-semibold text-gray-900">{item.value}</span>
            </div>
            <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
              <div
                className={`h-full ${item.color || 'bg-blue-500'} transition-all duration-500 flex items-center justify-end px-2`}
                style={{ width: `${Math.max(percentage, 2)}%` }}
              >
                {showPercentage && percentage > 15 && (
                  <span className="text-white text-xs font-medium">
                    {Math.round(percentage)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
