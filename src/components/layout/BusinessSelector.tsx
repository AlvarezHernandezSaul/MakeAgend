import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronDown, Building2, Plus } from 'lucide-react';

export const BusinessSelector: React.FC = () => {
  const { currentUser, currentBusiness, setCurrentBusiness, businessAccess, addBusinessAccess } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [businessKey, setBusinessKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Solo mostrar para asistentes
  if (!currentUser || currentUser.role !== 'assistant') {
    return null;
  }

  const currentBusinessData = currentBusiness ? businessAccess[currentBusiness] : null;
  const businessList = Object.values(businessAccess);

  const handleBusinessChange = async (businessId: string) => {
    await setCurrentBusiness(businessId);
    setIsOpen(false);
  };

  const handleAddBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await addBusinessAccess(businessKey);
      if (success) {
        setBusinessKey('');
        setShowAddBusiness(false);
      } else {
        setError('No se pudo encontrar el negocio con esa clave');
      }
    } catch (error: any) {
      setError(error.message || 'Error al agregar negocio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Current Business Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center w-full px-3 py-2 text-left text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
      >
        <Building2 className="h-4 w-4 mr-2 text-gray-400" />
        <span className="flex-1 truncate">
          {currentBusinessData?.businessName || 'Seleccionar negocio'}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="py-1">
            {businessList.map((business) => (
              <button
                key={business.businessId}
                onClick={() => handleBusinessChange(business.businessId)}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center ${
                  currentBusiness === business.businessId ? 'bg-pink-50 text-pink-700' : 'text-gray-700'
                }`}
              >
                <Building2 className="h-4 w-4 mr-2" />
                <div className="flex-1">
                  <div className="font-medium">{business.businessName}</div>
                  <div className="text-xs text-gray-500">
                    {business.role === 'admin' ? 'Administrador' : 
                     business.role === 'editor' ? 'Editor' : 'Visualizador'}
                  </div>
                </div>
                {currentBusiness === business.businessId && (
                  <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                )}
              </button>
            ))}
            
            {/* Add Business Option */}
            <div className="border-t border-gray-100">
              <button
                onClick={() => setShowAddBusiness(!showAddBusiness)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar negocio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Business Form */}
      {showAddBusiness && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg p-4">
          <form onSubmit={handleAddBusiness} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Clave del negocio
              </label>
              <input
                type="text"
                value={businessKey}
                onChange={(e) => setBusinessKey(e.target.value.toUpperCase())}
                placeholder="Ingresa la clave del negocio"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                maxLength={16}
                required
              />
            </div>
            
            {error && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddBusiness(false);
                  setBusinessKey('');
                  setError('');
                }}
                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-3 py-1 text-xs bg-pink-600 text-white rounded hover:bg-pink-700 disabled:opacity-50"
              >
                {loading ? 'Agregando...' : 'Agregar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
