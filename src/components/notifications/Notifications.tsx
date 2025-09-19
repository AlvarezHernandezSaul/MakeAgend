import React, { useState, useMemo } from 'react';
import { useBusinessData } from '../../hooks/useBusinessData';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Bell, 
  Calendar, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Settings
} from 'lucide-react';
import { format, isToday, isTomorrow, addDays, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

type NotificationType = 'appointment' | 'reminder' | 'alert' | 'system';
type NotificationPriority = 'low' | 'medium' | 'high';

interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionRequired?: boolean;
}

export const Notifications: React.FC = () => {
  const { currentUser } = useAuth();
  const { appointments, clients, loading } = useBusinessData(currentUser?.businessId || undefined);
  
  const [filter, setFilter] = useState<'all' | 'unread' | 'high'>('all');
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  // Generate notifications based on business data
  const notifications = useMemo(() => {
    const notifs: Notification[] = [];
    const now = new Date();

    // Upcoming appointments today
    const todayAppointments = appointments.filter(apt => 
      isToday(new Date(apt.date)) && apt.status === 'confirmed'
    );

    if (todayAppointments.length > 0) {
      notifs.push({
        id: 'today-appointments',
        type: 'appointment',
        priority: 'medium',
        title: 'Citas de Hoy',
        message: `Tienes ${todayAppointments.length} cita${todayAppointments.length > 1 ? 's' : ''} confirmada${todayAppointments.length > 1 ? 's' : ''} para hoy`,
        timestamp: now,
        read: readNotifications.has('today-appointments'),
        actionRequired: false
      });
    }

    // Tomorrow's appointments
    const tomorrowAppointments = appointments.filter(apt => 
      isTomorrow(new Date(apt.date)) && apt.status === 'confirmed'
    );

    if (tomorrowAppointments.length > 0) {
      notifs.push({
        id: 'tomorrow-appointments',
        type: 'reminder',
        priority: 'low',
        title: 'Citas de Mañana',
        message: `Tienes ${tomorrowAppointments.length} cita${tomorrowAppointments.length > 1 ? 's' : ''} programada${tomorrowAppointments.length > 1 ? 's' : ''} para mañana`,
        timestamp: now,
        read: readNotifications.has('tomorrow-appointments'),
        actionRequired: false
      });
    }

    // Pending appointments
    const pendingAppointments = appointments.filter(apt => apt.status === 'pending');
    if (pendingAppointments.length > 0) {
      notifs.push({
        id: 'pending-appointments',
        type: 'alert',
        priority: 'high',
        title: 'Citas Pendientes de Confirmación',
        message: `${pendingAppointments.length} cita${pendingAppointments.length > 1 ? 's' : ''} pendiente${pendingAppointments.length > 1 ? 's' : ''} de confirmación`,
        timestamp: now,
        read: readNotifications.has('pending-appointments'),
        actionRequired: true
      });
    }

    // Overdue appointments (past appointments still pending)
    const overdueAppointments = appointments.filter(apt => 
      apt.status === 'pending' && isBefore(new Date(apt.date), now)
    );

    if (overdueAppointments.length > 0) {
      notifs.push({
        id: 'overdue-appointments',
        type: 'alert',
        priority: 'high',
        title: 'Citas Vencidas',
        message: `${overdueAppointments.length} cita${overdueAppointments.length > 1 ? 's' : ''} vencida${overdueAppointments.length > 1 ? 's' : ''} requiere${overdueAppointments.length === 1 ? '' : 'n'} atención`,
        timestamp: now,
        read: readNotifications.has('overdue-appointments'),
        actionRequired: true
      });
    }

    // New clients this week
    const weekAgo = addDays(now, -7);
    const newClients = clients.filter(client => 
      new Date(client.createdAt) > weekAgo
    );

    if (newClients.length > 0) {
      notifs.push({
        id: 'new-clients',
        type: 'system',
        priority: 'low',
        title: 'Nuevos Clientes',
        message: `${newClients.length} nuevo${newClients.length > 1 ? 's' : ''} cliente${newClients.length > 1 ? 's' : ''} registrado${newClients.length > 1 ? 's' : ''} esta semana`,
        timestamp: now,
        read: readNotifications.has('new-clients'),
        actionRequired: false
      });
    }

    // Clients with allergies (safety reminder)
    const clientsWithAllergies = clients.filter(client => 
      client.allergies && client.allergies.length > 0
    );

    if (clientsWithAllergies.length > 0) {
      notifs.push({
        id: 'allergy-reminder',
        type: 'alert',
        priority: 'medium',
        title: 'Recordatorio de Alergias',
        message: `${clientsWithAllergies.length} cliente${clientsWithAllergies.length > 1 ? 's' : ''} tiene${clientsWithAllergies.length === 1 ? '' : 'n'} alergias registradas`,
        timestamp: now,
        read: readNotifications.has('allergy-reminder'),
        actionRequired: false
      });
    }

    return notifs.sort((a, b) => {
      // Sort by priority first, then by timestamp
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }, [appointments, clients, readNotifications]);

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'high':
        return notification.priority === 'high';
      default:
        return true;
    }
  });

  const markAsRead = (notificationId: string) => {
    setReadNotifications(prev => new Set([...prev, notificationId]));
  };

  const markAllAsRead = () => {
    setReadNotifications(new Set(notifications.map(n => n.id)));
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-5 w-5" />;
      case 'reminder':
        return <Clock className="h-5 w-5" />;
      case 'alert':
        return <AlertTriangle className="h-5 w-5" />;
      case 'system':
        return <Users className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Bell className="h-6 w-6 text-pink-600 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
          {filteredNotifications.filter(n => !n.read).length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {filteredNotifications.filter(n => !n.read).length}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={markAllAsRead}
            className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Marcar todas como leídas
          </button>
          <button className="flex items-center px-3 py-1 text-sm bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-colors">
            <Settings className="h-4 w-4 mr-1" />
            Configurar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-pink-100 text-pink-800'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Todas ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            filter === 'unread'
              ? 'bg-pink-100 text-pink-800'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          No leídas ({notifications.filter(n => !n.read).length})
        </button>
        <button
          onClick={() => setFilter('high')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            filter === 'high'
              ? 'bg-pink-100 text-pink-800'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Prioridad Alta ({notifications.filter(n => n.priority === 'high').length})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay notificaciones</h3>
            <p className="text-gray-500">
              {filter === 'all' 
                ? 'No tienes notificaciones en este momento'
                : `No hay notificaciones ${filter === 'unread' ? 'sin leer' : 'de prioridad alta'}`
              }
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-lg shadow border-l-4 p-4 transition-all hover:shadow-md ${
                getPriorityColor(notification.priority)
              } ${notification.read ? 'opacity-75' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${getPriorityColor(notification.priority)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                      {notification.actionRequired && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                          Acción requerida
                        </span>
                      )}
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {format(notification.timestamp, 'dd MMM yyyy, HH:mm', { locale: es })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Marcar como leída"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Descartar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      {filteredNotifications.some(n => n.actionRequired) && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            <h3 className="font-medium text-yellow-800">Acciones Pendientes</h3>
          </div>
          <p className="text-yellow-700 mt-1 text-sm">
            Tienes notificaciones que requieren tu atención. Revisa las citas pendientes y vencidas.
          </p>
          <div className="mt-3 flex space-x-2">
            <button className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors">
              Ver Citas Pendientes
            </button>
            <button className="px-3 py-1 bg-white text-yellow-600 text-sm rounded-lg border border-yellow-600 hover:bg-yellow-50 transition-colors">
              Configurar Recordatorios
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
