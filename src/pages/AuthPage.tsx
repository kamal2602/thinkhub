import { LoginForm } from '../components/auth/LoginForm';
import { Package } from 'lucide-react';

export function AuthPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl flex items-center justify-center gap-12">
        <div className="hidden lg:flex flex-col items-start max-w-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Package className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">StockFlow</h1>
          </div>

          <h2 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
            IT Asset Refurbishment & Inventory
          </h2>

          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            Complete refurbishment workflow with role-based access. Process devices from receiving to sales-ready with full traceability.
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Role-Based Access</h3>
                <p className="text-gray-600 text-sm">Admin, Manager, Technician, and Sales roles with specific permissions and views.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Scan & Assign Workflow</h3>
                <p className="text-gray-600 text-sm">Technicians scan serial numbers to instantly claim and process assets.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Quality Control</h3>
                <p className="text-gray-600 text-sm">Only fully refurbished and QC-passed assets become available for sales.</p>
              </div>
            </div>
          </div>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
