import React from 'react';
import { ProcessTile, ProcessTileProps } from './ProcessTile';

export interface ProcessSectionProps {
  title: string;
  tiles: ProcessTileProps[];
}

export function ProcessSection({ title, tiles }: ProcessSectionProps) {
  if (tiles.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-primary mb-4 px-1">
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tiles.map((tile) => (
          <ProcessTile key={tile.id} {...tile} />
        ))}
      </div>
    </div>
  );
}
