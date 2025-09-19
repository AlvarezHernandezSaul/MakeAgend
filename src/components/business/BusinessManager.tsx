import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Building2, Key, Trash2, CheckCircle, XCircle } from 'lucide-react';

export const BusinessManager: React.FC = () => {
  const { currentUser, businessAccess, addBusinessAccess, currentBusiness, setCurrentBusiness } = useAuth();
  const [isAddingBusiness, setIsAddingBusiness] = useState(false);
  const [newBusinessKey, setNewBusinessKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAddBusiness = async () => {
    if (!newBusinessKey.trim()) {
      setError('Por favor ingrese una clave de negocio');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const success = await addBusinessAccess(newBusinessKey.trim().toUpperCase());
      
      if (success) {
        setSuccess('¡Negocio agregado exitosamente!');
        setNewBusinessKey('');
        setIsAddingBusiness(false);
        
        // Limpiar mensaje de éxito después de 3 segundos
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('No se encontró ningún negocio con esa clave. Verifique que la clave sea correcta.');
      }
    } catch (error) {
      console.error('Error adding business:', error);
      setError('Error al agregar el negocio. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchBusiness = async (businessId: string) => {
    try {
      await setCurrentBusiness(businessId);
    } catch (error) {
      console.error('Error switching business:', error);
      setError('Error al cambiar de negocio');
    }
  };

  const businessList = Object.values(businessAccess);

  if (currentUser?.role !== 'assistant') {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Building2 className="h-6 w-6 text-pink-600 mr-2" />
          <h2 className="text-xl font-bold text-gray-900">Mis Negocios</h2>
        </div>
        
        {!isAddingBusiness && (
          <button
            onClick={() => setIsAddingBusiness(true)}
            className="flex items-center px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Negocio
          </button>
        )}
      </div>

      {/* Formulario para agregar negocio */}
      {isAddingBusiness && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Agregar Nuevo Negocio</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clave del Negocio
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={newBusinessKey}
                  onChange={(e) => setNewBusinessKey(e.target.value.toUpperCase())}
                  placeholder="Ingrese la clave del negocio"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  maxLength={16}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Solicite esta clave al propietario del negocio
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleAddBusiness}
                disabled={isLoading}
                className="flex items-center px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {isLoading ? 'Agregando...' : 'Agregar'}
              </button>
              
              <button
                onClick={() => {
                  setIsAddingBusiness(false);
                  setNewBusinessKey('');
                  setError(null);
                }}
                className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mensajes de error y éxito */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Lista de negocios */}
      <div className="space-y-3">
        {businessList.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No tienes negocios agregados</p>
            <p className="text-sm">Agrega tu primer negocio usando la clave proporcionada por el propietario</p>
          </div>
        ) : (
          businessList.map((business) => (
            <div
              key={business.businessId}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                currentBusiness === business.businessId
                  ? 'border-pink-500 bg-pink-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              onClick={() => handleSwitchBusiness(business.businessId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg mr-3 ${
                    currentBusiness === business.businessId
                      ? 'bg-pink-100 text-pink-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Building2 className="h-5 w-5" />
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900">{business.businessName}</h3>
                    <div className="flex items-center text-sm text-gray-500">
                      <Key className="h-3 w-3 mr-1" />
                      <span className="font-mono">{business.businessKey}</span>
                      <span className="mx-2">•</span>
                      <span className="capitalize">{business.role}</span>
                    </div>
                  </div>
                </div>

                {currentBusiness === business.businessId && (
                  <div className="flex items-center text-pink-600">
                    <CheckCircle className="h-5 w-5 mr-1" />
                    <span className="text-sm font-medium">Activo</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {businessList.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Tip:</strong> Haz clic en cualquier negocio para cambiar entre ellos. 
            Los datos mostrados en el dashboard corresponderán al negocio seleccionado.
          </p>
        </div>
      )}
    </div>
  );
};
