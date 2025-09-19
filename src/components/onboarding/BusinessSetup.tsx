import React, { useState } from 'react';
import { ref, set, push, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { Business, BusinessCategory, OperatingHours, User } from '../../types';
import { getCategoryInfo, getAllCategories } from '../../config/businessCategories';
import { generateUniqueBusinessKey } from '../../utils/businessKey';
import { Building2 as Building, Clock, ArrowRight, X, Check, Save } from 'lucide-react';

export const BusinessSetup: React.FC = () => {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<BusinessCategory[]>([]);
  const [operatingHours, setOperatingHours] = useState<OperatingHours>({
    monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    saturday: { isOpen: true, openTime: '09:00', closeTime: '15:00' },
    sunday: { isOpen: false }
  });
  const [loading, setLoading] = useState(false);

  const availableCategories = getAllCategories();

  const toggleCategory = (category: BusinessCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = async () => {
    if (!currentUser || !businessName || selectedCategories.length === 0) return;

    setLoading(true);
    try {
      // Generate unique business key first
      const businessKey = await generateUniqueBusinessKey();
      
      // Create business
      const businessRef = push(ref(database, 'businesses'));
      const businessId = businessRef.key!;
      
      const businessData: Omit<Business, 'id'> = {
        name: businessName,
        categories: selectedCategories,
        operatingHours,
        ownerId: currentUser.uid,
        businessKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Propiedades opcionales con valores por defecto
        category: selectedCategories[0], // Usar la primera categoría seleccionada
        email: currentUser.email || '',
        phone: '',
        address: '',
        description: ''
      };

      await set(businessRef, businessData);

      // Create default services in separate structure
      const servicesRef = ref(database, `businesses/${businessId}/services`);
      const defaultServicesPromises: Promise<void>[] = [];
      
      for (const category of selectedCategories) {
        const categoryInfo = getCategoryInfo(category);
        const defaultServices = categoryInfo?.defaultServices || [];
        
        for (const serviceName of defaultServices) {
          const serviceRef = push(servicesRef);
          const serviceData = {
            id: serviceRef.key,
            name: serviceName,
            duration: 60,
            category: categoryInfo.name,
            resources: 1,
            price: 0,
            businessId: businessId,
            isActive: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          defaultServicesPromises.push(set(serviceRef, serviceData));
        }
      }

      // Wait for all services to be created
      await Promise.all(defaultServicesPromises);

// Update user with businessId and businessAccess
      const userUpdates: Partial<User> = {
        businessId,
        businessAccess: {
          [businessId]: {
            businessId,
            businessName,
            businessKey,
            role: 'admin',
            addedAt: new Date().toISOString()
          }
        },
        currentBusiness: businessId
      };

      const userRef = ref(database, `users/${currentUser.uid}`);
      await update(userRef, userUpdates);

      // Reload the page to trigger re-authentication with new businessId
      window.location.reload();
    } catch (error) {
      console.error('Error creating business:', error);
      // Aquí podrías agregar manejo de errores para el usuario
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
          <div className="text-center mb-8">
            <Building className="h-16 w-16 text-pink-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Configura tu Negocio</h1>
            <p className="text-gray-600">Paso 1 de 3: Información básica</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Negocio
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Ej: Clínica Dermatológica Bella Piel"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!businessName.trim()}
                className="flex items-center px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-4xl">
          <div className="text-center mb-8">
            <Building className="h-16 w-16 text-pink-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Selecciona los Giros de tu Negocio</h1>
            <p className="text-gray-600">Paso 2 de 3: Puedes seleccionar múltiples categorías</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {availableCategories.map((category) => (
              <div
                key={category.id}
                onClick={() => toggleCategory(category.id)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  selectedCategories.includes(category.id)
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 hover:border-pink-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{category.icon}</span>
                  {selectedCategories.includes(category.id) && (
                    <Check className="h-5 w-5 text-pink-600" />
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{category.name}</h3>
                <p className="text-sm text-gray-600">{category.description}</p>
              </div>
            ))}
          </div>

          {selectedCategories.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Categorías seleccionadas:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedCategories.map(categoryId => {
                  const category = getCategoryInfo(categoryId);
                  return (
                    <span
                      key={categoryId}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {category.icon} {category.name}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategory(categoryId);
                        }}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={selectedCategories.length === 0}
              className="flex items-center px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Operating Hours
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <Clock className="h-16 w-16 text-pink-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Horarios de Atención</h1>
          <p className="text-gray-600">Paso 3 de 3: Configura tus horarios</p>
        </div>

        <div className="space-y-4 mb-8">
          {(Object.entries(operatingHours) as [keyof OperatingHours, typeof operatingHours[keyof OperatingHours]][]).map(([day, schedule]) => (
            <div key={day} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <input
                  type="checkbox"
                  checked={schedule.isOpen}
                  onChange={(e) => setOperatingHours(prev => ({
                    ...prev,
                    [day]: { ...prev[day], isOpen: e.target.checked }
                  }))}
                  className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                />
                <span className="font-medium text-gray-900 capitalize w-20">
                  {day === 'monday' ? 'Lunes' :
                   day === 'tuesday' ? 'Martes' :
                   day === 'wednesday' ? 'Miércoles' :
                   day === 'thursday' ? 'Jueves' :
                   day === 'friday' ? 'Viernes' :
                   day === 'saturday' ? 'Sábado' : 'Domingo'}
                </span>
              </div>
              
              {schedule.isOpen && (
                <div className="flex items-center space-x-2">
                  <input
                    type="time"
                    value={schedule.openTime || '09:00'}
                    onChange={(e) => setOperatingHours(prev => ({
                      ...prev,
                      [day]: { ...prev[day as keyof OperatingHours], openTime: e.target.value }
                    }))}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-gray-500">a</span>
                  <input
                    type="time"
                    value={schedule.closeTime || '18:00'}
                    onChange={(e) => setOperatingHours(prev => ({
                      ...prev,
                      [day]: { ...prev[day as keyof OperatingHours], closeTime: e.target.value }
                    }))}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => setStep(2)}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Anterior
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Creando...' : 'Crear Negocio'}
          </button>
        </div>
      </div>
    </div>
  );
};
