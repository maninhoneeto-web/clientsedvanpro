import React, { useState } from 'react';
import { Client, Sale, Visit } from '../types';
import { 
  Plus, Search, MapPin, User, MessageSquare, History, 
  Calendar, ShoppingBag, Trash2, Edit2, ChevronRight, X, PhoneCall, TrendingUp, Share2, AlertCircle
} from 'lucide-react';

interface ClientsProps {
  clients: Client[];
  sales: Sale[];
  visits: Visit[];
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Client;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => void;
  onNavigateToTab: (tab: 'dashboard' | 'clients' | 'sales' | 'visits', preSelectedClient?: string) => void;
}

export default function Clients({
  clients,
  sales,
  visits,
  addClient,
  updateClient,
  deleteClient,
  onNavigateToTab
}: ClientsProps) {
  // UI states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  
  // Search state
  const [searchText, setSearchText] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // Form states
  const [clientName, setClientName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');

  // Open Add modal
  const openAddModal = () => {
    setClientName('');
    setOwnerName('');
    setPhone('');
    setCity('');
    setFormError(null);
    setEditingClient(null);
    setShowAddModal(true);
  };

  // Open Edit modal
  const openEditModal = (client: Client) => {
    setClientName(client.name);
    setOwnerName(client.owner);
    setPhone(client.phone);
    setCity(client.city);
    setFormError(null);
    setEditingClient(client);
    setShowAddModal(true);
  };

  // Submit client (add or edit)
  const handleSubmitClient = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!clientName.trim() || !city.trim()) {
      setFormError('Preencha os campos obrigatórios (Nome e Cidade)');
      return;
    }

    // clean digits or normalize phone if users add custom spacing
    let formattedPhone = phone.trim();
    if (formattedPhone && !formattedPhone.startsWith('55') && formattedPhone.length >= 10) {
      formattedPhone = '55' + formattedPhone.replace(/\D/g, '');
    }

    if (editingClient) {
      updateClient({
        ...editingClient,
        name: clientName,
        owner: ownerName,
        phone: formattedPhone,
        city
      });
    } else {
      addClient({
        name: clientName,
        owner: ownerName,
        phone: formattedPhone,
        city
      });
    }

    setShowAddModal(false);
    setClientName('');
    setOwnerName('');
    setPhone('');
    setCity('');
    setFormError(null);
    setEditingClient(null);
  };

  // Search filter
  const uniqueCities = Array.from(new Set(clients.map(c => c.city))).filter(Boolean);

  const filteredClients = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchText.toLowerCase()) || 
                        c.owner.toLowerCase().includes(searchText.toLowerCase()) ||
                        c.city.toLowerCase().includes(searchText.toLowerCase());
    const matchCity = selectedCity ? c.city === selectedCity : true;
    return matchSearch && matchCity;
  });

  // Calculate client metric helpers
  const getClientMetrics = (clientId: string) => {
    const clientSales = sales.filter(s => s.clientId === clientId);
    const sortedSales = [...clientSales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestSale = sortedSales[0] || null;

    let totalWeightKg = 0;
    let totalPurchasedValue = 0;
    let magnusBagsCount = 0;

    clientSales.forEach(s => {
      totalPurchasedValue += s.totalSale;
      s.items.forEach(it => {
        totalWeightKg += (it.weightKg * it.quantity);
        if (it.isMagnus) {
          magnusBagsCount += it.quantity;
        }
      });
    });

    const pendingVisitsCount = visits.filter(v => v.clientId === clientId && v.status === 'scheduled').length;

    return {
      salesCount: clientSales.length,
      latestSale,
      totalWeightKg,
      totalPurchasedValue,
      magnusBagsCount,
      pendingVisitsCount,
      allSales: sortedSales
    };
  };

  // Fast WhatsApp link sender helper
  const handleLaunchWhatsAppChat = (client: Client, messageText = '') => {
    const sanitized = client.phone.trim().replace(/\D/g, '');
    if (!sanitized) {
      setWhatsappError(`Número do WhatsApp não cadastrado ou inválido para o cliente ${client.name}.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const textParam = messageText ? `&text=${encodeURIComponent(messageText)}` : '';
    window.open(`https://api.whatsapp.com/send?phone=${sanitized}${textParam}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Meus Clientes Cadastrados</h2>
          <p className="text-sm text-slate-500">Cadastre agropecuárias e acompanhe o histórico de compras de imediato</p>
        </div>
        <button
          onClick={openAddModal}
          className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" /> Cadastrar Cliente
        </button>
      </div>

      {whatsappError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-950 text-xs rounded-lg flex items-center justify-between gap-1.5 animate-fade-in select-none">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-650 shrink-0" />
            <span>{whatsappError}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setWhatsappError(null)} 
            className="text-rose-500 hover:text-rose-700 font-bold px-2 py-0.5 rounded-lg text-xs"
          >
            Fecar
          </button>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Client Listing & Filters */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar por agropecuária, dono ou cidade..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-750 focus:outline-hidden focus:border-emerald-500 focus:bg-white"
              />
            </div>
            
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="">Todas as Cidades</option>
              {uniqueCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {filteredClients.length === 0 ? (
            <div className="bg-white text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-400">
              Nenhum cliente cadastrado correspondente encontrado. Cadastre um novo acima!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredClients.map((client) => {
                const metrics = getClientMetrics(client.id);
                return (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`p-4 bg-white rounded-xl border cursor-pointer hover:shadow-md hover:border-emerald-500 transition-all text-left flex flex-col justify-between ${
                      selectedClient?.id === client.id ? 'border-2 border-emerald-500 ring-1 ring-emerald-500/20' : 'border-slate-100'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-slate-900 line-clamp-1 text-base">{client.name}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>
                      
                      {/* Owner and location */}
                      <div className="mt-1.5 space-y-1 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5 font-medium">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{client.owner || 'Dono não cadastrado'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{client.city}</span>
                        </div>
                      </div>

                      {/* Small Quick-Badge metrics */}
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-md">
                          {metrics.salesCount} {metrics.salesCount === 1 ? 'pedido' : 'pedidos'}
                        </span>
                        {metrics.totalWeightKg > 0 && (
                          <span className="px-2 py-0.5 bg-orange-50 text-orange-850 text-[10px] font-semibold rounded-md flex items-center gap-1">
                            ⚖️ {metrics.totalWeightKg.toFixed(0)} Kg Magnus
                          </span>
                        )}
                        {metrics.pendingVisitsCount > 0 && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-md animate-pulse">
                            📅 Visita Agendada
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer last purchase date info */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
                      <span>Último faturamento:</span>
                      <span className="font-semibold text-slate-700">
                        {metrics.latestSale 
                          ? metrics.latestSale.date.split('-').reverse().join('/')
                          : 'Nunca comprou'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Detailed Dashboard / Puxador de últimas compras */}
        <div className="lg:col-span-1">
          {selectedClient ? (
            (() => {
              const metrics = getClientMetrics(selectedClient.id);
              return (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden text-left animate-fade-in sticky top-6">
                  {/* Client Details Header */}
                  <div className="p-5 border-b border-slate-100 bg-slate-50/60 relative">
                    <button 
                      onClick={() => setSelectedClient(null)} 
                      className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    <h3 className="font-bold text-lg text-slate-800 leading-tight pr-5">{selectedClient.name}</h3>
                    <p className="text-xs font-semibold text-emerald-700 mt-0.5">{selectedClient.city}</p>
                    
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase">Contato/Dono</span>
                        <span className="font-medium text-slate-800">{selectedClient.owner || 'Não informado'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase">WhatsApp</span>
                        <span className="font-mono text-slate-800 font-medium">{selectedClient.phone || 'S/ telefone'}</span>
                      </div>
                    </div>

                    {/* Quick call/whatsapp buttons */}
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleLaunchWhatsAppChat(selectedClient, `Olá ${selectedClient.owner || 'parceiro'}! Sou o Edvan representatante Magnus.`)}
                        className="flex-1 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Chamar WhatsApp
                      </button>
                      <button
                        onClick={() => openEditModal(selectedClient)}
                        className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center justify-center"
                        title="Modificar dados"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Tem certeza que deseja deletar este cliente e todo seu histórico de visitas e vendas?')) {
                            deleteClient(selectedClient.id);
                            setSelectedClient(null);
                          }
                        }}
                        className="px-3 py-1.5 border border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg text-xs font-semibold flex items-center justify-center"
                        title="Remover cliente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Summary aggregate metrics */}
                  <div className="p-4 bg-emerald-50/30 border-b border-slate-100 grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-450 block font-medium">Histórico Total Comprado</span>
                      <span className="text-sm font-bold text-slate-800 font-mono">秤 {metrics.totalWeightKg.toFixed(1)} Kg</span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">Ração Magnus</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-450 block font-medium">Faturamento Total do Produtor</span>
                      <span className="text-sm font-bold text-emerald-800 font-mono">R$ {metrics.totalPurchasedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <span className="text-[9px] text-slate-550 block mt-0.5">({metrics.salesCount} compras)</span>
                    </div>
                  </div>

                  {/* Interactive: PUXAR ÚLTIMA VENDA (The core requirement requested by user) */}
                  <div className="p-5 border-b border-indigo-100 bg-indigo-50/20">
                    <div className="flex items-center gap-1.5 text-slate-800 mb-3">
                      <ShoppingBag className="w-4 h-4 text-indigo-600" />
                      <h4 className="font-bold text-xs uppercase tracking-wider">Última Venda Deste Cliente</h4>
                    </div>

                    {metrics.latestSale ? (
                      <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-xs space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-indigo-950 font-mono">
                            Compra em: {metrics.latestSale.date.split('-').reverse().join('/')}
                          </span>
                          <span className="font-bold text-emerald-800 font-mono">
                            R$ {metrics.latestSale.totalSale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Items listed */}
                        <div className="space-y-1 text-xs border-t border-b border-indigo-50 py-2">
                          {metrics.latestSale.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between font-mono text-[11px] text-slate-600">
                              <span>{it.quantity}x {it.productName} ({it.weightKg}kg)</span>
                              <span>R$ {(it.unitSalePrice * it.quantity).toFixed(0)}</span>
                            </div>
                          ))}
                        </div>

                        {metrics.latestSale.notes && (
                          <p className="text-[10px] italic text-slate-500 line-clamp-2">
                            Obs: "{metrics.latestSale.notes}"
                          </p>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => metrics.latestSale && handleShareOnWhatsApp(selectedClient, metrics.latestSale)}
                            className="flex-1 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                          >
                            <Share2 className="w-3 h-3" /> Re-enviar Comprovante
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-400">
                        Nenhuma venda cadastrada para este cliente ainda. Comece do zero!
                      </div>
                    )}
                  </div>

                  {/* Quick Flow Actions */}
                  <div className="p-5 space-y-3">
                    <h4 className="font-semibold text-xs text-slate-500 uppercase tracking-wider">Ações de Fluxo de Compra</h4>
                    
                    <button
                      onClick={() => onNavigateToTab('sales', selectedClient.id)}
                      className="w-full py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Registrar Novo Pedido para Ele
                    </button>

                    <button
                      onClick={() => onNavigateToTab('visits', selectedClient.id)}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5 text-slate-500" /> Agendar Nova Visita de Retorno
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 p-8 rounded-xl text-center text-slate-400 text-sm h-72 flex flex-col items-center justify-center">
              <User className="w-10 h-10 text-slate-300 stroke-1 mb-2" />
              <p className="font-semibold">Nenhum Cliente Selecionado</p>
              <p className="text-xs text-slate-500 px-6 mt-1">Selecione um cliente ao lado para puxar automaticamente a sua última venda, histórico comercial e fluxo de comissionamento.</p>
            </div>
          )}
        </div>

      </div>

      {/* Modal: Add/Edit Client */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 max-w-md w-full overflow-hidden text-left">
            <div className="p-5 border-b border-slate-150 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">
                {editingClient ? 'Modificar Cadastro' : 'Cadastrar Agropecuária'}
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitClient} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Nome do Estabelecimento / Agropecuária *</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Agropecuária Nova Esperança"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Nome do Dono / Contato Principal</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Ex: Sr. Francisco de Oliveira"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Cidade (Região de Atendimento) *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: Sorocaba - SP"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">WhatsApp / Telefone de Contato</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="DDD + Número (Ex: 11991234567)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-hidden focus:border-emerald-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">Coloque apenas números com DDD. Será usado para enviar os comprovantes das rações vendidas.</p>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-950 text-xs rounded-lg flex items-start gap-1.5 animate-fade-in select-none">
                  <AlertCircle className="w-4 h-4 text-rose-650 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-rose-900 font-sans">Atenção no Preenchimento:</span>
                    <p className="text-rose-700 font-sans mt-0.5">{formError}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  {editingClient ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Global text generator for last purchase shared directly
const handleShareOnWhatsApp = (client: Client, sale: Sale) => {
  let itemsText = '';
  let totalKgMagnus = 0;
  
  sale.items.forEach(item => {
    itemsText += `• ${item.quantity}x ${item.productName} ${item.weightKg}kg (Total: ${item.quantity * item.weightKg} Kg) - R$ ${(item.unitSalePrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    if (item.isMagnus) {
      totalKgMagnus += (item.weightKg * item.quantity);
    }
  });

  const parsedDate = sale.date.split('-').reverse().join('/');

  const message = `*ClientsProEdvan - Detalhes da Compra Anterior*\n\n` +
    `Olá, *${sale.clientName}* (${client?.owner || 'Representante'})!\n` +
    `Re-enviamos os dados do pedido realizado em *${parsedDate}*:\n\n` +
    `${itemsText}\n` +
    `⚖️ *Total Magnus comprado:* ${totalKgMagnus} Kg\n` +
    `💰 *Valor Total do Pedido:* R$ ${sale.totalSale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n` +
    `_Qualquer dúvida estou à disposição!_\n` +
    `_ClientsProEdvan_`;

  const encodedText = encodeURIComponent(message);
  const formattedPhone = client.phone.replace(/\D/g, '');
  const waUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`;

  window.open(waUrl, '_blank');
};
