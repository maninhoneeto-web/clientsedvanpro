import React, { useState, useRef } from 'react';
import { Client, Sale, SaleItem, MagnusProductTemplate } from '../types';
import { MAGNUS_PRODUCTS } from '../constants';
import { Plus, Trash2, Share2, Calculator, Info, Search, HelpCircle, Check, DollarSign, Mic, Image, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

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
  const [formError, setFormError] = useState<string | null>(null);

  // AI OCR and Voice-to-Text Parsing states
  const [useAI, setUseAI] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Manage voice listening
  const handleToggleListening = () => {
    if (isListening) {
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setAiError("Seu navegador não oferece suporte nativo para reconhecimento de voz. Por favor, digite a descrição textualmente.");
        return;
      }

      setIsListening(true);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'pt-BR';

      rec.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setVoiceText((prev) => prev ? prev + ' ' + transcript : transcript);
      };

      rec.onerror = (e: any) => {
        console.error("Erro de voz:", e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessWithAI = async () => {
    if (!voiceText && !uploadedImage) return;

    setIsAnalyzing(true);
    setAiError(null);
    setAiSuccessMsg(null);

    try {
      const response = await fetch("/api/gemini/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: uploadedImage,
          text: voiceText,
          availableProducts: MAGNUS_PRODUCTS
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro desconhecido ao processar dados com Inteligência Comercial.");
      }

      const extracted = result.data;
      
      // 1. Match the client
      if (extracted.clientName) {
        const matchedClient = clients.find(c => 
          c.name.toLowerCase().includes(extracted.clientName.toLowerCase()) ||
          extracted.clientName.toLowerCase().includes(c.name.toLowerCase())
        );
        if (matchedClient) {
          setSelectedClientId(matchedClient.id);
        } else {
          setAiError(`Cliente "${extracted.clientName}" detectado, mas não encontrado no seu cadastro local. Selecione manualmente.`);
        }
      }

      // 2. Set date if found
      if (extracted.date) {
        setSaleDate(extracted.date);
      }

      // 3. Set notes if found
      if (extracted.notes) {
        setSaleNotes(extracted.notes);
      }

      // 4. Fill items
      if (extracted.items && extracted.items.length > 0) {
        const formattedItems = extracted.items.map((item: any) => {
          // Look up estimated prices in Magnus Product Templates for default cost if not set
          const template = MAGNUS_PRODUCTS.find(p => 
            p.name.toLowerCase().includes(item.productName.toLowerCase()) ||
            item.productName.toLowerCase().includes(p.name.toLowerCase())
          );

          const costPrice = item.unitCostPrice || template?.estimatedCostPrice || 0;
          const salePrice = item.unitSalePrice || template?.estimatedSalePrice || 0;

          return {
            productName: template?.name || item.productName,
            isMagnus: item.isMagnus ?? true,
            weightKg: item.weightKg || template?.weightKg || 15,
            quantity: item.quantity || 1,
            unitCostPrice: costPrice,
            unitSalePrice: salePrice
          };
        });

        setCurrentItems(formattedItems);
        setAiSuccessMsg(`Sucesso! Foram faturados e importados ${formattedItems.length} produtos para o pedido.`);
      } else {
        setAiError("A Inteligência Artificial concluiu a leitura, mas nenhum produto foi identificado.");
      }

    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Erro desconhecido de comunicação com a API do Gemini.");
    } finally {
      setIsAnalyzing(false);
    }
  };

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
    setFormError(null);
    if (!selectedClientId) {
      setFormError('Selecione um cliente cadastrado.');
      return;
    }
    if (currentItems.length === 0) {
      setFormError('Adicione pelo menos um item à venda.');
      return;
    }

    const client = clients.find(c => c.id === selectedClientId);
    if (!client) {
      setFormError('Cliente não encontrado.');
      return;
    }

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
    setFormError(null);
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

    try {
      // Use dynamic safe anchor element for maximum browser compliance inside iframes
      const safeLink = document.createElement('a');
      safeLink.href = waUrl;
      safeLink.target = '_blank';
      safeLink.rel = 'noopener noreferrer';
      document.body.appendChild(safeLink);
      safeLink.click();
      document.body.removeChild(safeLink);
    } catch (sandboxError) {
      console.warn("Bloqueio de iframe capturado para WhatsApp. Tentando método direto de fallback:", sandboxError);
      try {
        window.open(waUrl, '_blank');
      } catch (e) {
        console.error("Incapaz de abrir popup de WhatsApp no sandbox:", e);
      }
    }
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
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="font-semibold text-slate-800">Nova Venda</h3>
                  <p className="text-xs text-slate-500">Monte o carrinho com o cliente e calcule seus lucros automaticamente</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUseAI(!useAI)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    useAI 
                      ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-100 hover:bg-emerald-100'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-650" />
                  {useAI ? 'Desativar Lançamento Rápido' : 'Lançar por Print ou Voz (IA)'}
                </button>
              </div>

              {useAI && (
                <div className="p-5 bg-gradient-to-r from-purple-50/45 to-emerald-50/15 border-b border-slate-150 rounded-b-none space-y-4">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                    <h4 className="font-bold text-xs text-purple-800 uppercase tracking-wider">Lançamento Inteligente por IA</h4>
                    <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-mono font-bold">GEMINI 3.5 FLASH</span>
                  </div>
                  <p className="text-xs text-slate-650">
                    Otimize seu faturamento ao máximo! Em vez de digitar linha por linha, você pode <strong>arrastar e soltar um print</strong> do seu aplicativo Magnus, <strong>gravar seu áudio</strong> descrevendo o pedido, ou <strong>digitar o texto</strong>.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Voice / Text Prompt Box */}
                    <div className="space-y-2">
                      <label className="block text-[11px] font-semibold text-purple-900 uppercase tracking-wider">Descrever por Voz ou Texto</label>
                      <div className="relative">
                        <textarea
                          rows={4}
                          value={voiceText}
                          onChange={(e) => setVoiceText(e.target.value)}
                          placeholder="Fale ou digite, Ex: 'O cliente Agropecuária Vale Verde comprou 10 sacos de Magnus Adultos Carne 15kg e 6 de Salmão Castrados 15kg. Prazo de entrega de 3 dias e pagar em 30 d.'"
                          className="w-full pl-3 pr-10 py-2 border border-purple-100 focus:border-purple-400 focus:ring-1 focus:ring-purple-200 rounded-lg text-xs bg-white text-slate-750 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={handleToggleListening}
                          className={`absolute right-2.5 bottom-2.5 p-2 rounded-full transition-all cursor-pointer ${
                            isListening 
                              ? 'bg-rose-500 text-white animate-bounce shadow-md hover:bg-rose-600' 
                              : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          }`}
                          title={isListening ? "Parar de gravar" : "Gravar áudio da sua voz"}
                        >
                          <Mic className="w-4 h-4" />
                        </button>
                      </div>
                      {isListening && (
                        <p className="text-[10px] text-rose-500 animate-pulse flex items-center gap-1 font-medium bg-rose-50 p-1.5 rounded border border-rose-100">
                          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-ping" />
                          Gravando por voz... fale agora as quantidades, produtos e cliente! Clique no microfone para parar.
                        </p>
                      )}
                    </div>

                    {/* Image Print Box */}
                    <div className="space-y-2 select-none">
                      <label className="block text-[11px] font-semibold text-purple-900 uppercase tracking-wider">Enviar Print do App Magnus</label>
                      
                      <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-lg p-4 text-center transition-all flex flex-col justify-center items-center h-32 cursor-pointer touch-action-pan-y select-none ${
                          dragActive 
                            ? "border-purple-600 bg-purple-50" 
                            : uploadedImage 
                              ? "border-emerald-300 bg-emerald-50/10" 
                              : "border-slate-200 hover:border-purple-400 bg-white"
                        }`}
                        onClick={() => document.getElementById("ai-image-upload")?.click()}
                      >
                        <input
                          id="ai-image-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />

                        {uploadedImage ? (
                          <div className="relative w-full h-full flex items-center justify-center select-none">
                            <img 
                              src={uploadedImage} 
                              alt="Print faturamento" 
                              className="max-h-24 rounded object-contain border border-slate-100 select-none pointer-events-none" 
                              draggable="false"
                              onDragStart={(e) => e.preventDefault()}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUploadedImage(null);
                              }}
                              className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white p-1 rounded-full hover:bg-rose-600 shadow-xs z-10 cursor-pointer"
                              title="Remover imagem"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1 select-none pointer-events-none">
                            <Image className="w-6 h-6 text-slate-400 mx-auto" />
                            <p className="text-[11px] text-slate-500 font-medium">Toque para escolher Print ou arraste a imagem</p>
                            <p className="text-[9px] text-slate-400">Fotos de tela de faturamento ou comprovantes</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {aiError && (
                    <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-100 flex items-start gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Nota ou Alerta do Processamento:</p>
                        <p className="text-[11px] text-rose-700 leading-relaxed">{aiError}</p>
                      </div>
                    </div>
                  )}

                  {aiSuccessMsg && (
                    <div className="p-3 bg-emerald-50 text-emerald-950 text-xs rounded-lg border border-emerald-150 flex items-start gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-emerald-900">Sucesso no Processamento AI!</p>
                        <p className="text-[11px] text-emerald-700 leading-relaxed">{aiSuccessMsg}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    {(voiceText || uploadedImage) && (
                      <button
                        type="button"
                        onClick={() => {
                          setVoiceText('');
                          setUploadedImage(null);
                          setAiError(null);
                          setAiSuccessMsg(null);
                        }}
                        className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Limpar Dados
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleProcessWithAI}
                      disabled={isAnalyzing || (!voiceText && !uploadedImage)}
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Lendo com IA Inteligente...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-purple-100" />
                          <span>Processar e Lançar Venda</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

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
                    <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white">
                      <table className="w-full min-w-[620px] text-left border-collapse text-xs">
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

                {formError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-950 text-xs rounded-lg flex items-start gap-1.5 animate-fade-in select-none">
                    <AlertCircle className="w-4 h-4 text-red-650 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-red-900">Atenção no Preenchimento:</span>
                      <p className="text-red-700 mt-0.5">{formError}</p>
                    </div>
                  </div>
                )}

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
