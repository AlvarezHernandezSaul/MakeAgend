import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { licenseService } from '../../utils/licenseService';
import { notificationService } from '../../utils/notificationService';
import type { Business, BusinessLicense } from '../../types';
import MakeAgendLogo from '../../assets/images/MakeAgend.png';
import { 
  Building2, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Shield,
  LogOut,
  Search,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BusinessWithLicense extends Business {
  id: string;
  daysRemaining?: number;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
}

export const AdminDashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessWithLicense[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<BusinessWithLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessWithLicense | null>(null);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [newLicenseType, setNewLicenseType] = useState<BusinessLicense['type']>('1month');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      const allBusinesses = await licenseService.getAllBusinessesWithLicenses();
      
      // Enriquecer con información de licencias
      const enrichedBusinesses = allBusinesses.map(business => {
        const enriched: BusinessWithLicense = { ...business };
        
        if (business.license) {
          enriched.daysRemaining = licenseService.getDaysRemaining(business.license);
          enriched.isExpired = licenseService.isLicenseExpired(business.license);
          enriched.isExpiringSoon = licenseService.isLicenseExpiringSoon(business.license);
        } else {
          enriched.isExpired = true;
          enriched.daysRemaining = 0;
        }
        
        return enriched;
      });
      
      setBusinesses(enrichedBusinesses);
      setFilteredBusinesses(enrichedBusinesses);
    } catch (error) {
      console.error('Error loading businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignLicense = async (businessId: string, licenseType: BusinessLicense['type']) => {
    try {
      await licenseService.assignLicense(businessId, licenseType, currentUser?.uid || '');
      
      // Enviar notificación al propietario del negocio
      const business = businesses.find(b => b.id === businessId);
      if (business) {
        await notificationService.notifyAccountReactivated(business.ownerId, businessId);
      }
      
      await loadBusinesses();
      setIsLicenseModalOpen(false);
      setSelectedBusiness(null);
    } catch (error) {
      console.error('Error assigning license:', error);
      alert('Error al asignar licencia');
    }
  };

  const handleCancelLicense = async (businessId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (!business) return;

    const confirmCancel = window.confirm(
      `¿Estás seguro de que deseas cancelar la licencia de "${business.name}"?\n\n` +
      'Esta acción:\n' +
      '• Bloqueará inmediatamente la cuenta\n' +
      '• Desactivará el acceso al sistema\n' +
      '• No se puede deshacer\n\n' +
      '¿Continuar?'
    );

    if (!confirmCancel) return;

    try {
      await licenseService.cancelLicense(businessId, currentUser?.uid || '');
      
      // Enviar notificación al propietario
      if (business) {
        await notificationService.notifyAccountBlocked(business.ownerId, 'Licencia cancelada por administrador');
      }
      
      await loadBusinesses();
      alert('Licencia cancelada exitosamente. La cuenta ha sido bloqueada.');
    } catch (error) {
      console.error('Error canceling license:', error);
      alert('Error al cancelar licencia: ' + (error as Error).message);
    }
  };

  const getStatusColor = (business: BusinessWithLicense) => {
    if (business.isExpired) return 'text-red-600 bg-red-50';
    if (business.isExpiringSoon) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getStatusIcon = (business: BusinessWithLicense) => {
    if (business.isExpired) return <XCircle className="h-4 w-4" />;
    if (business.isExpiringSoon) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusText = (business: BusinessWithLicense) => {
    if (business.isExpired) return 'Expirada';
    if (business.isExpiringSoon) return `Expira en ${business.daysRemaining} días`;
    return `${business.daysRemaining} días restantes`;
  };

  const getLicenseTypeLabel = (type: BusinessLicense['type']) => {
    const labels = {
      '15days': '15 días',
      '1month': '1 mes',
      '3months': '3 meses',
      '6months': '6 meses',
      '1year': '1 año'
    };
    return labels[type];
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    filterBusinesses(term, statusFilter);
  };

  const handleStatusFilter = (status: 'all' | 'active' | 'expiring' | 'expired') => {
    setStatusFilter(status);
    filterBusinesses(searchTerm, status);
  };

  const filterBusinesses = (term: string, status: 'all' | 'active' | 'expiring' | 'expired') => {
    let filtered = businesses;

    // Filtrar por término de búsqueda
    if (term) {
      filtered = filtered.filter(business => 
        business.name.toLowerCase().includes(term.toLowerCase()) ||
        business.id.toLowerCase().includes(term.toLowerCase()) ||
        business.ownerId.toLowerCase().includes(term.toLowerCase())
      );
    }

    // Filtrar por estado
    if (status !== 'all') {
      filtered = filtered.filter(business => {
        switch (status) {
          case 'active':
            return !business.isExpired && !business.isExpiringSoon;
          case 'expiring':
            return business.isExpiringSoon && !business.isExpired;
          case 'expired':
            return business.isExpired;
          default:
            return true;
        }
      });
    }

    setFilteredBusinesses(filtered);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <img 
            src={MakeAgendLogo} 
            alt="MakeAgend" 
            className="h-8 w-auto mr-3"
          />
          <Shield className="h-6 w-6 text-pink-600 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            Bienvenido, {currentUser?.displayName}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Negocios</p>
              <p className="text-2xl font-bold text-gray-900">{businesses.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-gray-900">
                {businesses.filter(b => !b.isExpired).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Por Expirar</p>
              <p className="text-2xl font-bold text-gray-900">
                {businesses.filter(b => b.isExpiringSoon && !b.isExpired).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Expirados</p>
              <p className="text-2xl font-bold text-gray-900">
                {businesses.filter(b => b.isExpired).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, ID o propietario..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />
              {searchTerm && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Status Filter */}
          <div className="flex space-x-2">
            {[
              { key: 'all', label: 'Todos', count: businesses.length },
              { key: 'active', label: 'Activos', count: businesses.filter(b => !b.isExpired && !b.isExpiringSoon).length },
              { key: 'expiring', label: 'Por Expirar', count: businesses.filter(b => b.isExpiringSoon && !b.isExpired).length },
              { key: 'expired', label: 'Expirados', count: businesses.filter(b => b.isExpired).length }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => handleStatusFilter(key as any)}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  statusFilter === key
                    ? 'bg-pink-100 text-pink-800 border border-pink-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Businesses Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Gestión de Negocios</h2>
            <span className="text-sm text-gray-500">
              Mostrando {filteredBusinesses.length} de {businesses.length} negocios
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Negocio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Propietario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Creación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado Licencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo Licencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBusinesses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'No se encontraron negocios que coincidan con los filtros aplicados.'
                      : 'No hay negocios registrados.'
                    }
                  </td>
                </tr>
              ) : (
                filteredBusinesses.map((business) => (
                <tr key={business.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {business.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {business.id}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{business.ownerId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {format(new Date(business.createdAt), 'dd MMM yyyy', { locale: es })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(business)}`}>
                      {getStatusIcon(business)}
                      <span className="ml-1">{getStatusText(business)}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {business.license ? getLicenseTypeLabel(business.license.type) : 'Sin licencia'}
                    </div>
                    {business.license && (
                      <div className="text-xs text-gray-500">
                        Expira: {format(new Date(business.license.endDate), 'dd MMM yyyy', { locale: es })}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedBusiness(business);
                          setIsLicenseModalOpen(true);
                        }}
                        className="text-pink-600 hover:text-pink-900"
                      >
                        {business.isExpired ? 'Reactivar' : 'Extender'}
                      </button>
                      
                      {!business.isExpired && business.license && (
                        <button
                          onClick={() => handleCancelLicense(business.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Cancelar licencia y bloquear cuenta"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* License Assignment Modal */}
      {isLicenseModalOpen && selectedBusiness && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Asignar Licencia - {selectedBusiness.name}
              </h3>
            </div>
            
            <div className="px-6 py-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Licencia
                </label>
                <select
                  value={newLicenseType}
                  onChange={(e) => setNewLicenseType(e.target.value as BusinessLicense['type'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                >
                  <option value="15days">15 días</option>
                  <option value="1month">1 mes</option>
                  <option value="3months">3 meses</option>
                  <option value="6months">6 meses</option>
                  <option value="1year">1 año</option>
                </select>
              </div>
              
              {selectedBusiness.license && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600">
                    <strong>Licencia actual:</strong> {getLicenseTypeLabel(selectedBusiness.license.type)}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Expira:</strong> {format(new Date(selectedBusiness.license.endDate), 'dd MMM yyyy HH:mm', { locale: es })}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Renovaciones:</strong> {selectedBusiness.license.renewalCount}
                  </p>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsLicenseModalOpen(false);
                  setSelectedBusiness(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleAssignLicense(selectedBusiness.id, newLicenseType)}
                className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
              >
                Asignar Licencia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
