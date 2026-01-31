import React, { useState } from 'react';
import { FileSpreadsheet, ChevronRight, X, Table } from 'lucide-react';

interface SheetInfo {
  name: string;
  rowCount: number;
  preview: string[][];
}

interface ExcelSheetSelectorProps {
  sheets: SheetInfo[];
  onSelectSheet: (sheetName: string) => void;
  onCancel: () => void;
}

export function ExcelSheetSelector({ sheets, onSelectSheet, onCancel }: ExcelSheetSelectorProps) {
  const [selectedSheet, setSelectedSheet] = useState<string>(sheets[0]?.name || '');
  const [showPreview, setShowPreview] = useState(false);

  const currentSheet = sheets.find(s => s.name === selectedSheet);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Multiple Sheets Detected
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  This Excel file contains {sheets.length} sheets. Select which one to import.
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sheets.map((sheet) => (
              <button
                key={sheet.name}
                onClick={() => {
                  setSelectedSheet(sheet.name);
                  setShowPreview(true);
                }}
                className={`p-4 border-2 rounded-lg text-left transition-all hover:border-green-500 hover:bg-green-50 ${
                  selectedSheet === sheet.name
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Table className="w-4 h-4 text-gray-500" />
                      <h3 className="font-medium text-gray-900">{sheet.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {sheet.rowCount} rows
                    </p>
                  </div>
                  {selectedSheet === sheet.name && (
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <ChevronRight className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {showPreview && currentSheet && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Preview: {currentSheet.name}
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      {currentSheet.preview[0]?.map((header, idx) => (
                        <th
                          key={idx}
                          className="px-3 py-2 text-left font-medium text-gray-900 bg-gray-100"
                        >
                          {header || `Column ${idx + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentSheet.preview.slice(1, 6).map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-b border-gray-200">
                        {row.map((cell, cellIdx) => (
                          <td
                            key={cellIdx}
                            className="px-3 py-2 text-gray-700"
                          >
                            {cell || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Showing first 5 rows of {currentSheet.rowCount} total rows
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedSheet ? (
              <>
                Selected: <span className="font-medium text-gray-900">{selectedSheet}</span>
              </>
            ) : (
              'Please select a sheet'
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => onSelectSheet(selectedSheet)}
              disabled={!selectedSheet}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>Import Selected Sheet</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
