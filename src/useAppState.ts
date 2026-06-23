import { useState, useEffect } from 'react';
import { Client, Sale, Visit } from './types';
import { INITIAL_CLIENTS, INITIAL_SALES, INITIAL_VISITS } from './constants';

export function useAppState() {
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedClients = localStorage.getItem('clientspro_clients');
      const storedSales = localStorage.getItem('clientspro_sales');
      const storedVisits = localStorage.getItem('clientspro_visits');

      if (storedClients) {
        setClients(JSON.parse(storedClients));
      } else {
        setClients(INITIAL_CLIENTS);
        localStorage.setItem('clientspro_clients', JSON.stringify(INITIAL_CLIENTS));
      }

      if (storedSales) {
        setSales(JSON.parse(storedSales));
      } else {
        setSales(INITIAL_SALES);
        localStorage.setItem('clientspro_sales', JSON.stringify(INITIAL_SALES));
      }

      if (storedVisits) {
        setVisits(JSON.parse(storedVisits));
      } else {
        setVisits(INITIAL_VISITS);
        localStorage.setItem('clientspro_visits', JSON.stringify(INITIAL_VISITS));
      }
    } catch (e) {
      console.error('Error loading state from localStorage:', e);
      // Fallbacks
      setClients(INITIAL_CLIENTS);
      setSales(INITIAL_SALES);
      setVisits(INITIAL_VISITS);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save helpers
  const saveClients = (newClients: Client[]) => {
    setClients(newClients);
    localStorage.setItem('clientspro_clients', JSON.stringify(newClients));
  };

  const saveSales = (newSales: Sale[]) => {
    setSales(newSales);
    localStorage.setItem('clientspro_sales', JSON.stringify(newSales));
  };

  const saveVisits = (newVisits: Visit[]) => {
    setVisits(newVisits);
    localStorage.setItem('clientspro_visits', JSON.stringify(newVisits));
  };

  // Client operations
  const addClient = (client: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient: Client = {
      ...client,
      id: `cli_${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    const updated = [newClient, ...clients];
    saveClients(updated);
    return newClient;
  };

  const updateClient = (updatedClient: Client) => {
    const updated = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
    saveClients(updated);

    // Also update clientName in sales/visits if edited
    const updatedSales = sales.map(s => s.clientId === updatedClient.id ? { ...s, clientName: updatedClient.name } : s);
    saveSales(updatedSales);

    const updatedVisits = visits.map(v => v.clientId === updatedClient.id ? { ...v, clientName: updatedClient.name } : v);
    saveVisits(updatedVisits);
  };

  const deleteClient = (id: string) => {
    saveClients(clients.filter(c => c.id !== id));
    // Optionally clean up dependent visits/sales or keep them
    saveVisits(visits.filter(v => v.clientId !== id));
    saveSales(sales.filter(s => s.clientId !== id));
  };

  // Sale operations
  const addSale = (sale: Omit<Sale, 'id'>) => {
    const newSale: Sale = {
      ...sale,
      id: `sale_${Date.now()}`
    };
    const updated = [newSale, ...sales];
    saveSales(updated);
    return newSale;
  };

  const deleteSale = (id: string) => {
    saveSales(sales.filter(s => s.id !== id));
  };

  // Visit operations
  const addVisit = (visit: Omit<Visit, 'id'>) => {
    const newVisit: Visit = {
      ...visit,
      id: `vis_${Date.now()}`
    };
    const updated = [newVisit, ...visits];
    saveVisits(updated);
    return newVisit;
  };

  const updateVisit = (updatedVisit: Visit) => {
    const updated = visits.map(v => v.id === updatedVisit.id ? updatedVisit : v);
    saveVisits(updated);
  };

  const deleteVisit = (id: string) => {
    saveVisits(visits.filter(v => v.id !== id));
  };

  // Import/Export backup files for maximum reliability
  const exportData = () => {
    const backup = {
      clients,
      sales,
      visits,
      version: "1.0",
      exportDate: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Backup_ClientsProEdvan_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importData = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.clients && data.sales && data.visits) {
        saveClients(data.clients);
        saveSales(data.sales);
        saveVisits(data.visits);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to parse backup JSON:', e);
      return false;
    }
  };

  return {
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
  };
}
