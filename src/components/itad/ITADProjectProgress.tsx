import { CheckCircle, Circle } from 'lucide-react';

interface ITADProjectProgressProps {
  currentStatus: string;
  size?: 'sm' | 'md' | 'lg';
}

const ITAD_STAGES = [
  { key: 'pending', label: 'Pending', description: 'Project created, awaiting assets' },
  { key: 'in_progress', label: 'Receiving', description: 'Assets being received and logged' },
  { key: 'sanitization', label: 'Sanitization', description: 'Data destruction in progress' },
  { key: 'testing', label: 'Testing', description: 'Testing and grading assets' },
  { key: 'disposition', label: 'Disposition', description: 'Remarketing, recycling, or disposal' },
  { key: 'completed', label: 'Completed', description: 'Certificate issued, project closed' },
];

export function ITADProjectProgress({ currentStatus, size = 'md' }: ITADProjectProgressProps) {
  const currentStageIndex = ITAD_STAGES.findIndex((s) => s.key === currentStatus);

  const sizeClasses = {
    sm: {
      container: 'gap-2',
      icon: 'w-6 h-6',
      line: 'h-0.5',
      text: 'text-xs',
      label: 'text-xs font-medium',
      description: 'text-xs',
    },
    md: {
      container: 'gap-3',
      icon: 'w-8 h-8',
      line: 'h-1',
      text: 'text-sm',
      label: 'text-sm font-semibold',
      description: 'text-xs',
    },
    lg: {
      container: 'gap-4',
      icon: 'w-10 h-10',
      line: 'h-1',
      text: 'text-base',
      label: 'text-base font-semibold',
      description: 'text-sm',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className="w-full">
      <div className={`flex items-center justify-between ${classes.container}`}>
        {ITAD_STAGES.map((stage, index) => {
          const isCompleted = index < currentStageIndex;
          const isCurrent = index === currentStageIndex;

          return (
            <div key={stage.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`${classes.icon} rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? 'bg-blue-500 text-white ring-4 ring-blue-100'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className={`${classes.icon}`} />
                  ) : (
                    <Circle className={`${classes.icon} ${isCurrent ? 'animate-pulse' : ''}`} />
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div
                    className={`${classes.label} ${
                      isCurrent ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-gray-500'
                    }`}
                  >
                    {stage.label}
                  </div>
                  {size !== 'sm' && (
                    <div className={`${classes.description} text-gray-500 mt-0.5`}>
                      {stage.description}
                    </div>
                  )}
                </div>
              </div>

              {index < ITAD_STAGES.length - 1 && (
                <div className="flex-1 relative" style={{ maxWidth: '60px', minWidth: '30px' }}>
                  <div className={`${classes.line} w-full bg-gray-200 rounded`}>
                    <div
                      className={`${classes.line} rounded transition-all ${
                        isCompleted ? 'bg-green-500 w-full' : 'bg-gray-200 w-0'
                      }`}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className={`${classes.icon} rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0`}>
            <Circle className={`${classes.icon} animate-pulse`} />
          </div>
          <div>
            <div className={`${classes.label} text-blue-900`}>
              Current Stage: {ITAD_STAGES[currentStageIndex]?.label || currentStatus}
            </div>
            <p className={`${classes.description} text-blue-700 mt-1`}>
              {ITAD_STAGES[currentStageIndex]?.description || 'Project in progress'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
