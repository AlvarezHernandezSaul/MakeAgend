import React, { useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useBusinessData } from '../../hooks/useBusinessData';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import type { Appointment } from '../../types';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { AppointmentModal } from './AppointmentModal';

export const AppointmentCalendar: React.FC = () => {
  const { currentUser, currentBusiness } = useAuth();
  const { canCreateAppointment } = usePermissions();
  
  // Determinar el businessId según el rol del usuario
  const businessId = currentUser?.role === 'owner' 
    ? currentUser?.businessId 
    : currentBusiness;
  
  const { appointments, clients, services, loading, updateAppointment } = useBusinessData(businessId || undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('timeGridWeek');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [calendarRef, setCalendarRef] = useState<any>(null);

  const calendarEvents = useMemo(() => {
    return appointments.map(appointment => {
      const client = clients.find(c => c.id === appointment.clientId);
      const service = services.find(s => s.id === appointment.serviceId);
      
      const startDateTime = `${appointment.date}T${appointment.startTime}`;
      const endDateTime = `${appointment.date}T${appointment.endTime}`;

      let backgroundColor = '#6b7280'; // gray
      let borderColor = '#6b7280';

      switch (appointment.status) {
        case 'confirmed':
          backgroundColor = '#10b981'; // green
          borderColor = '#059669';
          break;
        case 'pending':
          backgroundColor = '#f59e0b'; // yellow
          borderColor = '#d97706';
          break;
        case 'completed':
          backgroundColor = '#3b82f6'; // blue
          borderColor = '#2563eb';
          break;
        case 'cancelled':
          backgroundColor = '#ef4444'; // red
          borderColor = '#dc2626';
          break;
        case 'no-show':
          backgroundColor = '#8b5cf6'; // purple
          borderColor = '#7c3aed';
          break;
      }

      return {
        id: appointment.id,
        title: `${client?.name || 'Cliente'} - ${service?.name || 'Servicio'}`,
        start: startDateTime,
        end: endDateTime,
        backgroundColor,
        borderColor,
        extendedProps: {
          appointment,
          client,
          service
        }
      };
    });
  }, [appointments, clients, services]);

  const handleDateSelect = (selectInfo: any) => {
    setSelectedDate(selectInfo.startStr.split('T')[0]);
    setSelectedAppointment(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (clickInfo: any) => {
    setSelectedAppointment(clickInfo.event.extendedProps.appointment);
    setSelectedDate(null);
    setIsModalOpen(true);
  };

  const handleNewAppointment = () => {
    setSelectedDate(null);
    setSelectedAppointment(null);
    setIsModalOpen(true);
  };

  const handleEventDrop = async (dropInfo: any) => {
    const appointment = dropInfo.event.extendedProps.appointment;
    const newDate = dropInfo.event.startStr.split('T')[0];
    const newStartTime = dropInfo.event.startStr.split('T')[1].substring(0, 5);
    const newEndTime = dropInfo.event.endStr.split('T')[1].substring(0, 5);

    try {
      await updateAppointment(appointment.id, {
        ...appointment,
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error al actualizar la cita:', error);
      dropInfo.revert();
    }
  };

  const handleEventResize = async (resizeInfo: any) => {
    const appointment = resizeInfo.event.extendedProps.appointment;
    const newEndTime = resizeInfo.event.endStr.split('T')[1].substring(0, 5);

    try {
      await updateAppointment(appointment.id, {
        ...appointment,
        endTime: newEndTime,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error al redimensionar la cita:', error);
      resizeInfo.revert();
    }
  };

  const handleViewChange = (newView: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') => {
    setCalendarView(newView);
    if (calendarRef) {
      calendarRef.getApi().changeView(newView);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <CalendarIcon className="h-6 w-6 text-pink-600 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Citas</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleViewChange('dayGridMonth')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                calendarView === 'dayGridMonth'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => handleViewChange('timeGridWeek')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                calendarView === 'timeGridWeek'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => handleViewChange('timeGridDay')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                calendarView === 'timeGridDay'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Día
            </button>
          </div>

          {/* New Appointment Button */}
          {canCreateAppointment && (
            <button
              onClick={handleNewAppointment}
              className="flex items-center px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cita
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mb-6 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
          <span>Pendiente</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
          <span>Confirmada</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
          <span>Completada</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
          <span>Cancelada</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
          <span>No asistió</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <FullCalendar
          ref={setCalendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: ''
          }}
          initialView={calendarView}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          events={calendarEvents}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          height="auto"
          locale="es"
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          slotDuration="00:30:00"
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5, 6], // Monday - Saturday
            startTime: '09:00',
            endTime: '18:00'
          }}
          eventMouseEnter={(info) => {
            info.el.style.cursor = 'pointer';
          }}
        />
      </div>

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        selectedDate={selectedDate}
        appointment={selectedAppointment}
      />
    </div>
  );
};
