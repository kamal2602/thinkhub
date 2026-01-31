interface QuickAddModalProps {
  type?: string;
  title?: string;
  placeholder?: string;
  onAdd: (item: any) => void;
  onClose: () => void;
  [key: string]: any;
}

export function QuickAddModal({ type, title, onAdd, onClose }: QuickAddModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Add {title || type}</h2>
        <p>Quick add form coming soon...</p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
