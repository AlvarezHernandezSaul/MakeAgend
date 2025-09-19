import { ref, get } from 'firebase/database';
import { database } from '../config/firebase';

/**
 * Genera una clave hexadecimal aleatoria de 16 caracteres
 */
export const generateBusinessKey = (): string => {
  const chars = '0123456789ABCDEF';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Verifica si una clave de negocio ya existe en la base de datos
 */
export const isBusinessKeyUnique = async (key: string): Promise<boolean> => {
  try {
    const businessesRef = ref(database, 'businesses');
    const snapshot = await get(businessesRef);
    
    if (!snapshot.exists()) return true;
    
    const businesses = snapshot.val();
    
    // Buscar si algún negocio ya tiene esta clave
    for (const businessId in businesses) {
      if (businesses[businessId].businessKey === key) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error checking business key uniqueness:', error);
    return false;
  }
};

/**
 * Genera una clave de negocio única garantizada
 */
export const generateUniqueBusinessKey = async (): Promise<string> => {
  let key: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    key = generateBusinessKey();
    isUnique = await isBusinessKeyUnique(key);
    attempts++;
  } while (!isUnique && attempts < maxAttempts);
  
  if (!isUnique) {
    throw new Error('No se pudo generar una clave única después de varios intentos');
  }
  
  return key;
};

/**
 * Busca un negocio por su clave
 */
export const findBusinessByKey = async (businessKey: string): Promise<{ businessId: string; businessName: string } | null> => {
  try {
    const businessesRef = ref(database, 'businesses');
    const snapshot = await get(businessesRef);
    
    if (!snapshot.exists()) return null;
    
    const businesses = snapshot.val();
    
    for (const businessId in businesses) {
      if (businesses[businessId].businessKey === businessKey) {
        return {
          businessId,
          businessName: businesses[businessId].name
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding business by key:', error);
    return null;
  }
};
