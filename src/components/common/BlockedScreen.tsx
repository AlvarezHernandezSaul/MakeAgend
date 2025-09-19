import React, { useState } from 'react';
import { XCircle, Mail, RefreshCw } from 'lucide-react';
import { notificationService } from '../../utils/notificationService';
import type { User } from '../../types';

interface BlockedScreenProps {
  user: User;
  reason?: string;
  onRetry?: () => void;
}

export const BlockedScreen: React.FC<BlockedScreenProps> = ({ 
  user, 
  reason, 
  onRetry 
}) => {
  const [isRequestingSent, setIsRequestingSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

  const handleRequestReactivation = async () => {
    if (isRequestingSent) return;

    try {
      setIsLoading(true);
      
      // Enviar notificación al administrador
      await notificationService.notifyAdminReactivationRequest(
        user.businessId || user.currentBusiness || '',
        `Negocio de ${user.displayName}`,
        user.email
      );

      setIsRequestingSent(true);
    } catch (error) {
      console.error('Error sending reactivation request:', error);
      alert('Error al enviar la solicitud. Intente contactar directamente al administrador.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!onRetry || isVerifying) return;
    
    try {
      setIsVerifying(true);
      setVerificationMessage(null);
      
      await onRetry();
      
      // Mostrar mensaje de verificación completada
      setVerificationMessage('✅ Verificación completada. Si su licencia fue reactivada, será redirigido automáticamente.');
      
      // Esperar un poco para que se procesen los cambios
      setTimeout(() => {
        setIsVerifying(false);
        setVerificationMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error verifying status:', error);
      setVerificationMessage('❌ Error al verificar el estado. Intente nuevamente.');
      setIsVerifying(false);
      
      // Limpiar mensaje de error después de 3 segundos
      setTimeout(() => {
        setVerificationMessage(null);
      }, 3000);
    }
  };

  const handleEmailContact = () => {
    const subject = encodeURIComponent('Solicitud de Reactivación de Cuenta - MakeAgend');
    const body = encodeURIComponent(
      `Estimado Administrador,\n\n` +
      `Solicito la reactivación de mi cuenta en MakeAgend.\n\n` +
      `Detalles de la cuenta:\n` +
      `- Nombre: ${user.displayName}\n` +
      `- Email: ${user.email}\n` +
      `- Rol: ${user.role}\n` +
      `- ID de Usuario: ${user.uid}\n` +
      `${user.businessId ? `- ID de Negocio: ${user.businessId}\n` : ''}` +
      `\nMotivo del bloqueo: ${reason || 'No especificado'}\n\n` +
      `Agradezco su pronta atención.\n\n` +
      `Saludos cordiales,\n${user.displayName}`
    );
    
    window.location.href = `mailto:sauldisel4@gmail.com?subject=${subject}&body=${body}`;
  };

  const getBlockingMessage = () => {
    if (reason) return reason;
    
    if (user.role === 'owner') {
      return 'Su licencia ha expirado o ha sido cancelada. Contacte al administrador para reactivar su cuenta.';
    } else if (user.role === 'assistant') {
      return 'La licencia del negocio al que tiene acceso ha expirado o ha sido cancelada. Contacte al administrador para más información.';
    }
    
    return 'Su cuenta ha sido bloqueada. Contacte al administrador para más información.';
  };

  const getActionMessage = () => {
    if (user.role === 'owner') {
      return 'Como propietario del negocio, puede solicitar la renovación de su licencia.';
    } else if (user.role === 'assistant') {
      return 'Como asistente, el propietario del negocio debe renovar la licencia.';
    }
    
    return 'Puede solicitar la reactivación de su cuenta.';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="bg-red-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Cuenta Bloqueada
          </h2>

          {/* Message */}
          <p className="text-gray-600 mb-6 leading-relaxed">
            {getBlockingMessage()}
          </p>

          {/* Action Message */}
          <p className="text-sm text-gray-500 mb-8">
            {getActionMessage()}
          </p>

          {/* Action Buttons */}
          <div className="space-y-4">
            {/* Request Reactivation Button */}
            {user.role === 'owner' && (
              <button
                onClick={handleRequestReactivation}
                disabled={isRequestingSent || isLoading}
                className={`w-full flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-colors ${
                  isRequestingSent
                    ? 'bg-green-100 text-green-800 cursor-not-allowed'
                    : isLoading
                    ? 'bg-pink-400 text-white cursor-not-allowed'
                    : 'bg-pink-600 text-white hover:bg-pink-700'
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Enviando solicitud...
                  </>
                ) : isRequestingSent ? (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Solicitud enviada
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Solicitar Reactivación
                  </>
                )}
              </button>
            )}

            {/* Email Contact Button */}
            <button
              onClick={handleEmailContact}
              className="w-full flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Mail className="h-4 w-4 mr-2" />
              Contactar por Email
            </button>

            {/* Retry Button (if provided) */}
            {onRetry && (
              <button
                onClick={handleRetry}
                disabled={isVerifying}
                className={`w-full flex items-center justify-center px-6 py-3 text-sm transition-colors ${
                  isVerifying 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isVerifying ? 'animate-spin' : ''}`} />
                {isVerifying ? 'Verificando...' : 'Verificar nuevamente'}
              </button>
            )}
          </div>

          {/* Contact Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-400 mb-2">
              Administrador del Sistema
            </p>
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
              <a 
                href="mailto:sauldisel4@gmail.com"
                className="flex items-center hover:text-pink-600 transition-colors"
              >
                <Mail className="h-3 w-3 mr-1" />
                sauldisel4@gmail.com
              </a>
            </div>
          </div>

          {/* Success Message */}
          {isRequestingSent && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✅ Su solicitud de reactivación ha sido enviada al administrador. 
                Recibirá una respuesta pronto.
              </p>
            </div>
          )}

          {/* Verification Message */}
          {verificationMessage && (
            <div className={`mt-6 p-4 rounded-lg ${
              verificationMessage.includes('❌') 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <p className={`text-sm ${
                verificationMessage.includes('❌') 
                  ? 'text-red-800' 
                  : 'text-blue-800'
              }`}>
                {verificationMessage}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
