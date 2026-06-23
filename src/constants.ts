import { MagnusProductTemplate, Client, Sale, Visit } from './types';

export const MAGNUS_PRODUCTS: MagnusProductTemplate[] = [
  {
    name: "Magnus Premium Cães Adultos Carne",
    weightKg: 15,
    category: "Cães",
    estimatedCostPrice: 85.00,
    estimatedSalePrice: 119.90
  },
  {
    name: "Magnus Premium Cães Adultos Carne",
    weightKg: 25,
    category: "Cães",
    estimatedCostPrice: 125.00,
    estimatedSalePrice: 179.90
  },
  {
    name: "Magnus Premium Cães Filhotes Frango",
    weightKg: 15,
    category: "Cães",
    estimatedCostPrice: 90.00,
    estimatedSalePrice: 129.90
  },
  {
    name: "Magnus Special Cães Adultos Mix",
    weightKg: 15,
    category: "Cães",
    estimatedCostPrice: 75.00,
    estimatedSalePrice: 104.90
  },
  {
    name: "Magnus Special Cães Adultos Ativo",
    weightKg: 20,
    category: "Cães",
    estimatedCostPrice: 95.00,
    estimatedSalePrice: 139.90
  },
  {
    name: "Magnus Super Premium Cães Adultos Raças Pequenas",
    weightKg: 10.1,
    category: "Cães",
    estimatedCostPrice: 110.00,
    estimatedSalePrice: 159.90
  },
  {
    name: "Magnus Super Premium Cães Adultos Frango e Arroz",
    weightKg: 15,
    category: "Cães",
    estimatedCostPrice: 140.00,
    estimatedSalePrice: 199.90
  },
  {
    name: "Magnus Cat Premium Gatos Adultos Mix",
    weightKg: 10.1,
    category: "Gatos",
    estimatedCostPrice: 80.00,
    estimatedSalePrice: 114.90
  },
  {
    name: "Magnus Cat Premium Gatos Castrados Salmão",
    weightKg: 15,
    category: "Gatos",
    estimatedCostPrice: 115.00,
    estimatedSalePrice: 169.90
  }
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: "cli_1",
    name: "Agropecuária Vale Verde",
    owner: "Sr. Marcos Silva",
    phone: "5515998765432",
    city: "Sorocaba - SP",
    createdAt: "2026-05-10"
  },
  {
    id: "cli_2",
    name: "AgroPet Casa de Rações Itu",
    owner: "Sra. Sandra Costa",
    phone: "5511991234567",
    city: "Itu - SP",
    createdAt: "2026-05-15"
  },
  {
    id: "cli_3",
    name: "NutriCampo Insumos Agrícolas",
    owner: "Sr. Roberto Alencar",
    phone: "5515981122334",
    city: "Tatuí - SP",
    createdAt: "2026-05-20"
  }
];

export const INITIAL_SALES: Sale[] = [
  {
    id: "sale_1",
    clientId: "cli_1",
    clientName: "Agropecuária Vale Verde",
    date: "2026-06-02",
    items: [
      {
        id: "item_1_1",
        productName: "Magnus Premium Cães Adultos Carne",
        isMagnus: true,
        weightKg: 15,
        quantity: 10,
        unitCostPrice: 85.00,
        unitSalePrice: 120.00
      },
      {
        id: "item_1_2",
        productName: "Magnus Premium Cães Adultos Carne",
        isMagnus: true,
        weightKg: 25,
        quantity: 4,
        unitCostPrice: 125.00,
        unitSalePrice: 180.00
      }
    ],
    totalCost: 1350.00, // (85*10) + (125*4) = 850 + 500 = 1350
    totalSale: 1920.00, // (120*10) + (180*4) = 1200 + 720 = 1920
    profit: 570.00, // 1920 - 1350
    profitPercentage: 29.69, // (570 / 1920) * 100 ~ 29.69
    notes: "Pedido entregue. Cliente gostou do prazo de faturamento."
  },
  {
    id: "sale_2",
    clientId: "cli_2",
    clientName: "AgroPet Casa de Rações Itu",
    date: "2026-06-15",
    items: [
      {
        id: "item_2_1",
        productName: "Magnus Cat Premium Gatos Castrados Salmão",
        isMagnus: true,
        weightKg: 15,
        quantity: 6,
        unitCostPrice: 115.00,
        unitSalePrice: 165.00
      },
      {
        id: "item_2_2",
        productName: "Magnus Super Premium Cães Adultos Raças Pequenas",
        isMagnus: true,
        weightKg: 10.1,
        quantity: 5,
        unitCostPrice: 110.00,
        unitSalePrice: 155.00
      }
    ],
    totalCost: 1240.00, // (115*6) + (110*5) = 690 + 550 = 1240
    totalSale: 1765.00, // (165*6) + (155*5) = 990 + 775 = 1765
    profit: 525.00,
    profitPercentage: 29.75,
    notes: "Compra programada de inverno."
  }
];

export const INITIAL_VISITS: Visit[] = [
  {
    id: "vis_1",
    clientId: "cli_1",
    clientName: "Agropecuária Vale Verde",
    date: "2026-06-25",
    time: "10:00",
    status: "scheduled",
    purpose: "Retorno quinzenal para tirar novo pedido de rações Magnus Premium."
  },
  {
    id: "vis_2",
    clientId: "cli_2",
    clientName: "AgroPet Casa de Rações Itu",
    date: "2026-06-28",
    time: "14:30",
    status: "scheduled",
    purpose: "Apresentação da linha Magnus Super Premium e entrega de material de PDV."
  },
  {
    id: "vis_3",
    clientId: "cli_3",
    clientName: "NutriCampo Insumos Agrícolas",
    date: "2026-06-18",
    time: "09:00",
    status: "done",
    purpose: "Primeira visita de contato. Apresentar portfólio Adimax / Magnus.",
    feedback: "Cliente se interessou nas condições comerciais. Prometeu comprar no fim do mês."
  }
];
