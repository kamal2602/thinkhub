import { useState } from 'react';
import { X, Edit2, Trash2, Copy, Flag, ArrowRight, Mail, Download, Tag } from 'lucide-react';

interface ActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkUpdateStage?: (stage: string) => void;
  onBulkUpdateGrade?: (grade: string) => void;
  onBulkAssignTechnician?: (technicianId: string) => void;
  onBulkSetPriority?: (isPriority: boolean) => void;
  onBulkDelete?: () => void;
  onBulkClone?: () => void;
  onBulkExport?: () => void;
  stages?: Array<{ id: string; stage_name: string; stage_key: string }>;
  grades?: Array<{ id: string; grade: string }>;
  technicians?: Array<{ id: string; full_name: string }>;
}

export function ActionBar({
  selectedCount,
  onClearSelection,
  onBulkUpdateStage,
  onBulkUpdateGrade,
  onBulkAssignTechnician,
  onBulkSetPriority,
  onBulkDelete,
  onBulkClone,
  onBulkExport,
  stages = [],
  grades = [],
  technicians = [],
}: ActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 mb-4 bg-gradient-to-r from-blue-600 to-blue-700 border border-blue-800 rounded-lg shadow-lg">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white bg-opacity-20 rounded-full px-4 py-1.5">
                <span className="text-sm font-semibold text-white">
                  {selectedCount} selected
                </span>
              </div>
              <button
                onClick={onClearSelection}
                className="p-1.5 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onBulkUpdateStage && stages.length > 0 && (
              <div className="relative group">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      onBulkUpdateStage(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="px-4 py-2 text-sm bg-white bg-opacity-90 text-gray-900 rounded-lg hover:bg-opacity-100 transition border-0 focus:ring-2 focus:ring-white cursor-pointer"
                >
                  <option value="">Move to Stage...</option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.stage_key}>
                      {stage.stage_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {onBulkUpdateGrade && grades.length > 0 && (
              <div className="relative group">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      onBulkUpdateGrade(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="px-4 py-2 text-sm bg-white bg-opacity-90 text-gray-900 rounded-lg hover:bg-opacity-100 transition border-0 focus:ring-2 focus:ring-white cursor-pointer"
                >
                  <option value="">Update Grade...</option>
                  {grades.map((grade) => (
                    <option key={grade.id} value={grade.grade}>
                      {grade.grade}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {onBulkAssignTechnician && technicians.length > 0 && (
              <div className="relative group">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      onBulkAssignTechnician(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="px-4 py-2 text-sm bg-white bg-opacity-90 text-gray-900 rounded-lg hover:bg-opacity-100 transition border-0 focus:ring-2 focus:ring-white cursor-pointer"
                >
                  <option value="">Assign Technician...</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {onBulkSetPriority && (
              <button
                onClick={() => onBulkSetPriority(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-white bg-opacity-90 text-gray-900 rounded-lg hover:bg-opacity-100 transition"
                title="Mark as priority"
              >
                <Flag className="w-4 h-4" />
                Priority
              </button>
            )}

            {onBulkClone && (
              <button
                onClick={onBulkClone}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-white bg-opacity-90 text-gray-900 rounded-lg hover:bg-opacity-100 transition"
                title="Clone selected"
              >
                <Copy className="w-4 h-4" />
                Clone
              </button>
            )}

            {onBulkExport && (
              <button
                onClick={onBulkExport}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-white bg-opacity-90 text-gray-900 rounded-lg hover:bg-opacity-100 transition"
                title="Export selected"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            )}

            {onBulkDelete && (
              <button
                onClick={onBulkDelete}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                title="Delete selected"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
