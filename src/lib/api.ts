// API Service for Laravel backend

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Types
export interface Agency {
  id: number;
  name: string;
  city?: string;
  address?: string;
  phone?: string;
}

export interface RouteRow {
  id: number;
  name: string;
  base_price: number;
  departure_agency_id: number;
  arrival_agency_id: number;
  departure_agency?: Agency;
  arrival_agency?: Agency;
}

export interface Vehicle {
  id: number;
  agency_id: number;
  registration_number: string;
  brand?: string;
  model?: string;
  seats: number;
  status: 'active' | 'maintenance' | 'inactive';
  agency?: Agency;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier' | 'accountant' | 'mechanic';
  agency_id?: number;
  agency_name?: string;
}

export interface Ticket {
  id: number;
  reference: string;
  trip_id: number;
  customer_name: string;
  price: number;
  total_amount: number;
  status: 'paid' | 'pending' | 'cancelled';
  payment_method: string;
  sold_at: string;
  created_at: string;
}

export interface Trip {
  id: number;
  route_id: number;
  vehicle_id: number;
  departure_datetime: string;
  arrival_datetime?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  route?: RouteRow;
  vehicle?: Vehicle;
  available_seats?: number;
}

export interface FuelEntry {
  id: number;
  vehicle_id: number;
  agency_id: number;
  liters: number;
  price_per_liter: number;
  total_amount: number;
  filled_at: string;
  vehicle?: Vehicle;
  agency?: Agency;
}

export interface MaintenanceOrder {
  id: number;
  vehicle_id: number;
  agency_id: number;
  reported_by?: number;
  validated_by?: number;
  opened_at: string;
  closed_at?: string;
  type: 'preventive' | 'corrective' | 'other';
  status: 'open' | 'in_progress' | 'closed' | 'cancelled';
  title: string;
  description?: string;
  total_cost?: number;
  odometer_km?: number;
  vehicle?: Vehicle;
  agency?: Agency;
  reporter?: User;
  validator?: User;
}

export interface DashboardStats {
  today: {
    sales_amount: number;
    tickets_count: number;
    trips_count: number;
  };
  month: {
    sales_amount: number;
    tickets_count: number;
    trips_count: number;
    start: string;
    end: string;
  };
  per_agency: Array<{
    agency_id: number;
    agency_name: string;
    total_amount: number;
    tickets_count: number;
  }>;
  recent_tickets: Array<{
    id: number;
    sold_at: string;
    price: number;
    payment_method: string;
    customer_name: string;
    agency_name: string;
  }>;
}

export interface FuelStats {
  period: { from: string | null; to: string | null };
  global: {
    total_liters: number;
    total_amount: number;
    average_liter_price: number;
  };
  per_agency?: Array<{
    agency_id: number;
    agency_name: string;
    total_liters: number;
    total_amount: number;
  }>;
  per_vehicle?: Array<{
    vehicle_id: number;
    registration_number: string;
    agency_name: string;
    seats: number;
    total_liters: number;
    total_amount: number;
    fuel_count: number;
  }>;
}

export interface VehicleCostStats {
  period: { from: string | null; to: string | null };
  data: Array<{
    vehicle_id: number;
    registration_number: string;
    agency_name: string;
    total_fuel_amount: number;
    total_fuel_liters: number;
    total_maintenance_amount: number;
    total_cost: number;
  }>;
}

export interface VehicleProfitStats {
  period: { from: string | null; to: string | null };
  data: Array<{
    vehicle_id: number;
    registration_number: string;
    agency_name: string;
    total_revenue: number;
    tickets_count: number;
    total_fuel_cost: number;
    total_maintenance_cost: number;
    total_cost: number;
    profit: number;
    margin_percent: number;
  }>;
}

// API Client
class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}/api${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur réseau' }));
      throw new Error(error.message || `Erreur ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout(): Promise<void> {
    await this.request('/logout', { method: 'POST' });
    this.token = null;
  }

  async getProfile(): Promise<User> {
    return this.request('/user');
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request('/admin/dashboard-stats');
  }

  // Agencies
  async getAgencies(): Promise<Agency[]> {
    return this.request('/admin/agencies');
  }

  async createAgency(data: Omit<Agency, 'id'>): Promise<Agency> {
    return this.request('/admin/agencies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAgency(id: number, data: Partial<Agency>): Promise<Agency> {
    return this.request(`/admin/agencies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAgency(id: number): Promise<void> {
    await this.request(`/admin/agencies/${id}`, { method: 'DELETE' });
  }

  // Routes
  async getRoutes(): Promise<RouteRow[]> {
    return this.request('/admin/routes');
  }

  async createRoute(data: Omit<RouteRow, 'id' | 'departure_agency' | 'arrival_agency'>): Promise<RouteRow> {
    return this.request('/admin/routes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRoute(id: number, data: Partial<RouteRow>): Promise<RouteRow> {
    return this.request(`/admin/routes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRoute(id: number): Promise<void> {
    await this.request(`/admin/routes/${id}`, { method: 'DELETE' });
  }

  // Vehicles
  async getVehicles(): Promise<Vehicle[]> {
    return this.request('/admin/vehicles');
  }

  async createVehicle(data: Omit<Vehicle, 'id' | 'agency'>): Promise<Vehicle> {
    return this.request('/admin/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVehicle(id: number, data: Partial<Vehicle>): Promise<Vehicle> {
    return this.request(`/admin/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteVehicle(id: number): Promise<void> {
    await this.request(`/admin/vehicles/${id}`, { method: 'DELETE' });
  }

  // Users
  async getUsers(): Promise<User[]> {
    return this.request('/admin/users');
  }

  async createUser(data: Omit<User, 'id'> & { password: string }): Promise<User> {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: number, data: Partial<User> & { password?: string }): Promise<User> {
    return this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: number): Promise<void> {
    await this.request(`/admin/users/${id}`, { method: 'DELETE' });
  }

  // Tickets
  async getTickets(params?: { from?: string; to?: string; agency_id?: number }): Promise<{ data: Ticket[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.agency_id) query.set('agency_id', params.agency_id.toString());
    return this.request(`/tickets?${query}`);
  }

  // Trips
  async getTrips(params?: { from?: string; to?: string }): Promise<{ data: Trip[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    return this.request(`/trips?${query}`);
  }

  // Fuel Stats
  async getFuelStatsSummary(params?: { from?: string; to?: string; agency_id?: number }): Promise<FuelStats> {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.agency_id) query.set('agency_id', params.agency_id.toString());
    return this.request(`/fuel-stats/summary?${query}`);
  }

  async getFuelStatsPerVehicle(params?: { from?: string; to?: string; agency_id?: number }): Promise<FuelStats> {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.agency_id) query.set('agency_id', params.agency_id.toString());
    return this.request(`/fuel-stats/per-vehicle?${query}`);
  }

  // Maintenance Orders
  async getMaintenanceOrders(params?: { 
    status?: string; 
    type?: string; 
    vehicle_id?: number;
    from?: string; 
    to?: string;
  }): Promise<{ data: MaintenanceOrder[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.type) query.set('type', params.type);
    if (params?.vehicle_id) query.set('vehicle_id', params.vehicle_id.toString());
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    return this.request(`/maintenance-orders?${query}`);
  }

  async createMaintenanceOrder(data: Partial<MaintenanceOrder>): Promise<MaintenanceOrder> {
    return this.request('/maintenance-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMaintenanceOrder(id: number, data: Partial<MaintenanceOrder>): Promise<MaintenanceOrder> {
    return this.request(`/maintenance-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Vehicle Cost Stats
  async getVehicleCostStats(params?: { from?: string; to?: string; agency_id?: number }): Promise<VehicleCostStats> {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.agency_id) query.set('agency_id', params.agency_id.toString());
    return this.request(`/vehicle-cost-stats/per-vehicle?${query}`);
  }

  // Vehicle Profit Stats
  async getVehicleProfitStats(params?: { from?: string; to?: string; agency_id?: number }): Promise<VehicleProfitStats> {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.agency_id) query.set('agency_id', params.agency_id.toString());
    return this.request(`/vehicle-profit-stats/per-vehicle?${query}`);
  }

  // Export URLs
  getFuelExportPdfUrl(params?: { from?: string; to?: string; agency_id?: number; year?: number }): string {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.agency_id) query.set('agency_id', params.agency_id.toString());
    if (params?.year) query.set('year', params.year.toString());
    return `${API_BASE_URL}/api/fuel-stats/export/pdf?${query}`;
  }

  getFuelExportExcelUrl(params?: { from?: string; to?: string; agency_id?: number; year?: number }): string {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.agency_id) query.set('agency_id', params.agency_id.toString());
    if (params?.year) query.set('year', params.year.toString());
    return `${API_BASE_URL}/api/fuel-stats/export/excel?${query}`;
  }
}

export const api = new ApiClient();
