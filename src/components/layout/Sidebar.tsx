import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BusinessSelector } from './BusinessSelector';
import { useLicenseGuard } from '../../hooks/useLicenseGuard';
import { 
  Calendar, 
  Users, 
  Settings, 
  BarChart3, 
  Scissors, 
  Bell, 
  LogOut,
  Home,
  X,
  ChevronLeft
} from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeSection, 
  onSectionChange, 
  isOpen, 
  onClose, 
  isCollapsed, 
  onToggleCollapse 
}) => {
  const { currentUser, logout } = useAuth();
  const { canAccessSection, getLicenseStatusMessage, isBlocked } = useLicenseGuard();

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'appointments', label: 'Citas', icon: Calendar },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'services', label: 'Servicios', icon: Scissors },
    { id: 'reports', label: 'Reportes', icon: BarChart3 },
    { id: 'notifications', label: 'Notificaciones', icon: Bell }
  ];

  // Usar todos los elementos del menú
  const menuItems = allMenuItems;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleSectionChange = (section: string) => {
    onSectionChange(section);
    // Close mobile sidebar when item is selected
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 
        ${isCollapsed ? 'w-16' : 'w-64'} 
        bg-white shadow-lg h-screen flex flex-col transition-all duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className={`${isCollapsed ? 'p-4' : 'p-6'} border-b border-gray-200 flex items-center justify-between`}>
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold text-pink-600">MakeAgend</h1>
              <p className="text-sm text-gray-600 mt-1">
                {currentUser?.role === 'owner' ? 'Propietario' : 'Asistente'}
              </p>
            </div>
          )}
          
          {isCollapsed && (
            <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">M</span>
            </div>
          )}

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Desktop collapse button */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:block p-1 rounded-md text-gray-400 hover:text-gray-600"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Business Selector for Assistants */}
        {!isCollapsed && (
          <div className="px-4 py-3 border-b border-gray-200">
            <BusinessSelector />
          </div>
        )}

        {/* License Status Warning */}
        {!isCollapsed && getLicenseStatusMessage() && (
          <div className="px-4 py-3 border-b border-gray-200">
            <div className={`p-3 rounded-lg text-sm ${
              isBlocked 
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
            }`}>
              <div className="font-medium mb-1">
                {isBlocked ? '⚠️ Cuenta Bloqueada' : '⚠️ Atención'}
              </div>
              <div className="text-xs">
                {getLicenseStatusMessage()}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              const hasAccess = canAccessSection(item.id);
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => hasAccess ? handleSectionChange(item.id) : null}
                    disabled={!hasAccess}
                    className={`w-full flex items-center ${isCollapsed ? 'px-2 py-3 justify-center' : 'px-4 py-3'} text-left rounded-lg transition-colors ${
                      !hasAccess
                        ? 'text-gray-400 cursor-not-allowed opacity-50'
                        : isActive
                        ? 'bg-pink-50 text-pink-700 border-r-2 border-pink-500'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    title={isCollapsed ? item.label : (!hasAccess ? `${item.label} (Acceso restringido)` : undefined)}
                  >
                    <Icon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'} ${
                      !hasAccess 
                        ? 'text-gray-300' 
                        : isActive 
                        ? 'text-pink-500' 
                        : 'text-gray-400'
                    }`} />
                    {!isCollapsed && (
                      <span className={`font-medium ${!hasAccess ? 'line-through' : ''}`}>
                        {item.label}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Settings and Logout */}
        <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-gray-200 space-y-2`}>
          {currentUser?.role === 'owner' && (
            <button
              onClick={() => handleSectionChange('settings')}
              className={`w-full flex items-center ${isCollapsed ? 'px-2 py-3 justify-center' : 'px-4 py-3'} text-left rounded-lg transition-colors ${
                activeSection === 'settings'
                  ? 'bg-pink-50 text-pink-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              title={isCollapsed ? 'Configuración' : undefined}
            >
              <Settings className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'} text-gray-400`} />
              {!isCollapsed && <span className="font-medium">Configuración</span>}
            </button>
          )}
          
          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${isCollapsed ? 'px-2 py-3 justify-center' : 'px-4 py-3'} text-left rounded-lg text-red-600 hover:bg-red-50 transition-colors`}
            title={isCollapsed ? 'Cerrar Sesión' : undefined}
          >
            <LogOut className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} />
            {!isCollapsed && <span className="font-medium">Cerrar Sesión</span>}
          </button>
        </div>

        {/* User Info */}
        {!isCollapsed && (
          <div className="p-4 bg-gray-50">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {currentUser?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {currentUser?.displayName || currentUser?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-gray-500">{currentUser?.email}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
