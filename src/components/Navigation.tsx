import React from 'react';
import { TabId, UserRole, DeviceViewMode } from '../types';
import { 
  Sprout, 
  ClipboardList, 
  Users, 
  CheckCheck,
  LayoutDashboard, 
  FileSpreadsheet, 
  UserCog, 
  FileUp, 
  Cloud 
} from 'lucide-react';

interface NavigationProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  userRole: UserRole;
  deviceMode?: DeviceViewMode;
}

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const TABS: TabConfig[] = [
  {
    id: 'programaGeneral',
    label: 'General',
    icon: <Sprout className="w-5 h-5" />,
    roles: ['Administrador', 'Supervisor']
  },
  {
    id: 'programa',
    label: 'Ejecución',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['Administrador', 'Supervisor']
  },
  {
    id: 'trabajadores',
    label: 'Personal',
    icon: <Users className="w-5 h-5" />,
    roles: ['Administrador', 'Trabajador']
  },
  {
    id: 'validacion',
    label: 'Validación',
    icon: <CheckCheck className="w-5 h-5" />,
    roles: ['Administrador', 'Supervisor']
  },
  {
    id: 'dashboard',
    label: 'Panel',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['Administrador']
  },
  {
    id: 'reportes',
    label: 'Reportes',
    icon: <FileSpreadsheet className="w-5 h-5" />,
    roles: ['Administrador']
  },
  {
    id: 'usuarios',
    label: 'Usuarios',
    icon: <UserCog className="w-5 h-5" />,
    roles: ['Administrador']
  },
  {
    id: 'importar',
    label: 'Importar',
    icon: <FileUp className="w-5 h-5" />,
    roles: ['Administrador']
  },
  {
    id: 'conexion',
    label: 'Nube',
    icon: <Cloud className="w-5 h-5" />,
    roles: ['Administrador']
  }
];

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  userRole,
  deviceMode = 'pc'
}) => {
  const visibleTabs = TABS.filter(t => t.roles.includes(userRole));

  return (
    <div className="bg-white border-b border-[#e0e0e0] shadow-sm sticky top-[92px] sm:top-[104px] z-30">
      <div className={`mx-auto px-2 ${deviceMode === 'celular' ? 'max-w-md' : 'max-w-6xl'}`}>
        <nav className="flex gap-1.5 overflow-x-auto py-2 scrollbar-none no-scrollbar" aria-label="Tabs">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex-1 min-w-[70px] sm:min-w-[84px] py-2 px-1 sm:px-2 rounded-xl flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#2e7d32] text-white shadow-md font-bold'
                    : 'text-[#5f6368] hover:text-[#2e7d32] hover:bg-[#f1f8e9] font-medium'
                }`}
              >
                <div className={`mb-1 transition-transform ${isActive ? 'scale-110' : ''}`}>
                  {tab.icon}
                </div>
                <span className="text-[10px] sm:text-[11px] uppercase tracking-tighter sm:tracking-normal truncate max-w-full">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
