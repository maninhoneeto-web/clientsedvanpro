import React, { useState } from 'react';
import { Client, Visit, Sale } from '../types';
import { Calendar, Clock, Plus, Sliders, CheckCircle2, XCircle, Trash2, HelpCircle, ArrowRight, UserCheck, MessageSquare, AlertCircle } from 'lucide-react';

interface VisitsProps {
  clients: Client[];
  visits: Visit[];
  sales: Sale[];
  addVisit: (visit: Omit<Visit, 'id'>) => Visit;
  updateVisit: (visit: Visit) => void;
  deleteVisit: (id: string) => void;
  onNavigateToTab: (tab: 'dashboard' | 'clients' | 'sales' | 'visits', preSelectedClient?: string) => void;
  preSelectedClientId?: string;
}

export default function Visits({
  clients,
  visits,
  sales,
  addVisit,
  updateVisit,
  deleteVisit,
  onNavigateToTab,
  preSelectedClientId = ''
}: VisitsProps) {
  // Tabs: 'agenda' or 'new'
  const [activeTab, setActiveTab] = useState<'agenda' | 'new'>('agenda');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'done' | 'canceled'>('scheduled');

  // New Visit Form state
  const [selectedClientId, setSelectedClientId] = useState(preSelectedClientId);
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [visitTime, setVisitTime] = useState('09:00');
  const [visitPurpose, setVisitPurpose] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Selected visit for marking as done/logging feedback
  const [completingVisit, setCompletingVisit] = useState<Visit | null>(null);
  const [visitFeedback, setVisitFeedback] = useState('');

  // Handle visit scheduling submit
  const handleSubmitVisit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!selectedClientId) {
      setFormError('Por favor, selecione um cliente para agendar a visita.');
      return;
    }
    if (!visitPurpose.trim()) {
      setFormError('Insira o motivo ou objetivo da visita.');
      return;
    }

    const client = clients.find(c => c.id === selectedClientId);
    if (!client) {
      setFormError('Cliente inválido.');
      return;
    }

    addVisit({
      clientId: selectedClientId,
      clientName: client.name,
      date: visitDate,
      time: visitTime,
      status: 'scheduled',
      purpose: visitPurpose
    });

    // Reset fields
    setSelectedClientId('');
    setVisitPurpose('');
    setFormError(null);
    setActiveTab('agenda');
  };

  // Complete Visit (Done with feedback)
  const handleMarkVisitDone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingVisit) return;

    updateVisit({
      ...completingVisit,
      status: 'done',
      feedback: visitFeedback
    });

    setCompletingVisit(null);
    setVisitFeedback('');
  };

  // Cancel Visit
  const handleCancelVisit = (visit: Visit) => {
    updateVisit({
      ...visit,
      status: 'canceled'
    });
  };

  // Quick helper to fetch the previous sale of a client
  const getLatestSaleForClientInVisit = (clientId: string): Sale | null => {
    const clientSales = sales.filter(s => s.clientId === clientId);
    if (clientSales.length === 0) return null;
    return [...clientSales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  };

  // Filter list
  const filteredVisits = [...visits].filter(v => {
    if (statusFilter === 'all') return true;
    return v.status === statusFilter;
  }).sort((a, b) => {
    // Upcoming first, then past
    return new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Controle de Visitas & Roteiros</h2>
          <p className="text-sm text-slate-500">Agende visitas periódicas e prepare-se puxando as últimas compras antes de conversar</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('agenda')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'agenda'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Agenda de Visitas
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'new'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            + Agendar Visita
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main List / Form Area */}
        <div className="lg:col-span-2 space-y-4">
          
          {activeTab === 'new' ? (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 animate-fade-in text-left">
              <h3 className="font-bold text-slate-800 text-base mb-4">Agendar Nova Visita</h3>
              
              <form onSubmit={handleSubmitVisit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Cliente Selecionado *</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 bg-white focus:outline-hidden focus:border-emerald-500 text-sm"
                    required
                  >
                    <option value="">-- Escolha o Cliente Cadastrado --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Data Agendada *</label>
                    <input
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-hidden focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Horário Estimado</label>
                    <input
                      type="time"
                      value={visitTime}
                      onChange={(e) => setVisitTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-hidden focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Objetivo ou Notas de Preparação *</label>
                  <textarea
                    rows={3}
                    required
                    value={visitPurpose}
                    onChange={(e) => setVisitPurpose(e.target.value)}
                    placeholder="Ex: Oferecer reposição de sachês e apresentar folheto de descontos nas rações premium Magnus."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                {formError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-950 text-xs rounded-lg flex items-start gap-1.5 animate-fade-in select-none">
                    <AlertCircle className="w-4 h-4 text-red-650 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-red-900">Atenção no Preenchimento:</span>
                      <p className="text-red-700 mt-0.5">{formError}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClientId('');
                      setVisitPurpose('');
                      setActiveTab('agenda');
                    }}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold shadow-xs"
                  >
                    Confirmar Agendamento
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Agenda listing page */
            <div className="space-y-4">
              
              {/* Filter controls */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs flex justify-between items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtrar visitas:</span>
                <div className="flex gap-1.5 overflow-x-auto">
                  {(['scheduled', 'done', 'canceled'] as const).map((st) => {
                    const count = visits.filter(v => v.status === st).length;
                    const labels = {
                      scheduled: 'Agendadas',
                      done: 'Concluídas',
                      canceled: 'Canceladas'
                    };
                    return (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          statusFilter === st
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {labels[st]} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {filteredVisits.length === 0 ? (
                <div className="bg-white text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-450 text-sm">
                  Nenhuma visita cadastrada nesta categoria. Use o botão + Agendar Visita para criar!
                </div>
              ) : (
                <div className="space-y-4 text-left">
                  {filteredVisits.map((visit) => {
                    const lastSale = getLatestSaleForClientInVisit(visit.clientId);
                    // format date
                    const [year, month, day] = visit.date.split('-');
                    const formattedDate = `${day}/${month}/${year}`;

                    return (
                      <div
                        key={visit.id}
                        className="p-4 bg-white border border-slate-100 rounded-xl shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2 border-b border-slate-100 pb-3 mb-3">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-900 text-base">{visit.clientName}</span>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="flex items-center gap-1 font-semibold text-emerald-800 font-mono">
                                <Calendar className="w-3.5 h-3.5" /> {formattedDate}
                              </span>
                              {visit.time && (
                                <span className="flex items-center gap-0.5 text-slate-400 font-mono">
                                  <Clock className="w-3 h-3" /> {visit.time}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            {visit.status === 'scheduled' && (
                              <>
                                <button
                                  onClick={() => setCompletingVisit(visit)}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-[11px] font-bold flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Registrar Sucesso
                                </button>
                                <button
                                  onClick={() => handleCancelVisit(visit)}
                                  className="p-1 px-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent rounded-md"
                                  title="Cancelar compromisso"
                                >
                                  Cancelar
                                </button>
                              </>
                            )}

                            {visit.status === 'done' && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg flex items-center gap-1">
                                Visita Realizada ✔
                              </span>
                            )}

                            {visit.status === 'canceled' && (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-lg flex items-center gap-1">
                                Cancelada ✖
                              </span>
                            )}

                            <button
                              onClick={() => deleteVisit(visit.id)}
                              className="p-1 text-slate-350 hover:text-rose-600 rounded-md ml-1"
                              title="Apagar do roteiro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Objectives or Outcomes */}
                        <div className="space-y-2 mb-3 text-sm">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Missão Planejada</span>
                            <p className="text-slate-700 text-xs pl-2.5 border-l-2 border-emerald-500 font-sans">{visit.purpose}</p>
                          </div>

                          {visit.status === 'done' && visit.feedback && (
                            <div className="pt-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Resultado / Feedback</span>
                              <p className="text-slate-600 text-xs italic pl-2.5 border-l-2 border-slate-350 bg-slate-50 p-2 rounded-lg">{visit.feedback}</p>
                            </div>
                          )}
                        </div>

                        {/* Interactive: Puxar Última Venda (Satisfies core focus of sales rep on clients site) */}
                        <div className="bg-indigo-50/30 border border-indigo-100 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                          <div>
                            <span className="font-semibold text-indigo-950 block">Puxar Última Compra do Cliente</span>
                            <span className="text-[10px] text-slate-500">
                              {lastSale 
                                ? `Faturamento anterior de R$ ${lastSale.totalSale.toLocaleString('pt-BR')} em ${lastSale.date.split('-').reverse().join('/')}` 
                                : 'Cliente ainda não fez compras.'}
                            </span>
                          </div>
                          
                          {lastSale ? (
                            <button
                              onClick={() => onNavigateToTab('clients', visit.clientId)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 hover:border-indigo-350 rounded-md font-bold text-[10px] flex items-center justify-center gap-1 shrink-0 shadow-xs"
                            >
                              Puxar Detalhes <ArrowRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Nenhum faturamento</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side Info Widget */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm text-left">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3">Fluxo de Planejamento</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Ao visitar um cliente cadastrado, puxar os dados de compras antigas demonstra alto profissionalismo. Você avisa o que ele comprou na última safra ou mês e sugere a reposição das rações Magnus com base nisso!
            </p>

            <div className="space-y-3.5 text-xs">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">1</span>
                <div>
                  <h4 className="font-bold text-slate-700">Agendar Visita</h4>
                  <p className="text-slate-500 text-[11px]">Selecione uma data para o roteiro quinzenal de atendimento.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">2</span>
                <div>
                  <h4 className="font-bold text-slate-700">Puxar Compra Anterior</h4>
                  <p className="text-slate-500 text-[11px]">Antes de entrar na loja, visualize os Kg de ração do último faturamento.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">3</span>
                <div>
                  <h4 className="font-bold text-slate-700">Fechar e Enviar WhatsApp</h4>
                  <p className="text-slate-500 text-[11px]">Gere o novo pedido e mande o resumo completo via WhatsApp em 1 clique.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Modal: FeedBack log */}
      {completingVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 max-w-md w-full overflow-hidden text-left">
            <div className="p-4 border-b border-slate-150 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Finalizar Visita Realizada</h3>
              <button onClick={() => setCompletingVisit(null)} className="text-slate-400 hover:text-slate-600">
                ✖
              </button>
            </div>

            <form onSubmit={handleMarkVisitDone} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Feedback da Visita / Resultado Comercial</label>
                <textarea
                  rows={3}
                  required
                  value={visitFeedback}
                  onChange={(e) => setVisitFeedback(e.target.value)}
                  placeholder="Ex: Cliente comprou 8 sacos de ração Premium cão adulto 15kg. Re-agendar retorno para reposição daqui a 20 dias."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                {/* Flow direct to sales builder */}
                <button
                  type="button"
                  onClick={() => {
                    const clientToSale = completingVisit.clientId;
                    setCompletingVisit(null);
                    onNavigateToTab('sales', clientToSale);
                  }}
                  className="px-3 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
                >
                  Registrar Venda para Ele <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCompletingVisit(null)}
                    className="px-3.5 py-2 border border-slate-200 text-slate-600 font-medium text-xs rounded-lg"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg shadow-xs"
                  >
                    Confirmar Sucesso
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
