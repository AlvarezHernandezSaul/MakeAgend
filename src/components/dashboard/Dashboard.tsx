import React, { useState, useEffect } from 'react';
import { useBusinessData } from '../../hooks/useBusinessData';
import { useAuth } from '../../contexts/AuthContext';
import { useLicenseGuard } from '../../hooks/useLicenseGuard';
import { BusinessManager } from '../business/BusinessManager';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { 
  Calendar, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  XCircle,
  UserCheck,
  Key,
  Copy
} from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';

export const Dashboard: React.FC = () => {
  const { currentUser, currentBusiness } = useAuth();
  const [ownerInfo, setOwnerInfo] = useState<{ displayName: string; email: string } | null>(null);
  
  // Determinar el businessId según el rol del usuario
  const businessId = currentUser?.role === 'owner' 
    ? currentUser?.businessId 
    : currentBusiness;
  
  const { business, appointments, clients, services, loading } = useBusinessData(businessId || undefined);
  const { licenseStatus } = useLicenseGuard();

  // Obtener información del propietario para asistentes
  useEffect(() => {
    const fetchOwnerInfo = async () => {
      if (currentUser?.role === 'assistant' && business?.ownerId) {
        try {
          const ownerRef = ref(database, `users/${business.ownerId}`);
          const ownerSnapshot = await get(ownerRef);
          
          if (ownerSnapshot.exists()) {
            const ownerData = ownerSnapshot.val();
            setOwnerInfo({
              displayName: ownerData.displayName || 'Propietario',
              email: ownerData.email || ''
            });
          }
        } catch (error) {
          console.error('Error fetching owner info:', error);
        }
      }
    };

    fetchOwnerInfo();
  }, [currentUser?.role, business?.ownerId]);

  const copyBusinessKey = async () => {
    if (business?.businessKey) {
      try {
        await navigator.clipboard.writeText(business.businessKey);
        // Aquí podrías agregar una notificación de éxito
      } catch (err) {
        console.error('Error al copiar la clave:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  // Calculate statistics
  const todayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date + 'T00:00:00');
    return isToday(aptDate);
  });

  const tomorrowAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date + 'T00:00:00');
    return isTomorrow(aptDate);
  });

  const pendingAppointments = appointments.filter(apt => apt.status === 'pending');
  const confirmedAppointments = appointments.filter(apt => apt.status === 'confirmed');

  const thisWeekAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date);
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return aptDate >= weekStart && aptDate <= weekEnd;
  });

  const occupancyRate = todayAppointments.length > 0 
    ? Math.round((confirmedAppointments.filter(apt => isToday(new Date(apt.date))).length / todayAppointments.length) * 100)
    : 0;

  // Crear estadística de licencia solo para owners y assistants
  const licenseStats = currentUser?.role !== 'admin' && licenseStatus ? {
    title: 'Estado de Licencia',
    value: licenseStatus.isValid 
      ? (licenseStatus.isExpiringSoon ? `${licenseStatus.daysRemaining} días` : 'Activa')
      : 'Expirada',
    icon: licenseStatus.isValid 
      ? (licenseStatus.isExpiringSoon ? AlertCircle : CheckCircle)
      : XCircle,
    color: licenseStatus.isValid 
      ? (licenseStatus.isExpiringSoon ? 'bg-yellow-500' : 'bg-green-500')
      : 'bg-red-500',
    textColor: licenseStatus.isValid 
      ? (licenseStatus.isExpiringSoon ? 'text-yellow-600' : 'text-green-600')
      : 'text-red-600'
  } : null;

  const stats = [
    {
      title: 'Citas Hoy',
      value: todayAppointments.length,
      icon: Calendar,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Clientes Registrados',
      value: clients.length,
      icon: Users,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Citas Pendientes',
      value: pendingAppointments.length,
      icon: Clock,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Ocupación Hoy',
      value: `${occupancyRate}%`,
      icon: TrendingUp,
      color: 'bg-purple-500',
      textColor: 'text-purple-600'
    },
    ...(licenseStats ? [licenseStats] : [])
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'completed':
        return <UserCheck className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmada';
      case 'pending':
        return 'Pendiente';
      case 'cancelled':
        return 'Cancelada';
      case 'completed':
        return 'Completada';
      case 'no-show':
        return 'No asistió';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              ¡Bienvenido de vuelta, {currentUser?.displayName || 'Usuario'}!
            </h1>
            <p className="text-pink-100">
              {business?.name || 'Tu negocio'} - {format(new Date(), 'EEEE, d MMMM yyyy', { locale: es })}
            </p>
          </div>
          
          {/* Business Key para owners */}
          {currentUser?.role === 'owner' && business?.businessKey && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 min-w-[200px]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Key className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">Clave del Negocio</span>
                </div>
                <button
                  onClick={copyBusinessKey}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                  title="Copiar clave"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="font-mono text-lg font-bold tracking-wider">
                {business.businessKey}
              </div>
              <p className="text-xs text-pink-100 mt-1">
                Comparte esta clave con tus asistentes
              </p>
            </div>
          )}

          {/* Owner Info para asistentes */}
          {currentUser?.role === 'assistant' && ownerInfo && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 min-w-[200px]">
              <div className="flex items-center mb-2">
                <UserCheck className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Propietario</span>
              </div>
              <div className="text-lg font-bold">
                {ownerInfo.displayName}
              </div>
              <p className="text-xs text-pink-100 mt-1">
                {ownerInfo.email}
              </p>
              <div className="mt-2 px-2 py-1 bg-white/20 rounded text-xs">
                Acceso como Asistente
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`${stat.color} rounded-lg p-3`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Appointments */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Citas de Hoy</h2>
          </div>
          <div className="p-6">
            {todayAppointments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay citas programadas para hoy</p>
            ) : (
              <div className="space-y-4">
                {todayAppointments.slice(0, 5).map((appointment) => {
                  const client = clients.find(c => c.id === appointment.clientId);
                  const service = services.find(s => s.id === appointment.serviceId);
                  
                  return (
                    <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(appointment.status)}
                        <div>
                          <p className="font-medium text-gray-900">{client?.name || 'Cliente'}</p>
                          <p className="text-sm text-gray-600">{service?.name || 'Servicio'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{appointment.startTime}</p>
                        <p className="text-xs text-gray-500">{getStatusText(appointment.status)}</p>
                      </div>
                    </div>
                  );
                })}
                {todayAppointments.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    +{todayAppointments.length - 5} citas más
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tomorrow's Appointments */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Citas de Mañana</h2>
          </div>
          <div className="p-6">
            {tomorrowAppointments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay citas programadas para mañana</p>
            ) : (
              <div className="space-y-4">
                {tomorrowAppointments.slice(0, 5).map((appointment) => {
                  const client = clients.find(c => c.id === appointment.clientId);
                  const service = services.find(s => s.id === appointment.serviceId);
                  
                  return (
                    <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(appointment.status)}
                        <div>
                          <p className="font-medium text-gray-900">{client?.name || 'Cliente'}</p>
                          <p className="text-sm text-gray-600">{service?.name || 'Servicio'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{appointment.startTime}</p>
                        <p className="text-xs text-gray-500">{getStatusText(appointment.status)}</p>
                      </div>
                    </div>
                  );
                })}
                {tomorrowAppointments.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    +{tomorrowAppointments.length - 5} citas más
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pending Actions */}
      {pendingAppointments.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <h2 className="text-lg font-semibold text-yellow-800">Acciones Pendientes</h2>
          </div>
          <p className="text-yellow-700">
            Tienes {pendingAppointments.length} cita{pendingAppointments.length !== 1 ? 's' : ''} pendiente{pendingAppointments.length !== 1 ? 's' : ''} de confirmación.
          </p>
        </div>
      )}

      {/* Business Manager for Assistants */}
      {currentUser?.role === 'assistant' && (
        <BusinessManager />
      )}

      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen Semanal</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{thisWeekAppointments.length}</p>
            <p className="text-sm text-gray-600">Citas esta semana</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{services.length}</p>
            <p className="text-sm text-gray-600">Servicios disponibles</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{clients.length}</p>
            <p className="text-sm text-gray-600">Clientes registrados</p>
          </div>
        </div>
      </div>
    </div>
  );
};
