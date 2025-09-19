import { ref, push, set, get, update, onValue, off, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../config/firebase';
import type { Notification } from '../types';

export class NotificationService {
  private static instance: NotificationService;
  private listeners: Map<string, () => void> = new Map();

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Crear una nueva notificación
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<string> {
    const notificationsRef = ref(database, 'notifications');
    const newNotificationRef = push(notificationsRef);
    
    if (!newNotificationRef.key) {
      throw new Error('No se pudo generar ID para la notificación');
    }

    // Limpiar mensaje de referencias a localhost o URLs de desarrollo
    const cleanMessage = this.cleanNotificationMessage(notification.message);
    const cleanTitle = this.cleanNotificationMessage(notification.title);

    const fullNotification: Notification = {
      ...notification,
      id: newNotificationRef.key,
      title: cleanTitle,
      message: cleanMessage,
      createdAt: new Date().toISOString(),
      isRead: false
    };

    await set(newNotificationRef, fullNotification);
    return newNotificationRef.key;
  }

  // Limpiar mensajes de notificación
  private cleanNotificationMessage(message: string): string {
    return message
      .replace(/localhost:\d+/g, 'MakeAgend')
      .replace(/http:\/\/localhost:\d+/g, 'MakeAgend')
      .replace(/https?:\/\/localhost:\d+/g, 'MakeAgend')
      .replace(/127\.0\.0\.1:\d+/g, 'MakeAgend')
      .replace(/\b(localhost|127\.0\.0\.1)\b/g, 'MakeAgend')
      .trim();
  }

  // Obtener notificaciones de un usuario
  async getUserNotifications(userId: string): Promise<Notification[]> {
    const notificationsRef = ref(database, 'notifications');
    const userQuery = query(notificationsRef, orderByChild('userId'), equalTo(userId));
    const snapshot = await get(userQuery);
    
    if (!snapshot.exists()) return [];
    
    const notifications: Notification[] = [];
    snapshot.forEach(childSnapshot => {
      notifications.push({
        id: childSnapshot.key!,
        ...childSnapshot.val()
      });
    });
    
    // Ordenar por fecha (más reciente primero)
    return notifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Obtener notificaciones de un negocio
  async getBusinessNotifications(businessId: string): Promise<Notification[]> {
    const notificationsRef = ref(database, 'notifications');
    const businessQuery = query(notificationsRef, orderByChild('businessId'), equalTo(businessId));
    const snapshot = await get(businessQuery);
    
    if (!snapshot.exists()) return [];
    
    const notifications: Notification[] = [];
    snapshot.forEach(childSnapshot => {
      notifications.push({
        id: childSnapshot.key!,
        ...childSnapshot.val()
      });
    });
    
    return notifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Marcar notificación como leída
  async markAsRead(notificationId: string): Promise<void> {
    const notificationRef = ref(database, `notifications/${notificationId}`);
    await update(notificationRef, {
      isRead: true,
      readAt: new Date().toISOString()
    });
  }

  // Marcar todas las notificaciones de un usuario como leídas
  async markAllAsRead(userId: string): Promise<void> {
    const notifications = await this.getUserNotifications(userId);
    const updates: Record<string, any> = {};
    
    notifications.filter(n => !n.isRead).forEach(notification => {
      updates[`notifications/${notification.id}/isRead`] = true;
      updates[`notifications/${notification.id}/readAt`] = new Date().toISOString();
    });
    
    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
    }
  }

  // Eliminar notificación
  async deleteNotification(notificationId: string): Promise<void> {
    const notificationRef = ref(database, `notifications/${notificationId}`);
    await set(notificationRef, null);
  }

  // Configurar listener en tiempo real para notificaciones de usuario
  subscribeToUserNotifications(userId: string, callback: (notifications: Notification[]) => void): () => void {
    const notificationsRef = ref(database, 'notifications');
    const userQuery = query(notificationsRef, orderByChild('userId'), equalTo(userId));
    
    const unsubscribe = onValue(userQuery, (snapshot) => {
      const notifications: Notification[] = [];
      
      if (snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
          notifications.push({
            id: childSnapshot.key!,
            ...childSnapshot.val()
          });
        });
      }
      
      // Ordenar por fecha (más reciente primero)
      const sortedNotifications = notifications.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      callback(sortedNotifications);
    });

    // Guardar referencia para cleanup
    this.listeners.set(`user_${userId}`, () => {
      off(userQuery, 'value', unsubscribe);
    });

    return () => {
      off(userQuery, 'value', unsubscribe);
      this.listeners.delete(`user_${userId}`);
    };
  }

  // Limpiar todos los listeners
  cleanup(): void {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
  }

  // Notificaciones específicas del sistema

  // Notificación de licencia próxima a expirar
  async notifyLicenseExpiring(businessId: string, ownerId: string, daysRemaining: number): Promise<void> {
    await this.createNotification({
      type: 'license_expiring',
      title: 'Licencia próxima a expirar',
      message: `Su licencia expira en ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}. Contacte al administrador para renovar.`,
      priority: 'high',
      businessId,
      userId: ownerId,
      actionUrl: '/contact-admin'
    });
  }

  // Notificación de licencia expirada
  async notifyLicenseExpired(businessId: string, ownerId: string): Promise<void> {
    await this.createNotification({
      type: 'license_expired',
      title: 'Licencia expirada',
      message: 'Su licencia ha expirado. Su cuenta ha sido bloqueada. Contacte al administrador para reactivar.',
      priority: 'critical',
      businessId,
      userId: ownerId,
      actionUrl: '/contact-admin'
    });
  }

  // Notificación de cuenta bloqueada
  async notifyAccountBlocked(userId: string, reason: string): Promise<void> {
    await this.createNotification({
      type: 'account_blocked',
      title: 'Cuenta bloqueada',
      message: `Su cuenta ha sido bloqueada. Motivo: ${reason}`,
      priority: 'critical',
      userId,
      actionUrl: '/contact-admin'
    });
  }

  // Notificación de cuenta reactivada
  async notifyAccountReactivated(userId: string, businessId?: string): Promise<void> {
    await this.createNotification({
      type: 'account_reactivated',
      title: 'Cuenta reactivada',
      message: 'Su cuenta ha sido reactivada. Ya puede acceder a todas las funcionalidades.',
      priority: 'medium',
      userId,
      businessId
    });
  }

  // Notificación de asistente vinculado
  async notifyAssistantLinked(businessId: string, ownerId: string, assistantName: string): Promise<void> {
    await this.createNotification({
      type: 'assistant_linked',
      title: 'Nuevo asistente vinculado',
      message: `${assistantName} se ha vinculado a su negocio como asistente.`,
      priority: 'medium',
      businessId,
      userId: ownerId
    });
  }

  // Notificación de expediente actualizado
  async notifyRecordUpdated(businessId: string, clientName: string, updatedBy: string, targetUserId?: string): Promise<void> {
    await this.createNotification({
      type: 'record_updated',
      title: 'Expediente actualizado',
      message: `El expediente de ${clientName} ha sido actualizado por ${updatedBy}.`,
      priority: 'low',
      businessId,
      userId: targetUserId
    });
  }

  // Notificación para admin sobre solicitud de reactivación
  async notifyAdminReactivationRequest(businessId: string, businessName: string, ownerEmail: string): Promise<void> {
    // Obtener el ID del admin (usuario con email específico)
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    
    if (snapshot.exists()) {
      const users = snapshot.val();
      const adminUser = Object.keys(users).find(userId => 
        users[userId].email === 'sauldisel4@gmail.com' && users[userId].role === 'admin'
      );
      
      if (adminUser) {
        await this.createNotification({
          type: 'system',
          title: 'Solicitud de reactivación',
          message: `${businessName} (${ownerEmail}) solicita reactivación de licencia.`,
          priority: 'high',
          userId: adminUser,
          metadata: {
            businessId,
            businessName,
            ownerEmail,
            requestType: 'reactivation'
          }
        });
      }
    }
  }

  // Crear notificaciones específicas para expedientes digitales
  async createRecordNotification(
    businessId: string, 
    clientName: string, 
    action: 'created' | 'updated' | 'deleted',
    createdBy: string
  ): Promise<void> {
    try {
      const actionMessages = {
        created: 'Se creó un nuevo registro en el expediente',
        updated: 'Se actualizó un registro en el expediente',
        deleted: 'Se eliminó un registro del expediente'
      };

      const priorities = {
        created: 'medium' as const,
        updated: 'medium' as const,
        deleted: 'high' as const
      };

      await this.createNotification({
        userId: createdBy,
        businessId,
        type: 'record_updated',
        title: `Expediente ${action === 'created' ? 'creado' : action === 'updated' ? 'actualizado' : 'eliminado'}`,
        message: `${actionMessages[action]} de ${clientName}`,
        priority: priorities[action]
      });
    } catch (error) {
      console.error('Error creating record notification:', error);
    }
  }

  // Crear notificación para cita de seguimiento
  async createFollowUpNotification(
    businessId: string,
    clientName: string,
    treatmentName: string,
    followUpDate: string,
    userId: string
  ): Promise<void> {
    try {
      await this.createNotification({
        userId,
        businessId,
        type: 'appointment_reminder',
        title: 'Cita de seguimiento programada',
        message: `Se programó cita de seguimiento para ${clientName} - ${treatmentName} el ${followUpDate}`,
        priority: 'medium'
      });
    } catch (error) {
      console.error('Error creating follow-up notification:', error);
    }
  }
}

export const notificationService = NotificationService.getInstance();
