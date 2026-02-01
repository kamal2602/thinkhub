import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';

export interface ProcessTileProps {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  count?: number;
  path: string;
  onNavigate: (path: string) => void;
  onCreate?: () => void;
  disabled?: boolean;
}

export function ProcessTile({
  label,
  description,
  icon: Icon,
  count,
  path,
  onNavigate,
  onCreate,
  disabled = false,
}: ProcessTileProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`
        card card-hover group relative cursor-pointer transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => !disabled && onNavigate(path)}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <div className={`
            w-12 h-12 rounded-lg flex items-center justify-center transition-colors
            ${isHovered
              ? 'bg-primary-600 text-white'
              : 'bg-primary-100 text-primary-600'
            }
          `}>
            <Icon size={24} />
          </div>

          {count !== undefined && (
            <div className={`
              px-2.5 py-1 rounded-full text-xs font-semibold transition-colors
              ${isHovered
                ? 'bg-primary-100 text-primary-700'
                : 'bg-neutral-100 text-neutral-700'
              }
            `}>
              {count}
            </div>
          )}
        </div>

        <h3 className="text-base font-semibold text-primary mb-1">{label}</h3>
        <p className="text-sm text-secondary flex-1">{description}</p>

        {isHovered && !disabled && (
          <div className="mt-4 pt-4 border-t border-neutral-200 flex gap-2 animate-slide-up">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(path);
              }}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded transition-colors"
            >
              Open
            </button>

            {onCreate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreate();
                }}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded transition-colors"
              >
                Create
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
