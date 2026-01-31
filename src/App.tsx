import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';
import { ToastProvider } from './contexts/ToastContext';
import { CustomerPortalAuthProvider } from './contexts/CustomerPortalAuthContext';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomerPortalPage } from './pages/CustomerPortalPage';

function AppContent() {
  const { user, loading } = useAuth();
  const isCustomerPortal = window.location.pathname.startsWith('/portal');

  if (isCustomerPortal) {
    return (
      <CustomerPortalAuthProvider>
        <CustomerPortalPage />
      </CustomerPortalAuthProvider>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <CompanyProvider>
      <DashboardPage />
    </CompanyProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
