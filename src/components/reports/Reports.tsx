import React, { useState, useMemo } from 'react';
import { useBusinessData } from '../../hooks/useBusinessData';
import { useAuth } from '../../contexts/AuthContext';
import { 
  BarChart3, 
  Calendar, 
  Users, 
  TrendingUp, 
  Filter,
  Scissors
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

type ReportPeriod = 'week' | 'month' | 'custom';

export const Reports: React.FC = () => {
  const { currentUser } = useAuth();
  const { appointments, clients, services, loading } = useBusinessData(currentUser?.businessId || undefined);
  
  const [period, setPeriod] = useState<ReportPeriod>('week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const getDateRange = () => {
    const now = new Date();
    
    switch (period) {
      case 'week':
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 })
        };
      case 'month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case 'custom':
        return {
          start: customStartDate ? new Date(customStartDate) : startOfWeek(now, { weekStartsOn: 1 }),
          end: customEndDate ? new Date(customEndDate) : endOfWeek(now, { weekStartsOn: 1 })
        };
      default:
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 })
        };
    }
  };

  const filteredAppointments = useMemo(() => {
    const { start, end } = getDateRange();
    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      return isWithinInterval(appointmentDate, { start, end });
    });
  }, [appointments, period, customStartDate, customEndDate]);

  const appointmentStats = useMemo(() => {
    const total = filteredAppointments.length;
    const confirmed = filteredAppointments.filter(a => a.status === 'confirmed').length;
    const completed = filteredAppointments.filter(a => a.status === 'completed').length;
    const cancelled = filteredAppointments.filter(a => a.status === 'cancelled').length;
    const pending = filteredAppointments.filter(a => a.status === 'pending').length;
    const noShow = filteredAppointments.filter(a => a.status === 'no-show').length;

    return { total, confirmed, completed, cancelled, pending, noShow };
  }, [filteredAppointments]);

  const serviceStats = useMemo(() => {
    const serviceCount = services.reduce((acc, service) => {
      const count = filteredAppointments.filter(a => a.serviceId === service.id).length;
      if (count > 0) {
        acc.push({
          serviceId: service.id,
          serviceName: service.name,
          appointmentCount: count,
          category: service.category
        });
      }
      return acc;
    }, [] as Array<{ serviceId: string; serviceName: string; appointmentCount: number; category: string }>);

    return serviceCount.sort((a, b) => b.appointmentCount - a.appointmentCount);
  }, [services, filteredAppointments]);

  const clientStats = useMemo(() => {
    const { start, end } = getDateRange();
    const clientsWithAppointments = new Set(filteredAppointments.map(a => a.clientId));
    const newClients = clients.filter(client => {
      const clientDate = new Date(client.createdAt);
      return isWithinInterval(clientDate, { start, end });
    });

    return {
      totalClients: clients.length,
      activeClients: clientsWithAppointments.size,
      newClients: newClients.length
    };
  }, [clients, filteredAppointments, period, customStartDate, customEndDate]);

  const { start, end } = getDateRange();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center mb-4 sm:mb-0">
          <BarChart3 className="h-6 w-6 text-pink-600 mr-2" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reportes y Análisis</h1>
        </div>
      </div>

      {/* Period Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:space-y-0 lg:space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Período:</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-2 text-sm rounded-md whitespace-nowrap ${
                period === 'week'
                  ? 'bg-pink-100 text-pink-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-2 text-sm rounded-md whitespace-nowrap ${
                period === 'month'
                  ? 'bg-pink-100 text-pink-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Este Mes
            </button>
            <button
              onClick={() => setPeriod('custom')}
              className={`px-3 py-2 text-sm rounded-md whitespace-nowrap ${
                period === 'custom'
                  ? 'bg-pink-100 text-pink-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Personalizado
            </button>
          </div>

          {period === 'custom' && (
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <input
                type="date"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full sm:w-auto"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
              <span className="text-gray-500 text-center sm:text-left">a</span>
              <input
                type="date"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full sm:w-auto"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          )}

          <div className="text-sm text-gray-500 text-center lg:text-left">
            {format(start, 'dd MMM', { locale: es })} - {format(end, 'dd MMM yyyy', { locale: es })}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="bg-blue-500 rounded-lg p-2 sm:p-3 flex-shrink-0">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Citas</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600">{appointmentStats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="bg-green-500 rounded-lg p-2 sm:p-3 flex-shrink-0">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Completadas</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{appointmentStats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="bg-purple-500 rounded-lg p-2 sm:p-3 flex-shrink-0">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Clientes Activos</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-600">{clientStats.activeClients}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="bg-yellow-500 rounded-lg p-2 sm:p-3 flex-shrink-0">
              <Scissors className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Servicios Usados</p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">{serviceStats.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Appointment Status Chart */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Estado de Citas</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Completadas</span>
              </div>
              <span className="text-sm font-medium">{appointmentStats.completed}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Confirmadas</span>
              </div>
              <span className="text-sm font-medium">{appointmentStats.confirmed}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Pendientes</span>
              </div>
              <span className="text-sm font-medium">{appointmentStats.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Canceladas</span>
              </div>
              <span className="text-sm font-medium">{appointmentStats.cancelled}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">No asistieron</span>
              </div>
              <span className="text-sm font-medium">{appointmentStats.noShow}</span>
            </div>
          </div>
        </div>

        {/* Top Services */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Servicios Más Solicitados</h3>
          <div className="space-y-3">
            {serviceStats.slice(0, 5).map((service, index) => (
              <div key={service.serviceId} className="flex items-center justify-between">
                <div className="flex items-center min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-500 w-6 flex-shrink-0">#{index + 1}</span>
                  <div className="ml-3 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{service.serviceName}</p>
                    <p className="text-xs text-gray-500 truncate">{service.category}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-pink-600 flex-shrink-0 ml-2">{service.appointmentCount}</span>
              </div>
            ))}
            {serviceStats.length === 0 && (
              <p className="text-gray-500 text-center py-4">No hay datos de servicios</p>
            )}
          </div>
        </div>

        {/* Client Statistics */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Estadísticas de Clientes</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600">Total de clientes</span>
              <span className="text-base sm:text-lg font-semibold text-gray-900">{clientStats.totalClients}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600">Clientes activos en período</span>
              <span className="text-base sm:text-lg font-semibold text-green-600">{clientStats.activeClients}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600">Nuevos clientes</span>
              <span className="text-base sm:text-lg font-semibold text-blue-600">{clientStats.newClients}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600">Tasa de actividad</span>
              <span className="text-base sm:text-lg font-semibold text-purple-600">
                {clientStats.totalClients > 0 
                  ? Math.round((clientStats.activeClients / clientStats.totalClients) * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Resumen de Rendimiento</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600">Tasa de completación</span>
              <span className="text-base sm:text-lg font-semibold text-green-600">
                {appointmentStats.total > 0 
                  ? Math.round((appointmentStats.completed / appointmentStats.total) * 100)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600">Tasa de cancelación</span>
              <span className="text-base sm:text-lg font-semibold text-red-600">
                {appointmentStats.total > 0 
                  ? Math.round((appointmentStats.cancelled / appointmentStats.total) * 100)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600">Tasa de no asistencia</span>
              <span className="text-base sm:text-lg font-semibold text-purple-600">
                {appointmentStats.total > 0 
                  ? Math.round((appointmentStats.noShow / appointmentStats.total) * 100)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600">Promedio citas/día</span>
              <span className="text-base sm:text-lg font-semibold text-blue-600">
                {Math.round(appointmentStats.total / 7)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
