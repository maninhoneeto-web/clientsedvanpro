export interface Client {
  id: string;
  name: string;
  owner: string;
  phone: string;
  city: string;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  productName: string;
  isMagnus: boolean;
  weightKg: number;
  quantity: number;
  unitCostPrice: number; // For cost-of-goods-sold analysis
  unitSalePrice: number; // Price sold to the agropecuária
}

export interface Sale {
  id: string;
  clientId: string;
  clientName: string;
  date: string; // ISO or YYYY-MM-DD
  items: SaleItem[];
  totalCost: number;
  totalSale: number;
  profit: number; // totalSale - totalCost
  profitPercentage: number; // (profit / totalSale) * 100 or margin percentage
  notes?: string;
}

export interface Visit {
  id: string;
  clientId: string;
  clientName: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  status: 'scheduled' | 'done' | 'canceled';
  purpose: string;
  feedback?: string;
}

export interface MagnusProductTemplate {
  name: string;
  weightKg: number;
  category: 'Cães' | 'Gatos' | 'Outros';
  estimatedCostPrice: number;
  estimatedSalePrice: number;
}
