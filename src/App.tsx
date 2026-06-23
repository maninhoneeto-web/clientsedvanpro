import React, { useState } from 'react';
import { useAppState } from './useAppState';
import Dashboard from './components/Dashboard';
import Clients from './components/Clients';
import Sales from './components/Sales';
import Visits from './components/Visits';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, Users, ShoppingBag, CalendarDays, 
  Menu, X, Sparkles, Store, ShieldCheck, HeartPulse 
} from 'lucide-react';

type TabType = 'dashboard' | 'clients' | 'sales' | 'visits';

export default function App() {
  const {
    clients,
    sales,
    visits,
    loading,
    addClient,
    updateClient,
    deleteClient,
    addSale,
    deleteSale,
    addVisit,
    updateVisit,
    deleteVisit,
    exportData,
    importData
  } = useAppState();

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [preSelectedClient, setPreSelectedClient] = useState<string>('');

  // Tab transition handles
  const handleNavigateToTab = (tab: TabType, clientId?: string) => {
    if (clientId) {
      setPreSelectedClient(clientId);
    } else {
      setPreSelectedClient('');
    }
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'clients', label: 'Meus Clientes', icon: Users },
    { id: 'sales', label: 'Vendas & Lucros', icon: ShoppingBag },
    { id: 'visits', label: 'Visitas & Roteiros', icon: CalendarDays },
  ] as const;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-600">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-semibold text-sm">Carregando ClientsProEdvan...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800 antialiased font-sans">
      
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-100 border-r border-slate-850 shrink-0 select-none pb-4">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-850/60 flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500 text-white rounded-lg shadow-sm shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <span className="font-black text-sm uppercase tracking-wider block text-white">ClientsPro</span>
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest block -mt-1">Edvan Magnus</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 bg-slate-900">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigateToTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-600 font-bold text-white shadow-xs'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-all ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Offline-Ready Safe Badge Footer */}
        <div className="px-5 py-4 mt-auto border-t border-slate-850/60 mx-4 bg-slate-950/40 rounded-xl space-y-2 text-left">
          <div className="flex items-center gap-2 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-bold text-[10px] text-slate-300 uppercase tracking-wider">Armazenamento Seguro</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Seus dados estão 100% salvos offline no navegador. Ideal para o campo sem sinal de internet!
          </p>
          <div className="flex items-center gap-1.5 pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[9px] text-emerald-400 font-mono uppercase font-bold">Banco Local Ativo</span>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="md:hidden bg-slate-900 text-slate-100 border-b border-slate-850 sticky top-0 z-50 flex items-center justify-between px-4 py-3 select-none">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500 text-white rounded-md shrink-0">
            <Store className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="font-extrabold text-xs uppercase tracking-wider block text-white leading-none">ClientsPro</span>
            <span className="text-[8px] uppercase font-bold text-emerald-400 tracking-widest block">Edvan Magnus</span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-all"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-slate-900 border-b border-slate-800 absolute top-[52px] left-0 right-0 z-40 p-4 font-sans space-y-2 text-left"
          >
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigateToTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
            
            <div className="pt-3 border-t border-slate-800 px-2 flex items-center justify-between text-[10px] text-slate-500">
              <span>🗄️ Modo Offline Ativo</span>
              <span className="text-emerald-400 font-bold">100% SEGURO ✔</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN VIEWPORT CANVAS */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full mobile-smooth-scroll">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            {activeTab === 'dashboard' && (
              <Dashboard
                clients={clients}
                sales={sales}
                visits={visits}
                onNavigateToTab={handleNavigateToTab}
                exportData={exportData}
                importData={importData}
              />
            )}

            {activeTab === 'clients' && (
              <Clients
                clients={clients}
                sales={sales}
                visits={visits}
                addClient={addClient}
                updateClient={updateClient}
                deleteClient={deleteClient}
                onNavigateToTab={handleNavigateToTab}
              />
            )}

            {activeTab === 'sales' && (
              <Sales
                clients={clients}
                sales={sales}
                addSale={addSale}
                deleteSale={deleteSale}
                preSelectedClientId={preSelectedClient}
              />
            )}

            {activeTab === 'visits' && (
              <Visits
                clients={clients}
                visits={visits}
                sales={sales}
                addVisit={addVisit}
                updateVisit={updateVisit}
                deleteVisit={deleteVisit}
                preSelectedClientId={preSelectedClient}
                onNavigateToTab={handleNavigateToTab}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

    </div>
  );
}
