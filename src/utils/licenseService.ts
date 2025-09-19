import { ref, get, update } from 'firebase/database';
import { database } from '../config/firebase';
import type { BusinessLicense, Business } from '../types';

export class LicenseService {
  private static instance: LicenseService;

  private constructor() {}

  static getInstance(): LicenseService {
    if (!LicenseService.instance) {
      LicenseService.instance = new LicenseService();
    }
    return LicenseService.instance;
  }

  // Calcular fecha de expiración basada en el tipo de licencia
  calculateEndDate(startDate: string, licenseType: BusinessLicense['type']): string {
    const start = new Date(startDate);
    
    switch (licenseType) {
      case '15days':
        start.setDate(start.getDate() + 15);
        break;
      case '1month':
        start.setMonth(start.getMonth() + 1);
        break;
      case '3months':
        start.setMonth(start.getMonth() + 3);
        break;
      case '6months':
        start.setMonth(start.getMonth() + 6);
        break;
      case '1year':
        start.setFullYear(start.getFullYear() + 1);
        break;
    }
    
    return start.toISOString();
  }

  // Crear o actualizar licencia para un negocio
  async assignLicense(
    businessId: string, 
    licenseType: BusinessLicense['type'], 
    adminUserId: string
  ): Promise<void> {
    const startDate = new Date().toISOString();
    const endDate = this.calculateEndDate(startDate, licenseType);
    
    const businessRef = ref(database, `businesses/${businessId}`);
    const snapshot = await get(businessRef);
    
    if (!snapshot.exists()) {
      throw new Error('Negocio no encontrado');
    }
    
    const business = snapshot.val() as Business;
    const currentRenewalCount = business.license?.renewalCount || 0;
    
    const newLicense: BusinessLicense = {
      type: licenseType,
      startDate,
      endDate,
      isActive: true,
      assignedBy: adminUserId,
      assignedAt: new Date().toISOString(),
      renewalCount: currentRenewalCount + 1
    };

    await update(businessRef, {
      license: newLicense,
      isActive: true,
      updatedAt: new Date().toISOString()
    });

    // Desbloquear usuarios asociados al negocio
    await this.unblockBusinessUsers(businessId);
  }

  // Verificar si una licencia está expirada
  isLicenseExpired(license: BusinessLicense): boolean {
    if (!license || !license.isActive) return true;
    return new Date() > new Date(license.endDate);
  }

  // Verificar si una licencia está próxima a expirar (3 días)
  isLicenseExpiringSoon(license: BusinessLicense): boolean {
    if (!license || !license.isActive) return false;
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    return new Date(license.endDate) <= threeDaysFromNow;
  }

  // Obtener días restantes de licencia
  getDaysRemaining(license: BusinessLicense): number {
    if (!license || !license.isActive) return 0;
    const now = new Date();
    const endDate = new Date(license.endDate);
    const diffTime = endDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Bloquear negocio por licencia expirada
  async blockBusinessForExpiredLicense(businessId: string): Promise<void> {
    const businessRef = ref(database, `businesses/${businessId}`);
    
    await update(businessRef, {
      isActive: false,
      'license/isActive': false,
      updatedAt: new Date().toISOString()
    });

    // Bloquear todos los usuarios asociados
    await this.blockBusinessUsers(businessId, 'Licencia expirada');
  }

  // Cancelar licencia manualmente (por admin)
  async cancelLicense(businessId: string, adminUserId: string): Promise<void> {
    console.log('Cancelando licencia para negocio:', businessId, 'por admin:', adminUserId);
    
    const businessRef = ref(database, `businesses/${businessId}`);
    const snapshot = await get(businessRef);
    
    if (!snapshot.exists()) {
      throw new Error('Negocio no encontrado');
    }

    const business = snapshot.val();
    const currentLicense = business.license;

    if (!currentLicense) {
      throw new Error('El negocio no tiene licencia activa');
    }

    console.log('Licencia actual:', currentLicense);

    // Marcar licencia como cancelada
    const canceledLicense = {
      ...currentLicense,
      isActive: false,
      canceledAt: new Date().toISOString(),
      canceledBy: adminUserId,
      endDate: new Date().toISOString() // Terminar inmediatamente
    };

    console.log('Actualizando negocio con licencia cancelada');
    await update(businessRef, {
      license: canceledLicense,
      isActive: false,
      updatedAt: new Date().toISOString()
    });

    console.log('Bloqueando usuarios del negocio');
    // Bloquear todos los usuarios asociados
    await this.blockBusinessUsers(businessId, 'Licencia cancelada por administrador');
    console.log('Cancelación de licencia completada');
  }

  // Bloquear usuarios de un negocio
  private async blockBusinessUsers(businessId: string, reason: string): Promise<void> {
    console.log('Bloqueando usuarios del negocio:', businessId, 'razón:', reason);
    
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    
    if (snapshot.exists()) {
      const users = snapshot.val();
      const updates: Record<string, any> = {};
      
      Object.keys(users).forEach(userId => {
        const user = users[userId];
        let shouldBlock = false;
        
        console.log('Revisando usuario:', userId, {
          businessId: user.businessId,
          currentBusiness: user.currentBusiness,
          role: user.role,
          hasBusinessAccess: !!user.businessAccess?.[businessId]
        });
        
        // Bloquear propietario del negocio (verificar tanto businessId como businessAccess)
        if (user.businessId === businessId) {
          console.log('Usuario será bloqueado por businessId');
          shouldBlock = true;
        }
        
        // Bloquear usuarios con acceso al negocio (owners y assistants)
        if (user.businessAccess && user.businessAccess[businessId]) {
          console.log('Usuario será bloqueado por businessAccess');
          shouldBlock = true;
        }
        
        // Verificar si es propietario por ownerId en el negocio
        if (user.role === 'owner' && user.currentBusiness === businessId) {
          console.log('Usuario será bloqueado por currentBusiness');
          shouldBlock = true;
        }
        
        if (shouldBlock) {
          console.log('Bloqueando usuario:', userId);
          updates[`users/${userId}/isBlocked`] = true;
          updates[`users/${userId}/blockedReason`] = reason;
          updates[`users/${userId}/updatedAt`] = new Date().toISOString();
        }
      });
      
      console.log('Actualizaciones a aplicar:', Object.keys(updates).length);
      if (Object.keys(updates).length > 0) {
        await update(usersRef, updates);
        console.log('Usuarios bloqueados exitosamente');
      } else {
        console.log('No se encontraron usuarios para bloquear');
      }
    }
  }

  // Desbloquear usuarios de un negocio
  private async unblockBusinessUsers(businessId: string): Promise<void> {
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    
    if (snapshot.exists()) {
      const users = snapshot.val();
      const updates: Record<string, any> = {};
      
      Object.keys(users).forEach(userId => {
        const user = users[userId];
        let shouldUnblock = false;
        
        if (user.isBlocked) {
          // Desbloquear propietario del negocio
          if (user.businessId === businessId) {
            shouldUnblock = true;
          }
          
          // Desbloquear usuarios con acceso al negocio
          if (user.businessAccess && user.businessAccess[businessId]) {
            shouldUnblock = true;
          }
          
          // Verificar si es propietario por currentBusiness
          if (user.role === 'owner' && user.currentBusiness === businessId) {
            shouldUnblock = true;
          }
        }
        
        if (shouldUnblock) {
          updates[`users/${userId}/isBlocked`] = false;
          updates[`users/${userId}/blockedReason`] = null;
          updates[`users/${userId}/updatedAt`] = new Date().toISOString();
        }
      });
      
      if (Object.keys(updates).length > 0) {
        await update(usersRef, updates);
      }
    }
  }

  // Verificar todas las licencias y bloquear las expiradas
  async checkAllLicenses(): Promise<void> {
    const businessesRef = ref(database, 'businesses');
    const snapshot = await get(businessesRef);
    
    if (snapshot.exists()) {
      const businesses = snapshot.val();
      const promises: Promise<void>[] = [];
      
      Object.keys(businesses).forEach(businessId => {
        const business = businesses[businessId] as Business;
        
        if (business.license && business.isActive !== false) {
          if (this.isLicenseExpired(business.license)) {
            promises.push(this.blockBusinessForExpiredLicense(businessId));
          }
        }
      });
      
      await Promise.all(promises);
    }
  }

  // Configurar listener para verificación automática de licencias
  startLicenseMonitoring(): void {
    // Verificar cada hora
    setInterval(() => {
      this.checkAllLicenses().catch(console.error);
    }, 60 * 60 * 1000);

    // Verificar al inicio
    this.checkAllLicenses().catch(console.error);
  }

  // Obtener información de licencia de un negocio
  async getBusinessLicense(businessId: string): Promise<BusinessLicense | null> {
    const businessRef = ref(database, `businesses/${businessId}/license`);
    const snapshot = await get(businessRef);
    
    return snapshot.exists() ? snapshot.val() : null;
  }

  // Obtener todos los negocios con información de licencias (para Admin)
  async getAllBusinessesWithLicenses(): Promise<Array<Business & { id: string }>> {
    const businessesRef = ref(database, 'businesses');
    const snapshot = await get(businessesRef);
    
    if (!snapshot.exists()) return [];
    
    const businesses = snapshot.val();
    return Object.keys(businesses).map(id => ({
      id,
      ...businesses[id]
    }));
  }
}

export const licenseService = LicenseService.getInstance();
