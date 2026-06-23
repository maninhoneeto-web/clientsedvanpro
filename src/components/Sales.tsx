import React, { useState } from 'react';
import { Client, Sale, SaleItem, MagnusProductTemplate } from '../types';
import { MAGNUS_PRODUCTS } from '../constants';
import { Plus, Trash2, Share2, Calculator, Info, Search, HelpCircle, Check, DollarSign } from 'lucide-react';

interface SalesProps {
  clients: Client[];
  sales: Sale[];
  addSale: (sale: Omit<Sale, 'id'>) => Sale;
  deleteSale: (id: string) => void;
  onSelectClient?: (clientId: string) => void;
  preSelectedClientId?: string;
}

export default function Sales({
  clients,
  sales,
  addSale,
  deleteSale,
  onSelectClient,
  preSelectedClientId = ''
}: SalesProps) {
  // Tabs: 'list' or 'new'
  const [activeTab, setActiveTab] = useState<'list' | 'new'>('list');

  // Search/Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClientId, setFilterClientId] = useState('');

  // New Sale Form state
  const [selectedClientId, setSelectedClientId] = useState(preSelectedClientId);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleNotes, setSaleNotes] = useState('');
  const [currentItems, setCurrentItems] = useState<Omit<SaleItem, 'id'>[]>([]);

  // Item builder state
  const [productSearch, setProductSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MagnusProductTemplate | null>(null);
  const [customItemName, setCustomItemName] = useState('');
  const [customIsMagnus, setCustomIsMagnus] = useState(true);
  const [customWeight, setCustomWeight] = useState(15);
  const [customQuantity, setCustomQuantity] = useState(1);
  const [customCostPrice, setCustomCostPrice] = useState(0);
  const [customSalePrice, setCustomSalePrice] = useState(0);

  // Dynamic Calculator Tool state (Independent widget on the page)
  const [calcCost, setCalcCost] = useState<number>(100);
  const [calcMargin, setCalcMargin] = useState<number>(30); // in percent
  const [calcSale, setCalcSale] = useState<number>(130);
  const [calcMode, setCalcMode] = useState<'percentage' | 'sale_price'>('percentage'); // target to calculate

  // Derived calculations for the dynamic calculator widget
  const getCalcResults = () => {
    if (calcMode === 'percentage') {
      // Input: Cost & Margin % -> Output: Sale Price & profit
      const salePriceValue = calcCost * (1 + calcMargin / 100);
      const profitValue = salePriceValue - calcCost;
      return {
        salePrice: salePriceValue,
        profit: profitValue,
        percentage: calcMargin,
        markup: calcMargin
      };
    } else {
      // Input: Cost & Sale Price -> Output: Profit % & margin
      const profitValue = calcSale - calcCost;
      const marginPercentValue = calcSale > 0 ? (profitValue / calcSale) * 100 : 0;
      const markupPercentValue = calcCost > 0 ? (profitValue / calcCost) * 100 : 0;
      return {
        salePrice: calcSale,
        profit: profitValue,
        percentage: marginPercentValue,
        markup: markupPercentValue
      };
    }
  };

  const calcResult = getCalcResults();

  // Handle template selection
  const handleSelectProductTemplate = (product: MagnusProductTemplate) => {
    setSelectedTemplate(product);
    setCustomItemName(product.name);
    setCustomIsMagnus(true);
    setCustomWeight(product.weightKg);
    setCustomCostPrice(product.estimatedCostPrice);
    setCustomSalePrice(product.estimatedSalePrice);
  };

  // Add item to temporary cart
  const handleAddItemToSale = () => {
    const name = selectedTemplate ? selectedTemplate.name : customItemName;
    if (!name.trim()) return;
    if (customQuantity <= 0) return;

    const newItem: Omit<SaleItem, 'id'> = {
      productName: name,
      isMagnus: customIsMagnus,
      weightKg: Number(customWeight),
      quantity: Number(customQuantity),
      unitCostPrice: Number(customCostPrice),
      unitSalePrice: Number(customSalePrice)
    };

    setCurrentItems([...currentItems, newItem]);

    // Reset item input
    setSelectedTemplate(null);
    setCustomItemName('');
    setCustomQuantity(1);
    setCustomCostPrice(0);
    setCustomSalePrice(0);
  };

  const handleRemoveItem = (index: number) => {
    setCurrentItems(currentItems.filter((_, i) => i !== index));
  };

  // Calculate cart totals
  const totalCost = currentItems.reduce((acc, item) => acc + (item.unitCostPrice * item.quantity), 0);
  const totalSale = currentItems.reduce((acc, item) => acc + (item.unitSalePrice * item.quantity), 0);
  const totalWeight = currentItems.reduce((acc, item) => acc + (item.weightKg * item.quantity), 0);
  const totalProfit = totalSale - totalCost;
  const totalProfitPercentage = totalSale > 0 ? (totalProfit / totalSale) * 100 : 0;

  // Submit Sale
  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return alert('Selecione um cliente cadastrado.');
    if (currentItems.length === 0) return alert('Adicione pelo menos um item à venda.');

    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return alert('Cliente não encontrado.');

    const finalizedItems: SaleItem[] = currentItems.map((item, idx) => ({
      ...item,
      id: `item_${Date.now()}_${idx}`
    }));

    addSale({
      clientId: selectedClientId,
      clientName: client.name,
      date: saleDate,
      items: finalizedItems,
      totalCost,
      totalSale,
      profit: totalProfit,
      notes: saleNotes,
      profitPercentage: Number(totalProfitPercentage.toFixed(2))
    });

    // Reset Form
    setSelectedClientId('');
    setSaleNotes('');
    setCurrentItems([]);
    setActiveTab('list');
  };

  // Format and send details via Whatsapp
  const handleShareOnWhatsApp = (sale: Sale) => {
    const client = clients.find(c => c.id === sale.clientId);
    const clientPhone = client?.phone || '';

    let itemsText = '';
    let totalKgMagnus = 0;
    
    sale.items.forEach(item => {
      itemsText += `• ${item.quantity}x ${item.productName} ${item.weightKg}kg (Total: ${item.quantity * item.weightKg} Kg) - R$ ${(item.unitSalePrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      if (item.isMagnus) {
        totalKgMagnus += (item.weightKg * item.quantity);
      }
    });

    const parsedDate = sale.date.split('-').reverse().join('/');

    const message = `*ClientsProEdvan - Pedido/Comprovante Magnus*\n\n` +
      `Olá, *${sale.clientName}* (${client?.owner || 'Representante'})!\n` +
      `Seguem os dados do pedido realizado em *${parsedDate}*:\n\n` +
      `${itemsText}\n` +
      `⚖️ *Total Magnus comprado:* ${totalKgMagnus} Kg\n` +
      `💰 *Valor Total do Pedido:* R$ ${sale.totalSale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n` +
      `_Obrigado pela preferência e parceria!_\n` +
      `_ClientsProEdvan - Faturamento e Visitas de Ração_`;

    const encodedText = encodeURIComponent(message);
    const formattedPhone = clientPhone.replace(/\D/g, ''); // strip non-numeric
    const waUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`;

    window.open(waUrl, '_blank');
  };

  // Filter Sales list
  const filteredSales = sales.filter(s => {
    const matchSearch = s.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (s.notes && s.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchClient = filterClientId ? s.clientId === filterClientId : true;
    return matchSearch && matchClient;
  });

  return (
    <div className="space-y-6">
      {/* Tab Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Controle de Vendas & Faturamento</h2>
          <p className="text-sm text-slate-500">Registre os pedidos das rações Magnus e controle suas comissões/lucros</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'list'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Histórico de Vendas
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'new'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            + Registrar Pedido
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main interactive area */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'new' ? (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-semibold text-slate-800">Nova Venda</h3>
                <p className="text-xs text-slate-500">Monte o carrinho com o cliente e calcule seus lucros automaticamente</p>
              </div>

              <form onSubmit={handleSubmitSale} className="p-5 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Client */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Cliente *</label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 bg-white focus:outline-hidden focus:border-emerald-500 text-sm"
                      required
                    >
                      <option value="">-- Selecione o Cliente --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
                      ))}
                    </select>
                  </div>

                  {/* Sale Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Data do Pedido *</label>
                    <input
                      type="date"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-emerald-500 text-sm"
                      required
                    />
                  </div>
                </div>

                {/* Sub-form: Item Adder */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200/60">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <h4 className="font-semibold text-xs text-slate-700 uppercase tracking-wider">Adicionar Produto Magnus no Pedido</h4>
                  </div>

                  {/* Fast Magnus Selector */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Rações Magnus disponíveis para seleção rápida</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1 border border-slate-200 rounded-lg p-2 bg-white">
                        {MAGNUS_PRODUCTS.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectProductTemplate(p)}
                            className={`p-2 text-left rounded-md text-xs border transition-all ${
                              selectedTemplate?.name === p.name && selectedTemplate?.weightKg === p.weightKg
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-medium'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span className="block font-medium truncate">{p.name}</span>
                            <span className="text-[10px] text-slate-500">{p.weightKg} Kg • Sug.: R$ {p.estimatedSalePrice.toFixed(2)}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="font-semibold text-slate-400 text-center text-xs my-1">— Ou digite as informações do produto —</div>

                    {/* Custom or Selected Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600">Descrição do Produto</label>
                        <input
                          type="text"
                          value={customItemName}
                          onChange={(e) => {
                            setCustomItemName(e.target.value);
                            setSelectedTemplate(null);
                          }}
                          placeholder="Ex: Magnus Premium Cães Ativos"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600">Peso (Kg)</label>
                          <input
                            type="number"
                            step="any"
                            value={customWeight}
                            onChange={(e) => setCustomWeight(Number(e.target.value))}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600">Qtd (Sacos)</label>
                          <input
                            type="number"
                            value={customQuantity}
                            onChange={(e) => setCustomQuantity(Number(e.target.value))}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs"
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className="text-[10px] text-slate-500 flex items-center gap-1 mb-1">
                            <input
                              type="checkbox"
                              checked={customIsMagnus}
                              onChange={(e) => setCustomIsMagnus(e.target.checked)}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            Magnus?
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600">Preço de Custo Unitário (R$)</label>
                        <input
                          type="number"
                          step="any"
                          value={customCostPrice}
                          onChange={(e) => setCustomCostPrice(Number(e.target.value))}
                          placeholder="Preço que você paga comercialmente"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600">Preço de Fechamento de Venda (R$)</label>
                        <input
                          type="number"
                          step="any"
                          value={customSalePrice}
                          onChange={(e) => setCustomSalePrice(Number(e.target.value))}
                          placeholder="Preço faturado ao cliente"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs"
                        />
                        {customCostPrice > 0 && customSalePrice > 0 && (
                          <span className="text-[10px] text-emerald-600 font-medium block mt-1">
                            Lucro Unitário: R$ {(customSalePrice - customCostPrice).toFixed(2)} (Margem: {(((customSalePrice - customCostPrice) / customSalePrice) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleAddItemToSale}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white hover:bg-slate-900 rounded-md text-xs font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar ao Pedido
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cart Preview Table */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-xs text-slate-600 uppercase tracking-wider">Itens do Pedido</h4>
                  {currentItems.length === 0 ? (
                    <div className="text-center p-6 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                      Nenhum produto adicionado ao pedido ainda. Use o painel acima para adicionar.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider">
                            <th className="p-3">Produto</th>
                            <th className="p-3 text-center">Peso</th>
                            <th className="p-3 text-center">Quant.</th>
                            <th className="p-3 text-right">Custo Unit.</th>
                            <th className="p-3 text-right">Venda Unit.</th>
                            <th className="p-3 text-right">Total Item</th>
                            <th className="p-3 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {currentItems.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50">
                              <td className="p-3">
                                <span className="font-medium text-slate-900 block">{item.productName}</span>
                                {item.isMagnus ? (
                                  <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 text-[9px] font-semibold rounded mt-0.5 inline-block">Magnus ✔</span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 mt-0.5 inline-block">Outra marca</span>
                                )}
                              </td>
                              <td className="p-3 text-center font-mono">{item.weightKg} Kg</td>
                              <td className="p-3 text-center font-mono font-medium">{item.quantity} cx</td>
                              <td className="p-3 text-right font-mono text-slate-500">R$ {item.unitCostPrice.toFixed(2)}</td>
                              <td className="p-3 text-right font-mono text-slate-800">R$ {item.unitSalePrice.toFixed(2)}</td>
                              <td className="p-3 text-right font-mono font-medium text-slate-900">
                                R$ {(item.unitSalePrice * item.quantity).toFixed(2)}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(index)}
                                  className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-emerald-50/70 border-t border-slate-200 font-semibold text-slate-900 text-xs text-right">
                          <tr>
                            <td colSpan={2} className="p-3 text-left font-bold text-emerald-800">Totais do Carrinho</td>
                            <td className="p-3 text-center font-mono">{currentItems.reduce((acc, i) => acc + i.quantity, 0)} sacos</td>
                            <td colSpan={2} className="p-3 text-[11px] text-slate-500">
                              Peso Total: {totalWeight.toFixed(1)} Kg
                            </td>
                            <td className="p-3 font-mono text-emerald-950 font-bold">R$ {totalSale.toFixed(2)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {/* Profit Breakdown of current build */}
                {currentItems.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Custo de Compra (COGS)</span>
                      <span className="text-sm font-semibold text-slate-800 font-mono">R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Faturamento Líquido</span>
                      <span className="text-sm font-semibold text-emerald-900 font-mono">R$ {totalSale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Lucro Estimado (%)</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-bold text-emerald-700 font-mono">R$ {totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span className="text-xs font-semibold text-emerald-600 font-mono">({totalProfitPercentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes/Obs */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Anotações / Observações do Pedido</label>
                  <textarea
                    rows={2}
                    value={saleNotes}
                    onChange={(e) => setSaleNotes(e.target.value)}
                    placeholder="Ex: Pagamento faturado para 30 dias no boleto, entrega na próxima quinta."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-emerald-500 text-sm"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentItems([]);
                      setSelectedClientId('');
                      setActiveTab('list');
                    }}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={currentItems.length === 0}
                    className="px-5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-semibold shadow-xs flex items-center gap-1.5"
                  >
                    Confirmar Pedido Faturado
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* History & Search list */
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                {/* Text Search */}
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar faturamento por cliente..."
                    className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-750 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                {/* Client filter */}
                <select
                  value={filterClientId}
                  onChange={(e) => setFilterClientId(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-700"
                >
                  <option value="">Todos os Clientes</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {filteredSales.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                  Nenhuma venda correspondente encontrada. Adicione uma nova venda!
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSales.map((sale) => {
                    const parsedDate = sale.date.split('-').reverse().join('/');
                    const totalKg = sale.items.reduce((acc, item) => acc + (item.weightKg * item.quantity), 0);
                    return (
                      <div
                        key={sale.id}
                        className="border border-slate-100 rounded-xl hover:border-slate-350 transition-all shadow-xs p-4 bg-white relative group"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3 mb-3">
                          <div>
                            <span className="font-semibold text-slate-900 block">{sale.clientName}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-400 font-medium font-mono">{parsedDate}</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                              <span className="text-[11px] text-slate-500 font-mono">Faturamento ID: {sale.id}</span>
                            </div>
                          </div>
                          
                          {/* Quick buttons */}
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <button
                              onClick={() => handleShareOnWhatsApp(sale)}
                              className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                              title="Enviar relatório de compras por Whatsapp"
                            >
                              <Share2 className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                            </button>
                            <button
                              onClick={() => deleteSale(sale.id)}
                              className="p-1 px-2 border border-rose-100 hover:border-rose-200 hover:bg-rose-50 text-rose-600 hover:text-rose-800 rounded-lg text-xs font-medium transition-colors"
                              title="Deletar faturamento"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>

                        {/* Order Detail Lines */}
                        <div className="space-y-1.5 pl-2 border-l-2 border-emerald-500 mb-3">
                          {sale.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-slate-600 font-medium font-sans">
                                {it.quantity}x {it.productName} ({it.weightKg} Kg)
                              </span>
                              <span className="text-slate-500 font-mono">
                                R$ {(it.unitSalePrice * it.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Finance breakdown stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2 text-slate-700 rounded-lg text-xs font-medium font-mono">
                          <div>
                            <span className="block text-[10px] text-slate-500 uppercase font-sans">Volume Total</span>
                            <span>{totalKg.toFixed(1)} Kg</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-500 uppercase font-sans">Total Venda</span>
                            <span className="font-semibold text-slate-900">R$ {sale.totalSale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-500 uppercase font-sans">Custo Geral</span>
                            <span className="text-slate-500">R$ {sale.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-500 uppercase font-sans">Seu Lucro</span>
                            <span className="text-emerald-700 font-bold block">
                              R$ {sale.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({sale.profitPercentage}%)
                            </span>
                          </div>
                        </div>

                        {sale.notes && (
                          <div className="mt-3 text-slate-500 italic text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-100">
                            <strong>Observações:</strong> {sale.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Profit Margin Calculator (Interactive Widget) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-800">
              <Calculator className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Simulador de Lucro & Margem</h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Use esta ferramenta rápida para planejar quanto cobrar do cliente dependendo do seu custo e do percentual que deseja colocar em cima dos produtos!
            </p>

            {/* Toggle calculation target */}
            <div className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setCalcMode('percentage')}
                className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
                  calcMode === 'percentage'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Custo + Margem %
              </button>
              <button
                type="button"
                onClick={() => setCalcMode('sale_price')}
                className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
                  calcMode === 'sale_price'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Custo + Preço de Venda
              </button>
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">Preço de Custo (R$)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-slate-400 font-mono">R$</span>
                  <input
                    type="number"
                    step="any"
                    value={calcCost}
                    onChange={(e) => setCalcCost(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {calcMode === 'percentage' ? (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">Margem Alvo (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={calcMargin}
                      onChange={(e) => setCalcMargin(Number(e.target.value))}
                      className="w-full pr-8 pl-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-xs text-slate-400 font-semibold">%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={calcMargin}
                    onChange={(e) => setCalcMargin(Number(e.target.value))}
                    className="w-full accent-emerald-600 mt-2 cursor-pointer"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">Preço de Venda Estimado (R$)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-slate-400 font-mono">R$</span>
                    <input
                      type="number"
                      step="any"
                      value={calcSale}
                      onChange={(e) => setCalcSale(Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <input
                    type="range"
                    min={Math.ceil(calcCost)}
                    max={Math.ceil(calcCost * 2.5)}
                    value={calcSale}
                    onChange={(e) => setCalcSale(Number(e.target.value))}
                    className="w-full accent-emerald-600 mt-2 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Simulated Output Dashboard */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-150 rounded-xl space-y-3 font-mono text-xs">
              <div className="flex justify-between pb-2 border-b border-emerald-100">
                <span className="text-slate-600 font-sans font-medium">Preço Proposto:</span>
                <span className="font-bold text-slate-900 col-span-2">R$ {calcResult.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-emerald-100">
                <span className="text-slate-600 font-sans font-medium">Margem Comercial:</span>
                <span className="font-bold text-emerald-700">{calcResult.percentage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-emerald-100">
                <span className="text-slate-600 font-sans font-medium">Markup sobre custo:</span>
                <span className="font-bold text-slate-700">{calcResult.markup.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-700 font-sans font-semibold">Lucro Real Líquido:</span>
                <span className="font-bold text-emerald-800 text-sm">R$ {calcResult.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 flex items-start gap-1 p-1">
              <Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
              <span>Margem calculada como: Margem de Lucro = ((Preço Venda - Custo) / Preço Venda) * 100. Essencial para analisar o lucro faturado real.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
