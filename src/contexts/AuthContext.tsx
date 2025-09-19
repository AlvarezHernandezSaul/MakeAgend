import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  type User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { ref, get, set, update, push } from 'firebase/database';
import { auth, database } from '../config/firebase';
import type { User } from '../types';
import { realTimeLicenseService, type LicenseStatus } from '../utils/realTimeLicenseService';

interface BusinessAccess {
  businessId: string;
  businessName: string;
  businessKey: string;
  role: 'admin' | 'editor' | 'viewer';
  addedAt: string;
}

interface AuthContextType {
  currentUser: User | null;
  currentBusiness: string | null;
  businessAccess: Record<string, BusinessAccess>;
  licenseStatus: LicenseStatus | null;
  setCurrentBusiness: (businessId: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, role: 'owner' | 'assistant' | 'admin', businessKey?: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  addBusinessAccess: (businessKey: string) => Promise<boolean>;
  updateUserProfile: (data: { displayName?: string }) => Promise<void>;
  createClientRecord: (businessId: string, clientId: string, recordData: any) => Promise<string>;
  getClientRecords: (businessId: string, clientId: string) => Promise<any[]>;
  updateClientRecord: (businessId: string, recordId: string, updates: any) => Promise<void>;
  deleteClientRecord: (businessId: string, recordId: string) => Promise<void>;
  refreshLicenseStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentBusiness, setCurrentBusiness] = useState<string | null>(null);
  const [businessAccess, setBusinessAccess] = useState<Record<string, BusinessAccess>>({});
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [licenseCleanup, setLicenseCleanup] = useState<(() => void) | null>(null);

  // Función para configurar el listener de licencias
  const setupLicenseListener = useCallback((user: User) => {
    // Limpiar listener anterior si existe
    if (licenseCleanup) {
      licenseCleanup();
      setLicenseCleanup(null);
    }

    // Configurar nuevo listener
    const cleanup = realTimeLicenseService.setupUserLicenseListener(user, (status) => {
      setLicenseStatus(status);
      
      // Si el usuario debe ser bloqueado, actualizar su estado
      if (!status.isValid && user.role !== 'admin' && !user.isBlocked) {
        setCurrentUser(prev => prev ? { ...prev, isBlocked: true, blockedReason: 'Licencia expirada o cancelada' } : null);
      }
    });

    setLicenseCleanup(() => cleanup);
  }, [licenseCleanup]);

  // Función para refrescar completamente el estado del usuario y licencia
  const refreshLicenseStatus = useCallback(async () => {
    if (!currentUser || !auth.currentUser) return;
    
    try {
      // Recargar datos del usuario desde la base de datos
      const userRef = ref(database, `users/${currentUser.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        
        // Crear objeto de usuario actualizado
        const updatedUser: User = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: userData.displayName || currentUser.displayName,
          role: userData.role,
          businessId: userData.businessId,
          businessAccess: userData.businessAccess || {},
          currentBusiness: userData.currentBusiness,
          isBlocked: userData.isBlocked || false,
          blockedReason: userData.blockedReason
        };
        
        // Verificar el estado actual de la licencia
        const shouldBlock = await realTimeLicenseService.shouldBlockUser(updatedUser);
        const licenseStatus = await realTimeLicenseService.checkUserLicenseStatus(updatedUser);
        
        // Si la licencia es válida y el usuario estaba bloqueado por licencia, desbloquearlo
        if (licenseStatus.isValid && updatedUser.isBlocked && 
            (updatedUser.blockedReason?.includes('licencia') || updatedUser.blockedReason?.includes('Licencia'))) {
          updatedUser.isBlocked = false;
          updatedUser.blockedReason = undefined;
          
          // Actualizar en la base de datos
          await update(userRef, {
            isBlocked: false,
            blockedReason: null,
            updatedAt: new Date().toISOString()
          });
        }
        // Si debe estar bloqueado pero no lo está, bloquearlo
        else if (shouldBlock && !updatedUser.isBlocked) {
          const reason = await realTimeLicenseService.getBlockingReason(updatedUser);
          updatedUser.isBlocked = true;
          updatedUser.blockedReason = reason;
          
          // Actualizar en la base de datos
          await update(userRef, {
            isBlocked: true,
            blockedReason: reason,
            updatedAt: new Date().toISOString()
          });
        }
        
        // Actualizar estados
        setCurrentUser(updatedUser);
        setLicenseStatus(licenseStatus);
        setBusinessAccess(updatedUser.businessAccess || {});
        
        // Reconfigurar listener de licencias
        setupLicenseListener(updatedUser);
        
        console.log('Estado del usuario actualizado:', {
          isBlocked: updatedUser.isBlocked,
          blockedReason: updatedUser.blockedReason,
          licenseValid: licenseStatus.isValid
        });
      }
    } catch (error) {
      console.error('Error refreshing user and license status:', error);
    }
  }, [currentUser, setupLicenseListener]);

  // Funciones para la gestión de expedientes
  // Las implementaciones detalladas se encuentran más abajo en el archivo

  const updateUserProfile = async (data: { displayName?: string }) => {
    if (!auth.currentUser) return;
  
    try {
      // Actualizar en Firebase Auth
      await updateProfile(auth.currentUser, data);
  
      // Actualizar en Realtime Database
      const userRef = ref(database, `users/${auth.currentUser.uid}`);
      await update(userRef, data);
  
      // Actualizar el estado local
      setCurrentUser(prev => {
        // Si prev es null, no actualizamos el estado
        if (!prev) return prev;
  
        return {
          ...prev,
          displayName: data.displayName || prev.displayName
        };
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Verificar credenciales de admin
      if (email === 'sauldisel4@gmail.com' && password === '41292002Alv.') {
        // Login especial para admin
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        
        // Verificar si ya existe el usuario admin en la base de datos
        const userRef = ref(database, `users/${firebaseUser.uid}`);
        const snapshot = await get(userRef);
        
        if (!snapshot.exists()) {
          // Crear usuario admin si no existe
          const adminUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: 'Administrador',
            role: 'admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            businessAccess: {},
            currentBusiness: null
          };
          
          await set(userRef, adminUser);
          setCurrentUser(adminUser);
        } else {
          const userData = snapshot.val();
          setCurrentUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            ...userData
          });
        }
        return;
      }
      
      // Login normal para otros usuarios
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Get user data from Realtime Database
      const userRef = ref(database, `users/${firebaseUser.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const user: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: userData.displayName || firebaseUser.displayName || '',
          role: userData.role,
          businessId: userData.businessId,
          businessAccess: userData.businessAccess || {},
          currentBusiness: userData.currentBusiness || null
        };
        
        setCurrentUser(user);
        setBusinessAccess(userData.businessAccess || {});
        
        // Si es asistente y tiene acceso a negocios, establecer el primero como negocio actual
        if (user.role === 'assistant' && userData.businessAccess) {
          const firstBusinessId = userData.currentBusiness || Object.keys(userData.businessAccess)[0];
          if (firstBusinessId) {
            setCurrentBusiness(firstBusinessId);
            // Actualizar en la base de datos si no existe currentBusiness
            if (!userData.currentBusiness) {
              await update(ref(database, `users/${firebaseUser.uid}`), {
                currentBusiness: firstBusinessId
              });
            }
          }
        } else if (user.businessId) {
          setCurrentBusiness(user.businessId);
        }
      } else {
        throw new Error('User data not found');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const addBusinessAccess = async (businessKey: string): Promise<boolean> => {
    if (!currentUser) return false;
    
    try {
      console.log('Buscando negocio con clave:', businessKey);
      
      // Buscar el negocio por su clave
      const businessesRef = ref(database, 'businesses');
      const snapshot = await get(businessesRef);
      
      if (!snapshot.exists()) {
        console.log('No existen negocios en la base de datos');
        return false;
      }
      
      let businessFound = false;
      let businessData: any = null;
      let businessId = '';
      
      // Buscar el negocio por su clave
      snapshot.forEach((child) => {
        const business = child.val();
        console.log('Revisando negocio:', child.key, 'con clave:', business.businessKey);
        
        if (business.businessKey === businessKey) {
          console.log('¡Negocio encontrado!', child.key);
          businessFound = true;
          businessData = business;
          businessId = child.key!;
        }
      });
      
      if (!businessFound) {
        console.log('No se encontró negocio con la clave proporcionada');
        return false;
      }
      
      // Actualizar el acceso del usuario al negocio
      const updates: any = {};
      const businessAccessData = {
        businessId,
        businessName: businessData.name,
        businessKey,
        role: 'viewer', // Rol por defecto
        addedAt: new Date().toISOString()
      };
      
      updates[`users/${currentUser.uid}/businessAccess/${businessId}`] = businessAccessData;
      
      // Si es el primer negocio, establecerlo como actual
      if (Object.keys(businessAccess).length === 0) {
        updates[`users/${currentUser.uid}/currentBusiness`] = businessId;
        setCurrentBusiness(businessId);
      }
      
      await update(ref(database), updates);
      
      // Actualizar el estado local
      setBusinessAccess(prev => ({
        ...prev,
        [businessId]: {
          ...businessAccessData,
          role: 'viewer' as const  // Asegurar que el tipo sea literal 'viewer'
        }
      }));
      
      return true;
    } catch (error) {
      console.error('Error adding business access:', error);
      return false;
    }
  };

  const register = async (
    email: string, 
    password: string, 
    displayName: string, 
    role: 'owner' | 'assistant' | 'admin', 
    businessKey?: string
  ) => {
    try {
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Actualizar el perfil con el nombre
      await updateProfile(firebaseUser, { displayName });
      
      // Crear datos del usuario
      const userData: User = {
        uid: firebaseUser.uid,
        email,
        displayName,
        role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        businessAccess: {},
        currentBusiness: null
      };
      
      // Si es propietario, NO crear el negocio aún - se hará en BusinessSetup
      if (role === 'owner') {
        // Solo marcar que necesita configurar su negocio
        userData.businessId = null;
        userData.businessAccess = {};
        userData.currentBusiness = null;
      } else if (role === 'assistant' && businessKey) {
        // Si es asistente, buscar el negocio con la clave proporcionada
        const businessesRef = ref(database, 'businesses');
        const businessesSnapshot = await get(businessesRef);
        
        let businessFound = false;
        let foundBusinessId = '';
        let foundBusinessData: any = null;
        
        if (businessesSnapshot.exists()) {
          const businesses = businessesSnapshot.val();
          Object.keys(businesses).forEach(businessId => {
            const business = businesses[businessId];
            if (business.businessKey === businessKey.toUpperCase()) {
              businessFound = true;
              foundBusinessId = businessId;
              foundBusinessData = business;
            }
          });
        }
        
        if (!businessFound) {
          throw new Error('No se pudo encontrar el negocio con la clave proporcionada');
        }
        
        // Configurar acceso al negocio para el asistente
        userData.businessAccess = {
          [foundBusinessId]: {
            businessId: foundBusinessId,
            businessName: foundBusinessData.name,
            businessKey: businessKey.toUpperCase(),
            role: 'viewer' as const,
            addedAt: new Date().toISOString()
          }
        };
        userData.currentBusiness = foundBusinessId;
      } else if (role === 'admin') {
        // Verificar que solo el email autorizado pueda crear cuenta de admin
        if (email !== 'sauldisel4@gmail.com') {
          throw new Error('No autorizado para crear cuenta de administrador');
        }
        // Los admins no tienen negocio asociado
        userData.businessId = null;
        userData.currentBusiness = null;
      }
      
      // Preparar el objeto de usuario para guardar en la base de datos
      // Asegurarse de que no haya valores undefined
      const userToSave = {
        uid: firebaseUser.uid,
        email: email || '',
        displayName: displayName || '',
        role: role, // Mantener el rol exacto que se pasó como parámetro
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        businessAccess: userData.businessAccess || {},
        businessId: userData.businessId || null,
        currentBusiness: userData.currentBusiness || null
      };
      
      // Eliminar propiedades undefined
      Object.keys(userToSave).forEach(key => {
        if (userToSave[key as keyof typeof userToSave] === undefined) {
          delete userToSave[key as keyof typeof userToSave];
        }
      });
      
      // Guardar datos del usuario en Realtime Database (solo una vez)
      await set(ref(database, `users/${firebaseUser.uid}`), userToSave);
      
      // Actualizar el estado local
      const updatedUser: User = {
        ...userToSave,
        uid: firebaseUser.uid // Asegurarse de que el uid sea el correcto
      };
      
      setCurrentUser(updatedUser);
      
      // No establecer negocio actual para owners hasta que completen BusinessSetup
      
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setCurrentBusiness(null);
      setBusinessAccess({});
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  // Función para cargar los datos del usuario
  const loadUserData = useCallback(async (firebaseUser: FirebaseUser) => {
    try {
      // Obtener datos del usuario desde Realtime Database
      const userRef = ref(database, `users/${firebaseUser.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const user: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: userData.displayName || firebaseUser.displayName || '',
          role: userData.role,
          businessId: userData.businessId,
          businessAccess: userData.businessAccess || {},
          currentBusiness: userData.currentBusiness,
          isBlocked: userData.isBlocked || false,
          blockedReason: userData.blockedReason
        };
        
        // Verificar el estado de la licencia antes de establecer el usuario
        const shouldBlock = await realTimeLicenseService.shouldBlockUser(user);
        if (shouldBlock && !user.isBlocked) {
          const reason = await realTimeLicenseService.getBlockingReason(user);
          user.isBlocked = true;
          user.blockedReason = reason;
          
          // Actualizar en la base de datos
          await update(userRef, {
            isBlocked: true,
            blockedReason: reason,
            updatedAt: new Date().toISOString()
          });
        }
        
        setCurrentUser(user);
        setBusinessAccess(userData.businessAccess || {});
        
        // Configurar listener de licencias en tiempo real
        setupLicenseListener(user);
        
        // Establecer el negocio actual
        if (userData.currentBusiness) {
          setCurrentBusiness(userData.currentBusiness);
        } else if (userData.role === 'assistant' && userData.businessAccess) {
          // Si es asistente y no tiene un negocio actual, establecer el primero
          const firstBusinessId = Object.keys(userData.businessAccess)[0];
          if (firstBusinessId) {
            setCurrentBusiness(firstBusinessId);
            // Actualizar en la base de datos
            await update(ref(database, `users/${firebaseUser.uid}`), {
              currentBusiness: firstBusinessId
            });
          }
        } else if (userData.businessId) {
          // Si es propietario, establecer su negocio como actual
          setCurrentBusiness(userData.businessId);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  }, [setupLicenseListener]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await loadUserData(firebaseUser);
      } else {
        // Limpiar listeners de licencias al cerrar sesión
        if (licenseCleanup) {
          licenseCleanup();
          setLicenseCleanup(null);
        }
        
        setCurrentUser(null);
        setCurrentBusiness(null);
        setBusinessAccess({});
        setLicenseStatus(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      // Limpiar listeners al desmontar el componente
      if (licenseCleanup) {
        licenseCleanup();
      }
      realTimeLicenseService.cleanup();
    };
  }, [loadUserData, licenseCleanup]);

  // Validar permisos para acceder a los expedientes
  const validateRecordAccess = async (businessId: string): Promise<boolean> => {
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }
    
    // Verificar si el usuario tiene acceso al negocio
    if (currentUser.businessId === businessId || businessAccess[businessId]) {
      return true;
    }
    
    throw new Error('No tienes permiso para acceder a este recurso');
  };

  // Crear un nuevo expediente de cliente
  const createClientRecord = async (businessId: string, clientId: string, recordData: any): Promise<string> => {
    try {
      // Validar acceso
      await validateRecordAccess(businessId);
      
      // Validar datos del expediente
      if (!recordData || typeof recordData !== 'object') {
        throw new Error('Datos del expediente no válidos');
      }
      
      // Verificar que el cliente existe
      const clientRef = ref(database, `businesses/${businessId}/clients/${clientId}`);
      const clientSnapshot = await get(clientRef);
      
      if (!clientSnapshot.exists()) {
        throw new Error('El cliente no existe');
      }
      
      // Crear referencia al nuevo expediente usando la estructura unificada
      const recordsRef = ref(database, `businesses/${businessId}/digitalRecords`);
      const newRecordRef = push(recordsRef);
      const recordId = newRecordRef.key;
      
      if (!recordId) {
        throw new Error('No se pudo crear el ID del expediente');
      }
      
      // Verificar que currentUser no sea nulo
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }
      
      // Preparar datos del expediente
      const timestamp = new Date().toISOString();
      const newRecord = {
        ...recordData,
        id: recordId,
        clientId,
        businessId,
        createdBy: currentUser.uid,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      // Guardar el expediente
      await set(newRecordRef, newRecord);
      return recordId;
    } catch (error) {
      console.error('Error al crear el expediente:', error);
      throw error;
    }
  };

  // Obtener todos los expedientes de un cliente
  const getClientRecords = async (businessId: string, clientId: string): Promise<any[]> => {
    try {
      // Validar acceso
      await validateRecordAccess(businessId);
      
      const recordsRef = ref(database, `businesses/${businessId}/digitalRecords`);
      const snapshot = await get(recordsRef);
      
      if (snapshot.exists()) {
        const records: any[] = [];
        snapshot.forEach((childSnapshot) => {
          const recordData = childSnapshot.val();
          // Filtrar solo los registros del cliente específico
          if (recordData.clientId === clientId) {
            records.push({
              id: childSnapshot.key,
              ...recordData
            });
          }
        });
        
        // Ordenar por fecha de creación (más reciente primero)
        return records.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      
      return [];
    } catch (error) {
      console.error('Error al obtener los expedientes:', error);
      throw error;
    }
  };

  // Actualizar un expediente existente
  const updateClientRecord = async (businessId: string, recordId: string, updates: any): Promise<void> => {
    try {
      // Validar acceso
      await validateRecordAccess(businessId);
      
      if (!recordId) {
        throw new Error('ID de expediente no proporcionado');
      }
      
      // Buscar el registro directamente en la estructura unificada
      const recordRef = ref(database, `businesses/${businessId}/digitalRecords/${recordId}`);
      
      // Verificar que el expediente existe
      const snapshot = await get(recordRef);
      if (!snapshot.exists()) {
        throw new Error('El expediente no existe');
      }
      
      // Preparar actualización
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // No permitir modificar ciertos campos
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.createdBy;
      
      // Actualizar el expediente
      await update(recordRef, updateData);
    } catch (error) {
      console.error('Error al actualizar el expediente:', error);
      throw error;
    }
  };

  // Eliminar un expediente
  const deleteClientRecord = async (businessId: string, recordId: string): Promise<void> => {
    try {
      // Validar acceso
      await validateRecordAccess(businessId);
      
      if (!recordId) {
        throw new Error('ID de expediente no proporcionado');
      }
      
      // Buscar el expediente directamente en la estructura unificada
      const recordRef = ref(database, `businesses/${businessId}/digitalRecords/${recordId}`);
      const recordSnapshot = await get(recordRef);
      
      if (!recordSnapshot.exists()) {
        throw new Error('No se encontró el expediente para eliminar');
      }
      
      // Verificar permisos adicionales si es necesario
      const recordData = recordSnapshot.val();
      if (recordData.createdBy && recordData.createdBy !== currentUser?.uid) {
        // Solo el creador o un administrador puede eliminar
        const isAdmin = currentUser?.role === 'owner' || 
                       (currentUser?.businessId === businessId && currentUser?.role === 'assistant');
        
        if (!isAdmin) {
          throw new Error('No tienes permiso para eliminar este expediente');
        }
      }
      
      // Eliminar el expediente
      await set(recordRef, null);
    } catch (error) {
      console.error('Error al eliminar el expediente:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    currentUser,
    currentBusiness,
    businessAccess,
    licenseStatus,
    setCurrentBusiness: async (businessId: string | null) => {
      if (!currentUser) return;
      
      setCurrentBusiness(businessId);
      
      // Actualizar en la base de datos
      if (businessId) {
        await update(ref(database, `users/${currentUser.uid}`), {
          currentBusiness: businessId
        });
      }
    },
    login,
    register,
    logout,
    loading,
    addBusinessAccess,
    updateUserProfile,
    createClientRecord,
    getClientRecords,
    updateClientRecord,
    deleteClientRecord,
    refreshLicenseStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
