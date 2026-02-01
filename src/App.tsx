import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';
import { ToastProvider } from './contexts/ToastContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { CustomerPortalAuthProvider } from './contexts/CustomerPortalAuthContext';
import { AuthPage } from './pages/AuthPage';
import { CustomerPortalPage } from './pages/CustomerPortalPage';
import { PublicSitePage } from './pages/PublicSitePage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { KeyboardShortcutsHelp } from './components/common/KeyboardShortcutsHelp';
import { ModularAppShell } from './components/layout/ModularAppShell';

function AppContent() {
  const { user, loading } = useAuth();
  const isCustomerPortal = window.location.pathname.startsWith('/portal');
  const isPublicSite = window.location.pathname.startsWith('/site');

  // Handle public site (no auth required)
  if (isPublicSite) {
    const pathParts = window.location.pathname.split('/');
    const companyId = pathParts[2];
    const slug = pathParts[3];

    if (companyId && slug) {
      return (
        <ErrorBoundary>
          <PublicSitePage companyId={companyId} slug={slug} />
        </ErrorBoundary>
      );
    }
  }

  if (isCustomerPortal) {
    return (
      <ErrorBoundary>
        <CustomerPortalAuthProvider>
          <CustomerPortalPage />
        </CustomerPortalAuthProvider>
      </ErrorBoundary>
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
      <WorkspaceProvider>
        <ErrorBoundary>
          <ModularAppShell />
          <KeyboardShortcutsHelp />
        </ErrorBoundary>
      </WorkspaceProvider>
    </CompanyProvider>
  );
}

function App() {
  return (
    <ErrorBoundary showDetails={import.meta.env.DEV}>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
