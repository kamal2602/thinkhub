import React from 'react';
import { ProcessTile, ProcessTileProps } from './ProcessTile';

export interface ProcessSectionProps {
  title: string;
  tiles: ProcessTileProps[];
  color?: 'blue' | 'amber' | 'green' | 'purple' | 'gray';
}

export function ProcessSection({ title, tiles, color = 'blue' }: ProcessSectionProps) {
  if (tiles.length === 0) return null;

  const colorClasses = {
    blue: 'text-blue-700 border-blue-200 bg-blue-50',
    amber: 'text-amber-700 border-amber-200 bg-amber-50',
    green: 'text-green-700 border-green-200 bg-green-50',
    purple: 'text-purple-700 border-purple-200 bg-purple-50',
    gray: 'text-gray-700 border-gray-200 bg-gray-50',
  };

  return (
    <div className="mb-10">
      <div className={`inline-block px-4 py-2 rounded-lg border-l-4 mb-4 ${colorClasses[color]}`}>
        <h2 className="text-lg font-semibold uppercase tracking-wide">
          {title}
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tiles.map((tile) => (
          <ProcessTile key={tile.id} {...tile} />
        ))}
      </div>
    </div>
  );
}
