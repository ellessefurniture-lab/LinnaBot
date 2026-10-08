import { Menu, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  onToggleSidebar: () => void;
  botStatus?: {
    isConfigured: boolean;
    mode: string;
    isRunning: boolean;
  };
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, botStatus }) => {
  const { admin } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Enterprise Admin
          </span>
        </div>
      </div>

      {/* Bot Status & Admin Badge */}
      <div className="flex items-center gap-4">
        {/* Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-medium">
          <span
            className={`w-2 h-2 rounded-full ${
              botStatus?.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="text-slate-300 hidden md:inline">
            Bot Status: {botStatus?.isRunning ? 'Online' : 'Standby'}
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
            ({botStatus?.mode || 'POLLING'})
          </span>
        </div>

        {/* Profile Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xs font-medium text-slate-200 hidden sm:inline">
            {admin?.username}
          </span>
        </div>
      </div>
    </header>
  );
};
