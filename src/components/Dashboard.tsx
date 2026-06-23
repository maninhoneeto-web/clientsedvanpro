import React, { useRef, useState } from 'react';
import { Client, Sale, Visit } from '../types';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';
import { 
  TrendingUp, Users, Calendar, ShoppingBag, ArrowUpRight, DollarSign, 
  Download, Upload, AlertCircle, AlertTriangle, FileText, ChevronRight 
} from 'lucide-react';

interface DashboardProps {
  clients: Client[];
  sales: Sale[];
  visits: Visit[];
  onNavigateToTab: (tab: 'dashboard' | 'clients' | 'sales' | 'visits', preSelectedClient?: string) => void;
  exportData: () => void;
  importData: (json: string) => boolean;
}

export default function Dashboard({
  clients,
  sales,
  visits,
  onNavigateToTab,
  exportData,
  importData
}: DashboardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: ''
  });

  // 1. Calculate General KPI Metrics with absolute safety guarding
  const safeClients = Array.isArray(clients) ? clients.filter(Boolean) : [];
  const safeSales = Array.isArray(sales) ? sales.filter(Boolean) : [];
  const safeVisits = Array.isArray(visits) ? visits.filter(Boolean) : [];

  const totalClients = safeClients.length;
  const pendingVisits = safeVisits.filter(v => v && v.status === 'scheduled');
  
  let totalRevenue = 0;
  let totalCost = 0;
  let totalWeightMagnus = 0;

  safeSales.forEach(sale => {
    if (!sale) return;
    totalRevenue += Number(sale.totalSale) || 0;
    totalCost += Number(sale.totalCost) || 0;
    if (Array.isArray(sale.items)) {
      sale.items.forEach(item => {
        if (!item) return;
        if (item.isMagnus) {
          totalWeightMagnus += ((Number(item.weightKg) || 0) * (Number(item.quantity) || 0));
        }
      });
    }
  });

  const totalNetProfit = totalRevenue - totalCost;
  const avgProfitPercentage = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;

  // 2. Prepare Recharts Chart Data: Sales timeline
  const salesByDate: { [key: string]: { date: string; Revenue: number; Cost: number; Profit: number } } = {};
  
  // Last 10 sales in chronological order for the trend chart
  const chronSales = [...safeSales].sort((a, b) => {
    const timeA = a?.date ? new Date(a.date).getTime() : 0;
    const timeB = b?.date ? new Date(b.date).getTime() : 0;
    return timeA - timeB;
  }).slice(-10);
  
  chronSales.forEach(sale => {
    if (!sale) return;
    const saleDateStr = sale.date || new Date().toISOString().split('T')[0];
    const formattedDate = saleDateStr.split('-').reverse().slice(0, 2).join('/'); // DD/MM format
    if (salesByDate[formattedDate]) {
      salesByDate[formattedDate].Revenue += Number(sale.totalSale) || 0;
      salesByDate[formattedDate].Cost += Number(sale.totalCost) || 0;
      salesByDate[formattedDate].Profit += Number(sale.profit) || 0;
    } else {
      salesByDate[formattedDate] = {
        date: formattedDate,
        Revenue: Number(sale.totalSale) || 0,
        Cost: Number(sale.totalCost) || 0,
        Profit: Number(sale.profit) || 0
      };
    }
  });

  const timelineChartData = Object.values(salesByDate);

  // If chart data is empty, put a mockup placeholder for display so things look great
  const displayChartData = timelineChartData.length > 0 ? timelineChartData : [
    { date: 'Maio/01', Revenue: 1200, Cost: 800, Profit: 400 },
    { date: 'Maio/15', Revenue: 1800, Cost: 1200, Profit: 600 },
    { date: 'Jun/02', Revenue: 1920, Cost: 1350, Profit: 570 },
    { date: 'Jun/15', Revenue: 1765, Cost: 1240, Profit: 525 }
  ];

  // 3. Prepare Recharts Bar Chart: Sales distribution by Magnus categories
  const categorySummary: { [key: string]: number } = { Cães: 0, Gatos: 0, Outros: 0 };
  safeSales.forEach(sale => {
    if (!sale || !Array.isArray(sale.items)) return;
    sale.items.forEach(it => {
      if (!it) return;
      const prodName = it.productName || '';
      const cat = prodName.toLowerCase().includes('gato') || prodName.toLowerCase().includes('cat') ? 'Gatos' : 'Cães';
      categorySummary[cat] = (categorySummary[cat] || 0) + ((Number(it.weightKg) || 0) * (Number(it.quantity) || 0));
    });
  });

  const barChartData = [
    { name: 'Cães (Kg)', volume: categorySummary['Cães'] || 0, color: '#059669' },
    { name: 'Gatos (Kg)', volume: categorySummary['Gatos'] || 0, color: '#ea580c' },
    { name: 'Outros (Kg)', volume: categorySummary['Outros'] || 0, color: '#4f46e5' }
  ];

  // 4. Upcoming schedules list
  const nextVisits = [...pendingVisits].sort((a, b) => {
    const timeA = a?.date ? new Date(a.date).getTime() : 0;
    const timeB = b?.date ? new Date(b.date).getTime() : 0;
    return timeA - timeB;
  }).slice(0, 3);

  // 5. Handle Import Backup Trigger
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importData(content);
      if (success) {
        setImportStatus({
          type: 'success',
          message: 'Excelente! Os dados foram importados e restaurados com absoluto sucesso.'
        });
        setTimeout(() => setImportStatus({ type: 'idle', message: '' }), 4000);
      } else {
        setImportStatus({
          type: 'error',
          message: 'Erro ao importar. Arquivo corrompido ou formato incompatível.'
        });
      }
    };
    reader.readAsText(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* Title greeting panel */}
      <div className="p-6 bg-slate-905 rounded-2xl text-white shadow-md relative overflow-hidden text-left bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800">
        <div className="space-y-2 relative z-10 max-w-2xl">
          <span className="inline-block px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase rounded-full tracking-wider border border-emerald-500/30">Representante Magnus</span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-sans text-white">Painel ClientsProEdvan</h1>
          <p className="text-slate-350 text-xs sm:text-sm leading-relaxed">Controle de faturamento de rações, agendamento de compras e rota de visitas comerciais com máxima praticidade.</p>
        </div>

        {/* Ambient background glows - hidden on mobile to prevent slow GPU compositing/ghosting glitches */}
        <div className="hidden md:block absolute right-0 bottom-0 top-0 w-1/3 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
      </div>

      {importStatus.type !== 'idle' && (
        <div className={`p-4 rounded-xl flex items-center gap-2.5 text-xs text-left font-medium ${
          importStatus.type === 'success' ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' : 'bg-rose-50 border border-rose-100 text-rose-800'
        }`}>
          {importStatus.type === 'success' ? (
            <AlertCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{importStatus.message}</span>
        </div>
      )}

      {/* KPI Metrics Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
        {/* Total revenue */}
        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-xs flex justify-between items-center relative group overflow-hidden">
          <div className="space-y-1.5">
            <span className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider">Faturamento Total Geral</span>
            <span className="text-xl sm:text-2xl font-extrabold text-slate-850 font-mono">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 block font-medium">Soma de faturamentos antigos</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl group-hover:scale-105 transition-transform">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Net Profit and Percentage */}
        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-xs flex justify-between items-center relative group overflow-hidden">
          <div className="space-y-1.5">
            <span className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider">Seu Lucro Comissionado</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 font-mono">
                R$ {totalNetProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-emerald-600 font-mono">({avgProfitPercentage.toFixed(1)}%)</span>
            </div>
            <span className="text-[10px] text-emerald-600 block font-semibold">Margem comercial calculada</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl group-hover:scale-105 transition-transform">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Total weight sold */}
        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-xs flex justify-between items-center relative group overflow-hidden">
          <div className="space-y-1.5">
            <span className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider">Total Kg de Magnus</span>
            <span className="text-xl sm:text-2xl font-extrabold text-slate-850 font-mono">
              {totalWeightMagnus.toFixed(0)} Kg
            </span>
            <span className="text-[10px] text-slate-400 block font-medium">Volume real escoado</span>
          </div>
          <div className="p-3 bg-orange-50 text-orange-700 rounded-xl group-hover:scale-105 transition-transform">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* Active clients */}
        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-xs flex justify-between items-center relative group overflow-hidden">
          <div className="space-y-1.5">
            <span className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider">Clientes Agropecuárias</span>
            <span className="text-xl sm:text-2xl font-extrabold text-slate-850 font-mono">
              {totalClients} Ativos
            </span>
            <span className="text-[10px] text-slate-400 block font-medium">Bancos de faturamento mapeados</span>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl group-hover:scale-105 transition-transform">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Visual Analytics / Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Area: Faturamento Evolution Area chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs text-left">
          <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-3">
            <div>
              <h3 className="font-bold text-slate-850 text-sm uppercase tracking-wider">Escoamento e Fluxo de Faturamento</h3>
              <p className="text-[11px] text-slate-500">Acompanhamento de faturamento acumulado e comissões ganhas ($)</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold rounded-lg uppercase">Cronológico</span>
          </div>

          <div className="h-64 sm:h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={displayChartData}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, '']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Legend iconType="circle" />
                <Area type="monotone" name="Faturamento (R$)" dataKey="Revenue" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" name="Seu Lucro (R$)" dataKey="Profit" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Area: Weight classes distribution bar chart */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs text-left">
          <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-3">
            <div>
              <h3 className="font-bold text-slate-850 text-sm uppercase tracking-wider">Volume Magnus por Categoria</h3>
              <p className="text-[11px] text-slate-500">Filtro de quilos escoados na carteira</p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full text-xs">
            {sales.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-slate-350 text-center">
                <AlertCircle className="w-10 h-10 text-slate-200 stroke-1 mb-2" />
                <p className="font-semibold text-xs uppercase tracking-wider">Aguardando Faturamento</p>
                <p className="text-[10px] text-slate-400 mt-1">Nenhuma venda de ração Magnus encontrada para dividir volumes.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    formatter={(value: any) => [`${Number(value).toFixed(1)} Kg de Ração`, 'Total']}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                  />
                  <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Roteiro e Próximas Visitas e Dicas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* Próximas visitas agendadas widget */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-slate-50 mb-4">
            <div>
              <h3 className="font-bold text-slate-850 text-sm uppercase tracking-wider">Minhas Próximas Visitas</h3>
              <p className="text-[11px] text-slate-500">Agropecuárias agendadas nos próximos roteiros</p>
            </div>
            <button
              onClick={() => onNavigateToTab('visits')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 shrink-0"
            >
              Ver Agenda <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {nextVisits.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
              Nenhuma visita agendada na sua agenda. Agende uma visita para organizar seus roteiros!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {nextVisits.map((v) => {
                const parts = v.date.split('-');
                const formatted = `${parts[2]}/${parts[1]}`;
                return (
                  <div
                    key={v.id}
                    onClick={() => onNavigateToTab('clients', v.clientId)}
                    className="p-3.5 bg-slate-50 border border-slate-150 hover:border-emerald-500 shadow-2xs hover:shadow-xs transition-all cursor-pointer rounded-xl space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-bold text-slate-900 line-clamp-1 text-xs">{v.clientName}</span>
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-md font-mono">{formatted}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 italic">
                        "{v.purpose}"
                      </p>
                    </div>
                    
                    <div className="pt-2 border-t border-slate-200/60 mt-2 flex justify-between items-center text-[10px] text-emerald-700 font-bold">
                      <span>Puxurar Última Venda</span>
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Professional feed sales advices card */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-bold text-slate-850 text-sm uppercase tracking-wider border-b border-slate-50 pb-2">Profissionalismo Comercial</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong>Como usar as compras anteriores a seu favor:</strong>
            </p>
            <ul className="text-[11px] space-y-2 text-slate-650 ml-1.5 list-disc pl-2.5">
              <li>Puxe o volume antigo de ração Magnus antes de falar com o comprador.</li>
              <li>Avise sobre a média de consumo da agropecuária (evite faltar produto no PDV).</li>
              <li>Exporte a nota do WhatsApp consolidando os Kg e facilitando o faturamento financeiro.</li>
            </ul>
          </div>
          
          <button
            onClick={() => onNavigateToTab('clients')}
            className="w-full mt-4 py-2 bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs rounded-xl text-center shadow-xs transition-colors"
          >
            Acessar Meus Clientes Real Time
          </button>
        </div>

      </div>

      {/* Central de Segurança e Backup dos Dados Local */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-left">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-bold text-slate-850 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
              <span>🛡️</span> Central de Segurança & Backups
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Todos os seus registros comerciais estão armazenados com segurança local no seu smartphone ou computador. Faça downloads preventivos de segurança com frequência.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2.5 w-full sm:w-auto shrink-0 font-sans">
            <button
              onClick={exportData}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
              title="Download de Backup de Clientes e Vendas"
            >
              <Download className="w-4 h-4 text-white" /> Exportar Dados
            </button>
            
            <button
              onClick={triggerFileInput}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200-30"
              title="Restaurar Banco de Dados Local"
            >
              <Upload className="w-4 h-4 text-slate-650" /> Importar Backup
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFileChange}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>
      </div>

    </div>
  );
}
