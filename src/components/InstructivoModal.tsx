import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  QrCode, 
  Layers, 
  Package, 
  Save, 
  UserCheck, 
  Printer, 
  Copy, 
  Check, 
  LogIn, 
  Users, 
  Building2, 
  PlusCircle, 
  Bookmark, 
  Search, 
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';

interface InstructivoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast?: (msg: string, type?: 'success' | 'warning' | 'info') => void;
}

export const InstructivoModal: React.FC<InstructivoModalProps> = ({
  isOpen,
  onClose,
  onToast
}) => {
  const [copied, setCopied] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [activeTab, setActiveTab] = useState<'pasos' | 'resumen'>('pasos');

  if (!isOpen) return null;

  const handleCopyText = () => {
    const text = `INSTRUCTIVO DE USO DE LA APLICACIÓN
RECOJO DE FRUTA - AGROFIELD (AQU ANQA PRIZE S.A.C.)

OBJETIVO
Este instructivo tiene como finalidad guiar al supervisor en el proceso de asignación de personal y registro de avance de labores dentro de la aplicación.

==================================================
PASO A PASO DEL PROCESO
==================================================

Paso 1: Iniciar Sesión
- Ingrese su usuario y contraseña.
- Presione el botón "Ingresar" para acceder al sistema.

Paso 2: Verificación de Nómina
- Revise la nómina de personal disponible.
- Verifique que la información coincida con la relación de trabajadores de la Casa de Personal.
- Confirme que todos los trabajadores asignados se encuentren registrados correctamente.

Paso 3: Completar Información General
Complete los siguientes campos obligatorios:
- Supervisor (usuario de Tareo AgriTracer).
- Fundo.
- Módulo.
- Grupo.
- Líder.
Verifique que toda la información sea correcta antes de continuar.

Paso 4: Asignación de Personal mediante Escaneo
- Presione el botón "Escaneo para Asignación de Personal".
- Seleccione la opción "En Vivo" para realizar el escaneo de manera más rápida.
* IMPORTANTE: Esta opción es indispensable cuando se tenga más de un grupo por asignar.
* CASO ESPECIAL (Un Solo Grupo): Si únicamente cuenta con un grupo para registrar, seleccione la opción "Sin Grupo". El sistema mostrará el total de trabajadores disponibles para la asignación.

Paso 5: Registro de Avance
Esta funcionalidad se utiliza cuando el personal ha culminado su labor y se requiere registrar el avance obtenido.
- Seleccione la opción "Registro de Avance".
- Ingrese el total de jabas cosechadas.
* Agregar Grupos sin Registrar Avance: Si únicamente desea agregar grupos y continuar más tarde, presione la opción "Guardar Reserva".
* Validación de la Reserva: Para confirmar que la información fue guardada correctamente, presione la opción "Reserva por Supervisor". Verifique que el grupo registrado aparezca en la lista.

Paso 6: Asignación de Jabas al Personal
- Acceda a la pantalla de asignación de jabas.
- Revise el resumen del total de personal asignado.
- Para asignar producción a cada trabajador:
  * Presione el símbolo (+) según el avance correspondiente.
  * Registre la cantidad de jabas de cada trabajador.
- Una vez finalizada la distribución, presione "Confirmar Avance".

Paso 7: Guardar Avance
- Revise que la asignación realizada sea correcta.
- Verifique que el total de jabas asignadas coincida con el avance registrado.
- Presione "Guardar Avance" para registrar la información en el sistema.

✅ Proceso finalizado exitosamente.

==================================================
NOTAS Y RECOMENDACIONES IMPORTANTES
==================================================
* Nota Importante: Si necesita asignar un nuevo grupo de trabajo, deberá reiniciar el proceso desde el Paso 1 y repetir el procedimiento completo.
* Recomendación: Verifique siempre la información antes de confirmar o guardar los avances para garantizar la calidad y trazabilidad de los datos registrados.`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (onToast) onToast('📋 Instructivo copiado al portapapeles', 'success');
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      if (onToast) onToast('⚠️ No se pudo copiar automáticamente', 'warning');
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const pasos = [
    {
      num: 1,
      titulo: 'Iniciar Sesión',
      icono: LogIn,
      color: 'bg-emerald-600',
      badge: 'Acceso Seguro',
      detalles: [
        'Ingrese su usuario y contraseña asignados.',
        'Presione el botón "Ingresar" para acceder al sistema y validar su turno de trabajo.'
      ],
      tip: 'Verifique que la hora de login refleje el horario de inicio de su jornada.'
    },
    {
      num: 2,
      titulo: 'Verificación de Nómina',
      icono: Users,
      color: 'bg-blue-600',
      badge: 'Control Previo',
      detalles: [
        'Revise la nómina de personal disponible en la pantalla principal de Personal.',
        'Verifique que la información coincida con la relación de trabajadores de la Casa de Personal.',
        'Confirme que todos los trabajadores asignados se encuentren registrados correctamente antes de iniciar la jornada.'
      ],
      tip: 'Si falta algún trabajador, coordine inmediatamente con el Administrador para su carga en nómina.'
    },
    {
      num: 3,
      titulo: 'Completar Información General',
      icono: Building2,
      color: 'bg-amber-600',
      badge: 'Campos Obligatorios',
      detalles: [
        'Complete rigurosamente los siguientes 5 campos clave:',
        '1. Supervisor (usuario correspondiente en Tareo AgriTracer).',
        '2. Fundo (ej. Arena Azul, Santa Teresa, Ayllu Allpa, Vivadis).',
        '3. Módulo (ej. M01, M04, M08).',
        '4. Grupo de trabajo asignado.',
        '5. Líder de cuadrilla responsable.',
        'Verifique que toda la información sea exacta antes de continuar.'
      ],
      tip: 'Esta configuración garantiza la correcta vinculación con AgriTracer y Google Sheets.'
    },
    {
      num: 4,
      titulo: 'Asignación de Personal mediante Escaneo',
      icono: QrCode,
      color: 'bg-purple-600',
      badge: 'Escaneo QR / DNI',
      detalles: [
        'Presione el botón "Escaneo para Asignación de Personal".',
        'Seleccione la opción "En Vivo" para realizar el escaneo continuo con la cámara de manera más rápida.',
        '🔔 Importante: Esta opción es indispensable cuando se tenga más de un grupo por asignar.',
        '💡 Caso Especial (Un Solo Grupo): Si únicamente cuenta con un solo grupo para registrar, seleccione la opción "Sin Grupo". El sistema mostrará el total de trabajadores disponibles para la asignación inmediata.'
      ],
      tip: 'La cámara en vivo detecta códigos de fotocheck o DNI al instante sin necesidad de recargar la página.'
    },
    {
      num: 5,
      titulo: 'Registro de Avance (o Reserva)',
      icono: Package,
      color: 'bg-orange-600',
      badge: 'Fin de Labor o Reserva',
      detalles: [
        'Esta funcionalidad se utiliza cuando el personal ha culminado su labor y se requiere registrar el avance obtenido.',
        'Seleccione la opción "Registro de Avance" e ingrese el total de jabas cosechadas.',
        '📌 Agregar Grupos sin Registrar Avance (Modo Reserva): Si únicamente desea agregar los grupos y continuar más tarde en el campo, presione la opción "Guardar Reserva".',
        '🔍 Validación de la Reserva: Para confirmar que la información fue guardada correctamente, presione la opción "Reserva por Supervisor" y verifique que el grupo registrado aparezca en la lista.'
      ],
      tip: 'Las reservas protegen sus asignaciones incluso si se cierra el navegador o se corta la señal.'
    },
    {
      num: 6,
      titulo: 'Asignación de Jabas al Personal',
      icono: PlusCircle,
      color: 'bg-teal-600',
      badge: 'Distribución Detallada',
      detalles: [
        'Acceda a la pantalla de asignación de jabas.',
        'Revise el resumen del total de personal asignado a la cuadrilla.',
        'Para asignar producción a cada trabajador:',
        '• Presione el símbolo (+) según el avance correspondiente.',
        '• Registre la cantidad exacta de jabas de cada trabajador.',
        'Una vez finalizada la distribución, presione "Confirmar Avance".'
      ],
      tip: 'El contador superior le alertará en tiempo real sobre la cantidad de jabas distribuidas vs. total ingresado.'
    },
    {
      num: 7,
      titulo: 'Guardar Avance en el Sistema',
      icono: Save,
      color: 'bg-emerald-700',
      badge: 'Cierre y Confirmación',
      detalles: [
        'Revise minuciosamente que la asignación realizada sea correcta.',
        'Verifique que el total de jabas asignadas coincida exactamente con el avance registrado.',
        'Presione "Guardar Avance" para registrar la información de forma definitiva en el sistema, base central y base en la nube.'
      ],
      tip: 'Al guardar, el avance queda sincronizado y asegurado en la memoria del dispositivo y la nube.'
    }
  ];

  const filteredPasos = filterText.trim()
    ? pasos.filter(p => 
        p.titulo.toLowerCase().includes(filterText.toLowerCase()) ||
        p.detalles.some(d => d.toLowerCase().includes(filterText.toLowerCase())) ||
        p.tip.toLowerCase().includes(filterText.toLowerCase())
      )
    : pasos;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-emerald-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con gradiente institucional */}
        <div className="bg-gradient-to-r from-[#1b5e20] via-[#2e7d32] to-[#388e3c] text-white p-4 sm:p-5 flex items-center justify-between shrink-0 shadow-md print:bg-white print:text-gray-900 print:border-b-2 print:border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-inner print:bg-emerald-100">
              <BookOpen className="w-5 h-5 text-emerald-100 print:text-emerald-800" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                  Instructivo de Uso de la Aplicación
                </h2>
                <span className="bg-amber-400 text-gray-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                  Guía para Supervisores
                </span>
              </div>
              <p className="text-xs text-white/85 mt-0.5 print:text-gray-600">
                Recojo de Fruta · Aqu anqa Prize S.A.C. · AgroField
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 print:hidden">
            <button
              type="button"
              onClick={handleCopyText}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                copied 
                  ? 'bg-emerald-800 text-white border-emerald-400 shadow-xs' 
                  : 'bg-white/15 hover:bg-white/25 text-white border-white/25'
              }`}
              title="Copiar instructivo completo"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/15 hover:bg-white/25 text-white border border-white/25 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Imprimir o Exportar en PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer ml-1"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Objetivo y Búsqueda */}
        <div className="bg-emerald-50/70 border-b border-emerald-100 p-3 sm:p-4 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:bg-transparent">
          <div className="flex items-start gap-2.5 max-w-2xl">
            <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-900 block">
                Objetivo del Instructivo
              </span>
              <p className="text-xs text-gray-700 leading-relaxed font-medium">
                Guiar al supervisor en el proceso de <strong>asignación de personal</strong> y <strong>registro de avance de labores</strong> dentro de la aplicación.
              </p>
            </div>
          </div>

          <div className="relative print:hidden min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Buscar en los pasos..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-lg border border-emerald-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
            />
            {filterText && (
              <button 
                onClick={() => setFilterText('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Contenido con scroll */}
        <div className="p-3 sm:p-6 overflow-y-auto space-y-4 flex-1 print:overflow-visible">
          {/* Timeline de Pasos */}
          <div className="space-y-3.5">
            {filteredPasos.map((paso) => {
              const IconComp = paso.icono;
              return (
                <div 
                  key={paso.num}
                  className="bg-white border border-gray-200 hover:border-emerald-300 rounded-xl p-3.5 sm:p-4 shadow-2xs transition-all hover:shadow-xs relative overflow-hidden group print:border-gray-300 print:shadow-none"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Número e Ícono */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`w-8 h-8 rounded-lg ${paso.color} text-white flex items-center justify-center font-black text-sm shadow-xs`}>
                        {paso.num}
                      </div>
                      <div className="w-0.5 h-6 bg-gray-200 mt-1.5 hidden group-last:hidden sm:block print:hidden" />
                    </div>

                    {/* Contenido del Paso */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                        <div className="flex items-center gap-2">
                          <IconComp className="w-4 h-4 text-emerald-800" />
                          <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">
                            Paso {paso.num}: {paso.titulo}
                          </h3>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {paso.badge}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-gray-700 leading-relaxed pl-1 border-l-2 border-emerald-500/30 ml-0.5">
                        {paso.detalles.map((det, i) => {
                          const isSpecial = det.includes('Importante') || det.includes('Caso Especial') || det.includes('Agregar Grupos') || det.includes('Validación');
                          return (
                            <p 
                              key={i} 
                              className={`py-0.5 ${isSpecial ? 'font-semibold text-emerald-950 bg-emerald-50/70 p-1.5 rounded border border-emerald-200/60 my-1' : ''}`}
                            >
                              {det}
                            </p>
                          );
                        })}
                      </div>

                      {/* Tip o Recomendación del paso */}
                      {paso.tip && (
                        <div className="mt-2.5 flex items-start gap-1.5 text-[11px] text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200/80">
                          <Info className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                          <span><strong>Consejo:</strong> {paso.tip}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bloque: Proceso Finalizado */}
          <div className="bg-emerald-600 text-white rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-sm print:bg-emerald-800">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-200 shrink-0" />
              <div>
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                  ✅ Proceso Finalizado Exitosamente
                </h4>
                <p className="text-[11px] text-emerald-100">
                  El avance y personal quedan asegurados con trazabilidad y sincronización completa.
                </p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-black tracking-wider bg-black/20 px-2.5 py-1 rounded-md border border-white/20">
              Paso 1 al 7
            </span>
          </div>

          {/* Bloques de Alerta y Recomendación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Nota Importante */}
            <div className="bg-amber-50 border border-amber-300/80 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 mb-1.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <h4 className="text-xs font-extrabold uppercase tracking-wide">
                  Nota Importante
                </h4>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                Si necesita asignar un <strong>nuevo grupo de trabajo</strong>, deberá reiniciar el proceso desde el <strong>Paso 1</strong> y repetir el procedimiento completo.
              </p>
            </div>

            {/* Recomendación */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 mb-1.5 text-blue-900">
                <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                <h4 className="text-xs font-extrabold uppercase tracking-wide">
                  Recomendación Clave
                </h4>
              </div>
              <p className="text-xs text-blue-900 leading-relaxed font-medium">
                Verifique siempre la información antes de confirmar o guardar los avances para garantizar la <strong>calidad</strong> y <strong>trazabilidad</strong> de los datos registrados.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-3 sm:px-5 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="text-[11px] text-gray-500 hidden sm:block">
            Tip: Puedes imprimir o guardar en PDF esta guía para llevarla al campo.
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopyText}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-300 hover:bg-white text-gray-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
              <span>{copied ? 'Copiado' : 'Copiar Texto'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#2e7d32] hover:bg-[#1b5e20] text-white shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
