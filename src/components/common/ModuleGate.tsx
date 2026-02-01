import { Lock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';

interface ModuleGateProps {
  engineTitle: string;
  engineIcon: string;
  engineKey: string;
}

export function ModuleGate({ engineTitle, engineIcon, engineKey }: ModuleGateProps) {
  const navigate = useNavigate();

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Icons.Box;
  };

  const Icon = getIcon(engineIcon);

  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="bg-white rounded-2xl border-2 border-amber-200 p-8 text-center shadow-lg">
          <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 relative">
            <Icon className="w-10 h-10 text-amber-600" />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
              <Lock className="w-4 h-4 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">{engineTitle}</h1>
          <p className="text-gray-600 mb-6">
            This module is currently disabled. Enable it in the Apps screen to access its features.
          </p>

          <button
            onClick={() => navigate('/apps')}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
          >
            <span>Go to Apps</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full mt-3 px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
