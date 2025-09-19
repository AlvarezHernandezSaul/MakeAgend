import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useBusinessData } from './hooks/useBusinessData';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import { BusinessSetup } from './components/onboarding/BusinessSetup';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { AppointmentCalendar } from './components/appointments/AppointmentCalendar';
import { ClientManagement } from './components/clients/ClientManagement';
import { ServiceManagement } from './components/services/ServiceManagement';
import { DigitalRecords } from './components/records/DigitalRecords';
import { Reports } from './components/reports/Reports';
import { Notifications } from './components/notifications/Notifications';
import { Settings } from './components/settings/Settings';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { BlockedScreen } from './components/common/BlockedScreen';
import { Menu } from 'lucide-react';

const AuthenticatedApp: React.FC = () => {
  const { currentUser, licenseStatus, refreshLicenseStatus } = useAuth();
  const { loading } = useBusinessData(currentUser?.businessId || undefined);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show admin dashboard for admin users
  if (!loading && currentUser && currentUser.role === 'admin') {
    return <AdminDashboard />;
  }

  // Check if user is blocked or has invalid license
  if (!loading && currentUser && (currentUser.isBlocked || (licenseStatus && !licenseStatus.isValid))) {
    return (
      <BlockedScreen 
        user={currentUser} 
        reason={currentUser.blockedReason || (licenseStatus ? 'Su licencia ha expirado o ha sido cancelada. Contacte al administrador para reactivar su cuenta.' : undefined)}
        onRetry={refreshLicenseStatus}
      />
    );
  }

  // Show business setup only for owners who don't have a business configured
  if (!loading && currentUser && currentUser.role === 'owner' && !currentUser.businessId) {
    return <BusinessSetup />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando MakeAgend...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'appointments':
        return <AppointmentCalendar />;
      case 'clients':
        return <ClientManagement />;
      case 'services':
        return <ServiceManagement />;
      case 'records':
        return <DigitalRecords />;
      case 'reports':
        return <Reports />;
      case 'notifications':
        return <Notifications />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">MakeAgend</h1>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        {/* Content */}
        <div className="min-h-screen p-4 lg:p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

const AuthWrapper: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return authMode === 'login' ? (
      <Login onToggleMode={() => setAuthMode('register')} />
    ) : (
      <Register onToggleMode={() => setAuthMode('login')} />
    );
  }

  return <AuthenticatedApp />;
};

function App() {
  return (
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  );
}

export default App;
