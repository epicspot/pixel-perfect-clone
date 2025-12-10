// Mock API service - simulates Laravel API endpoints

export interface Ticket {
  id: number;
  reference: string;
  passenger: string;
  voyage_id: number;
  voyage_name: string;
  departure: string;
  destination: string;
  date: string;
  price: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  created_at: string;
}

export interface Voyage {
  id: number;
  name: string;
  departure: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  price: number;
  available_seats: number;
  total_seats: number;
  status: 'active' | 'completed' | 'cancelled';
}

export interface DashboardStats {
  total_tickets: number;
  total_revenue: number;
  active_voyages: number;
  passengers_today: number;
  tickets_trend: number;
  revenue_trend: number;
}

// Mock data
const mockTickets: Ticket[] = [
  { id: 1, reference: 'TKT-001', passenger: 'Jean Dupont', voyage_id: 1, voyage_name: 'Express Dakar-Thiès', departure: 'Dakar', destination: 'Thiès', date: '2024-12-10', price: 2500, status: 'confirmed', created_at: '2024-12-08' },
  { id: 2, reference: 'TKT-002', passenger: 'Marie Ndiaye', voyage_id: 2, voyage_name: 'Navette Saint-Louis', departure: 'Dakar', destination: 'Saint-Louis', date: '2024-12-10', price: 5000, status: 'pending', created_at: '2024-12-09' },
  { id: 3, reference: 'TKT-003', passenger: 'Amadou Fall', voyage_id: 1, voyage_name: 'Express Dakar-Thiès', departure: 'Dakar', destination: 'Thiès', date: '2024-12-11', price: 2500, status: 'confirmed', created_at: '2024-12-09' },
  { id: 4, reference: 'TKT-004', passenger: 'Fatou Diallo', voyage_id: 3, voyage_name: 'Ligne Ziguinchor', departure: 'Dakar', destination: 'Ziguinchor', date: '2024-12-12', price: 8000, status: 'confirmed', created_at: '2024-12-10' },
  { id: 5, reference: 'TKT-005', passenger: 'Moussa Sow', voyage_id: 2, voyage_name: 'Navette Saint-Louis', departure: 'Dakar', destination: 'Saint-Louis', date: '2024-12-10', price: 5000, status: 'cancelled', created_at: '2024-12-08' },
];

const mockVoyages: Voyage[] = [
  { id: 1, name: 'Express Dakar-Thiès', departure: 'Dakar', destination: 'Thiès', departure_time: '08:00', arrival_time: '09:30', price: 2500, available_seats: 25, total_seats: 50, status: 'active' },
  { id: 2, name: 'Navette Saint-Louis', departure: 'Dakar', destination: 'Saint-Louis', departure_time: '07:00', arrival_time: '12:00', price: 5000, available_seats: 10, total_seats: 40, status: 'active' },
  { id: 3, name: 'Ligne Ziguinchor', departure: 'Dakar', destination: 'Ziguinchor', departure_time: '06:00', arrival_time: '14:00', price: 8000, available_seats: 35, total_seats: 60, status: 'active' },
  { id: 4, name: 'Express Mbour', departure: 'Dakar', destination: 'Mbour', departure_time: '09:00', arrival_time: '10:30', price: 2000, available_seats: 0, total_seats: 45, status: 'completed' },
];

// Simulated API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    await delay(500);
    return {
      total_tickets: 1247,
      total_revenue: 3850000,
      active_voyages: 12,
      passengers_today: 156,
      tickets_trend: 12.5,
      revenue_trend: 8.3,
    };
  },

  // Tickets
  async getTickets(): Promise<Ticket[]> {
    await delay(400);
    return mockTickets;
  },

  async getTicket(id: number): Promise<Ticket | undefined> {
    await delay(300);
    return mockTickets.find(t => t.id === id);
  },

  // Voyages
  async getVoyages(): Promise<Voyage[]> {
    await delay(400);
    return mockVoyages;
  },

  async getVoyage(id: number): Promise<Voyage | undefined> {
    await delay(300);
    return mockVoyages.find(v => v.id === id);
  },

  // Auth (mock)
  async login(email: string, password: string): Promise<{ success: boolean; token?: string; error?: string }> {
    await delay(800);
    if (email === 'admin@transport.sn' && password === 'password') {
      return { success: true, token: 'mock-jwt-token-12345' };
    }
    return { success: false, error: 'Identifiants invalides' };
  },

  async logout(): Promise<void> {
    await delay(300);
  },
};
