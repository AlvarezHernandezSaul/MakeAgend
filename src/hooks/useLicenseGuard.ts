import { useAuth } from '../contexts/AuthContext';
import { realTimeLicenseService } from '../utils/realTimeLicenseService';

export const useLicenseGuard = () => {
  const { currentUser, licenseStatus } = useAuth();

  // Verificar si el usuario puede realizar acciones de escritura
  const canPerformAction = async (): Promise<boolean> => {
    if (!currentUser) return false;
    
    // Los admins siempre pueden realizar acciones
    if (currentUser.role === 'admin') return true;
    
    // Si ya está bloqueado, no puede realizar acciones
    if (currentUser.isBlocked) return false;
    
    // Verificar estado de licencia
    if (licenseStatus) {
      return licenseStatus.isValid;
    }
    
    // Si no hay estado de licencia, verificar directamente
    const shouldBlock = await realTimeLicenseService.shouldBlockUser(currentUser);
    return !shouldBlock;
  };

  // Verificar y mostrar mensaje de error si no puede realizar la acción
  const checkLicenseAndExecute = async (action: () => Promise<void> | void): Promise<boolean> => {
    const canExecute = await canPerformAction();
    
    if (!canExecute) {
      let message = 'No puede realizar esta acción.';
      
      if (currentUser?.isBlocked) {
        message = currentUser.blockedReason || 'Su cuenta está bloqueada. Contacte al administrador.';
      } else if (licenseStatus && !licenseStatus.isValid) {
        if (licenseStatus.isExpired) {
          message = 'Su licencia ha expirado. Contacte al administrador para renovarla.';
        } else {
          message = 'Su licencia no está activa. Contacte al administrador.';
        }
      }
      
      alert(message);
      return false;
    }
    
    try {
      await action();
      return true;
    } catch (error) {
      console.error('Error executing action:', error);
      return false;
    }
  };

  // Verificar si puede acceder a una sección específica
  const canAccessSection = (section: string): boolean => {
    if (!currentUser) return false;
    
    // Los admins pueden acceder a todo
    if (currentUser.role === 'admin') return true;
    
    // Si está bloqueado, solo puede ver notificaciones
    if (currentUser.isBlocked) {
      return section === 'notifications';
    }
    
    // Si la licencia no es válida, solo modo lectura limitado
    if (licenseStatus && !licenseStatus.isValid) {
      const readOnlySections = ['dashboard', 'notifications'];
      return readOnlySections.includes(section);
    }
    
    return true;
  };

  // Obtener mensaje de estado de licencia
  const getLicenseStatusMessage = (): string | null => {
    if (!currentUser || currentUser.role === 'admin') return null;
    
    if (currentUser.isBlocked) {
      return currentUser.blockedReason || 'Cuenta bloqueada';
    }
    
    if (licenseStatus) {
      if (!licenseStatus.isValid) {
        if (licenseStatus.isExpired) {
          return 'Licencia expirada';
        } else {
          return 'Licencia inactiva';
        }
      } else if (licenseStatus.isExpiringSoon) {
        return `Licencia expira en ${licenseStatus.daysRemaining} días`;
      }
    }
    
    return null;
  };

  return {
    canPerformAction,
    checkLicenseAndExecute,
    canAccessSection,
    getLicenseStatusMessage,
    isBlocked: currentUser?.isBlocked || false,
    licenseStatus
  };
};
