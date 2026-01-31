import { useState } from 'react';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { X } from 'lucide-react';

interface ShortcutItemProps {
  keys: string;
  description: string;
}

function ShortcutItem({ keys, description }: ShortcutItemProps) {
  return (
    <div className="flex items-center gap-3">
      <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono min-w-[80px] text-center">
        {keys}
      </kbd>
      <span className="text-gray-700">{description}</span>
    </div>
  );
}

export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  useKeyboardShortcuts({
    '?': () => setIsOpen(true),
    'escape': () => setIsOpen(false),
  });

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700 shadow-lg z-40"
        title="Keyboard shortcuts"
      >
        ?
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsOpen(false)}>
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto m-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Keyboard Shortcuts</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">General</h3>
            <div className="space-y-2">
              <ShortcutItem keys="?" description="Show this help" />
              <ShortcutItem keys="Esc" description="Close modal" />
              <ShortcutItem keys="/" description="Focus search" />
              <ShortcutItem keys="Ctrl+K" description="Command palette" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Navigation</h3>
            <div className="space-y-2">
              <ShortcutItem keys="G then D" description="Go to Dashboard" />
              <ShortcutItem keys="G then P" description="Go to Processing" />
              <ShortcutItem keys="G then I" description="Go to Inventory" />
              <ShortcutItem keys="G then S" description="Go to Sales" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Actions</h3>
            <div className="space-y-2">
              <ShortcutItem keys="Ctrl+N" description="New item" />
              <ShortcutItem keys="Ctrl+S" description="Save" />
              <ShortcutItem keys="Ctrl+E" description="Export" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Lists</h3>
            <div className="space-y-2">
              <ShortcutItem keys="↑ ↓" description="Navigate items" />
              <ShortcutItem keys="Enter" description="Open selected" />
              <ShortcutItem keys="Ctrl+A" description="Select all" />
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
