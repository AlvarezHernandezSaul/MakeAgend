import { useAuth } from '../contexts/AuthContext';

export const usePermissions = () => {
  const { currentUser } = useAuth();

  // Permisos para diferentes acciones según el rol
  const permissions = {
    // Servicios
    canCreateService: currentUser?.role === 'owner',
    canEditService: currentUser?.role === 'owner',
    canDeleteService: currentUser?.role === 'owner',
    canViewService: true, // Todos pueden ver servicios

    // Clientes
    canCreateClient: currentUser?.role === 'owner' || currentUser?.role === 'assistant',
    canEditClient: currentUser?.role === 'owner' || currentUser?.role === 'assistant',
    canDeleteClient: currentUser?.role === 'owner',
    canViewClient: true, // Todos pueden ver clientes

    // Citas
    canCreateAppointment: currentUser?.role === 'owner' || currentUser?.role === 'assistant',
    canEditAppointment: currentUser?.role === 'owner' || currentUser?.role === 'assistant',
    canDeleteAppointment: currentUser?.role === 'owner' || currentUser?.role === 'assistant',
    canViewAppointment: true, // Todos pueden ver citas

    // Expedientes - Solo para owners
    canCreateRecord: currentUser?.role === 'owner',
    canEditRecord: currentUser?.role === 'owner',
    canDeleteRecord: currentUser?.role === 'owner',
    canViewRecord: currentUser?.role === 'owner', // Solo owners pueden ver expedientes

    // Reportes
    canViewReports: true, // Todos pueden ver reportes
    canExportReports: currentUser?.role === 'owner',

    // Configuración del negocio
    canEditBusiness: currentUser?.role === 'owner',
    canViewBusinessKey: currentUser?.role === 'owner',

    // Notificaciones
    canViewNotifications: true, // Todos pueden ver notificaciones
    canDeleteNotifications: currentUser?.role === 'owner' || currentUser?.role === 'assistant',

    // Administración
    canAccessAdminPanel: currentUser?.role === 'admin',
  };

  // Función helper para verificar si el usuario puede realizar una acción
  const can = (action: keyof typeof permissions): boolean => {
    return permissions[action] || false;
  };

  // Función para obtener el mensaje de restricción
  const getRestrictionMessage = (action: keyof typeof permissions): string => {
    if (currentUser?.role === 'assistant') {
      switch (action) {
        case 'canCreateService':
        case 'canEditService':
        case 'canDeleteService':
          return 'Solo el propietario puede gestionar servicios. Tienes acceso de solo lectura.';
        case 'canDeleteClient':
          return 'Solo el propietario puede eliminar clientes.';
        case 'canCreateRecord':
        case 'canEditRecord':
        case 'canDeleteRecord':
        case 'canViewRecord':
          return 'Solo el propietario tiene acceso a los expedientes digitales.';
        case 'canExportReports':
          return 'Solo el propietario puede exportar reportes.';
        case 'canEditBusiness':
          return 'Solo el propietario puede modificar la configuración del negocio.';
        default:
          return 'No tienes permisos para realizar esta acción.';
      }
    }
    return 'No tienes permisos para realizar esta acción.';
  };

  return {
    ...permissions,
    can,
    getRestrictionMessage,
    isOwner: currentUser?.role === 'owner',
    isAssistant: currentUser?.role === 'assistant',
    isAdmin: currentUser?.role === 'admin',
  };
};
