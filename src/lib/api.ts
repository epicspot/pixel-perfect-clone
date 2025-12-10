import { supabase } from '@/integrations/supabase/client';

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
  id: string;
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
  reported_by?: string;
  validated_by?: string;
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
}

export interface DashboardStats {
  today: {
    sales_amount: number;
    tickets_count: number;
    trips_count: number;
  };
  period: {
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
  daily_sales: Array<{
    date: string;
    total_amount: number;
    tickets_count: number;
  }>;
  daily_trips: Array<{
    date: string;
    trips_count: number;
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

// API Functions
export const api = {
  // Agencies
  async getAgencies(): Promise<Agency[]> {
    const { data, error } = await supabase
      .from('agencies')
      .select('*')
      .order('name');
    if (error) throw new Error(error.message);
    return data || [];
  },

  async createAgency(agency: Omit<Agency, 'id'>): Promise<Agency> {
    const { data, error } = await supabase
      .from('agencies')
      .insert(agency)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateAgency(id: number, updates: Partial<Agency>): Promise<Agency> {
    const { data, error } = await supabase
      .from('agencies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteAgency(id: number): Promise<void> {
    const { error } = await supabase
      .from('agencies')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  // Routes
  async getRoutes(): Promise<RouteRow[]> {
    const { data, error } = await supabase
      .from('routes')
      .select(`
        *,
        departure_agency:agencies!routes_departure_agency_id_fkey(*),
        arrival_agency:agencies!routes_arrival_agency_id_fkey(*)
      `)
      .order('name');
    if (error) throw new Error(error.message);
    return data || [];
  },

  async createRoute(route: Omit<RouteRow, 'id' | 'departure_agency' | 'arrival_agency'>): Promise<RouteRow> {
    const { data, error } = await supabase
      .from('routes')
      .insert(route)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateRoute(id: number, updates: Partial<RouteRow>): Promise<RouteRow> {
    const { data, error } = await supabase
      .from('routes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteRoute(id: number): Promise<void> {
    const { error } = await supabase
      .from('routes')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  // Vehicles
  async getVehicles(): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select(`
        *,
        agency:agencies(*)
      `)
      .order('registration_number');
    if (error) throw new Error(error.message);
    return (data || []) as unknown as Vehicle[];
  },

  async createVehicle(vehicle: Omit<Vehicle, 'id' | 'agency'>): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .insert(vehicle)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as Vehicle;
  },

  async updateVehicle(id: number, updates: Partial<Vehicle>): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as Vehicle;
  },

  async deleteVehicle(id: number): Promise<void> {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  // Users (Profiles)
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        agency:agencies(name)
      `)
      .order('name');
    if (error) throw new Error(error.message);
    return (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role as User['role'],
      agency_id: p.agency_id,
      agency_name: p.agency?.name,
    }));
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: updates.name,
        role: updates.role,
        agency_id: updates.agency_id,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as User;
  },

  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  // Trips
  async getTrips(params?: { from?: string; to?: string }): Promise<{ data: Trip[]; total: number }> {
    let query = supabase
      .from('trips')
      .select(`
        *,
        route:routes(*,
          departure_agency:agencies!routes_departure_agency_id_fkey(*),
          arrival_agency:agencies!routes_arrival_agency_id_fkey(*)
        ),
        vehicle:vehicles(*, agency:agencies(*))
      `, { count: 'exact' })
      .order('departure_datetime', { ascending: false });

    if (params?.from) {
      query = query.gte('departure_datetime', params.from);
    }
    if (params?.to) {
      query = query.lte('departure_datetime', params.to);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return { data: (data || []) as unknown as Trip[], total: count || 0 };
  },

  // Tickets
  async getTickets(params?: { from?: string; to?: string }): Promise<{ data: Ticket[]; total: number }> {
    let query = supabase
      .from('tickets')
      .select('*', { count: 'exact' })
      .order('sold_at', { ascending: false });

    if (params?.from) {
      query = query.gte('sold_at', params.from);
    }
    if (params?.to) {
      query = query.lte('sold_at', params.to);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return { data: (data || []) as unknown as Ticket[], total: count || 0 };
  },

  // Maintenance Orders
  async getMaintenanceOrders(params?: { status?: string; type?: string }): Promise<{ data: MaintenanceOrder[]; total: number }> {
    let query = supabase
      .from('maintenance_orders')
      .select(`
        *,
        vehicle:vehicles(*, agency:agencies(*))
      `, { count: 'exact' })
      .order('opened_at', { ascending: false });

    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.type) {
      query = query.eq('type', params.type);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return { data: (data || []) as unknown as MaintenanceOrder[], total: count || 0 };
  },

  async createMaintenanceOrder(order: Partial<MaintenanceOrder>): Promise<MaintenanceOrder> {
    const { data, error } = await supabase
      .from('maintenance_orders')
      .insert({
        vehicle_id: order.vehicle_id,
        title: order.title,
        description: order.description,
        type: order.type,
        status: order.status,
        total_cost: order.total_cost,
        odometer_km: order.odometer_km,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as MaintenanceOrder;
  },

  async updateMaintenanceOrder(id: number, updates: Partial<MaintenanceOrder>): Promise<MaintenanceOrder> {
    const { data, error } = await supabase
      .from('maintenance_orders')
      .update({
        vehicle_id: updates.vehicle_id,
        title: updates.title,
        description: updates.description,
        type: updates.type,
        status: updates.status,
        total_cost: updates.total_cost,
        odometer_km: updates.odometer_km,
        closed_at: updates.status === 'closed' ? new Date().toISOString() : undefined,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as MaintenanceOrder;
  },

  // Fuel Stats
  async getFuelStatsSummary(params?: { from?: string; to?: string }): Promise<FuelStats> {
    let query = supabase
      .from('fuel_entries')
      .select(`
        *,
        vehicle:vehicles(*),
        agency:agencies(*)
      `);

    if (params?.from) {
      query = query.gte('filled_at', params.from);
    }
    if (params?.to) {
      query = query.lte('filled_at', params.to);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const entries = data || [];
    const total_liters = entries.reduce((sum, e: any) => sum + Number(e.liters), 0);
    const total_amount = entries.reduce((sum, e: any) => sum + Number(e.total_amount), 0);

    // Group by agency
    const agencyMap = new Map<number, { agency_id: number; agency_name: string; total_liters: number; total_amount: number }>();
    entries.forEach((e: any) => {
      if (e.agency_id && e.agency) {
        const existing = agencyMap.get(e.agency_id) || {
          agency_id: e.agency_id,
          agency_name: e.agency.name,
          total_liters: 0,
          total_amount: 0,
        };
        existing.total_liters += Number(e.liters);
        existing.total_amount += Number(e.total_amount);
        agencyMap.set(e.agency_id, existing);
      }
    });

    return {
      period: { from: params?.from || null, to: params?.to || null },
      global: {
        total_liters,
        total_amount,
        average_liter_price: total_liters > 0 ? total_amount / total_liters : 0,
      },
      per_agency: Array.from(agencyMap.values()),
    };
  },

  async getFuelStatsPerVehicle(params?: { from?: string; to?: string }): Promise<FuelStats> {
    let query = supabase
      .from('fuel_entries')
      .select(`
        *,
        vehicle:vehicles(*, agency:agencies(*))
      `);

    if (params?.from) {
      query = query.gte('filled_at', params.from);
    }
    if (params?.to) {
      query = query.lte('filled_at', params.to);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const entries = data || [];
    const total_liters = entries.reduce((sum, e: any) => sum + Number(e.liters), 0);
    const total_amount = entries.reduce((sum, e: any) => sum + Number(e.total_amount), 0);

    // Group by vehicle
    const vehicleMap = new Map<number, {
      vehicle_id: number;
      registration_number: string;
      agency_name: string;
      seats: number;
      total_liters: number;
      total_amount: number;
      fuel_count: number;
    }>();

    entries.forEach((e: any) => {
      if (e.vehicle_id && e.vehicle) {
        const existing = vehicleMap.get(e.vehicle_id) || {
          vehicle_id: e.vehicle_id,
          registration_number: e.vehicle.registration_number,
          agency_name: e.vehicle.agency?.name || '',
          seats: e.vehicle.seats,
          total_liters: 0,
          total_amount: 0,
          fuel_count: 0,
        };
        existing.total_liters += Number(e.liters);
        existing.total_amount += Number(e.total_amount);
        existing.fuel_count += 1;
        vehicleMap.set(e.vehicle_id, existing);
      }
    });

    return {
      period: { from: params?.from || null, to: params?.to || null },
      global: {
        total_liters,
        total_amount,
        average_liter_price: total_liters > 0 ? total_amount / total_liters : 0,
      },
      per_vehicle: Array.from(vehicleMap.values()),
    };
  },

  async createFuelEntry(entry: {
    vehicle_id: number;
    agency_id: number;
    liters: number;
    price_per_liter: number;
    total_amount: number;
    filled_at?: string;
  }): Promise<FuelEntry> {
    const { data: session } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from('fuel_entries')
      .insert({
        ...entry,
        filled_at: entry.filled_at || new Date().toISOString(),
        created_by: session?.session?.user?.id,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as FuelEntry;
  },

  async getFuelEntries(params?: { from?: string; to?: string }): Promise<FuelEntry[]> {
    let query = supabase
      .from('fuel_entries')
      .select(`
        *,
        vehicle:vehicles(*, agency:agencies(*)),
        agency:agencies(*)
      `)
      .order('filled_at', { ascending: false });

    if (params?.from) {
      query = query.gte('filled_at', params.from);
    }
    if (params?.to) {
      query = query.lte('filled_at', params.to);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []) as unknown as FuelEntry[];
  },

  async updateFuelEntry(id: number, entry: {
    vehicle_id?: number;
    agency_id?: number;
    liters?: number;
    price_per_liter?: number;
    total_amount?: number;
    filled_at?: string;
  }): Promise<FuelEntry> {
    const { data, error } = await supabase
      .from('fuel_entries')
      .update(entry)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as FuelEntry;
  },

  async deleteFuelEntry(id: number): Promise<void> {
    const { error } = await supabase
      .from('fuel_entries')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  // Dashboard Stats
  async getDashboardStats(params?: { from?: string; to?: string }): Promise<DashboardStats> {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

    const periodStart = params?.from || startOfMonth;
    const periodEnd = params?.to || endOfMonth;

    // Today's tickets
    const { data: todayTickets } = await supabase
      .from('tickets')
      .select('price')
      .eq('status', 'paid')
      .gte('sold_at', `${today}T00:00:00`)
      .lte('sold_at', `${today}T23:59:59`);

    // Today's trips
    const { count: todayTripsCount } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .gte('departure_datetime', `${today}T00:00:00`)
      .lte('departure_datetime', `${today}T23:59:59`);

    // Period tickets with trip info
    const { data: periodTickets } = await supabase
      .from('tickets')
      .select('*')
      .eq('status', 'paid')
      .gte('sold_at', periodStart)
      .lte('sold_at', periodEnd);

    // Period trips
    const { count: periodTripsCount } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .gte('departure_datetime', periodStart)
      .lte('departure_datetime', periodEnd);

    // Process data
    const todaySales = (todayTickets || []).reduce((sum, t: any) => sum + Number(t.price), 0);
    const periodSales = (periodTickets || []).reduce((sum, t: any) => sum + Number(t.price), 0);

    // Group by day for daily_sales
    const dailySalesMap = new Map<string, { date: string; total_amount: number; tickets_count: number }>();
    (periodTickets || []).forEach((t: any) => {
      if (t.sold_at) {
        const date = t.sold_at.split('T')[0];
        const existing = dailySalesMap.get(date) || { date, total_amount: 0, tickets_count: 0 };
        existing.total_amount += Number(t.price);
        existing.tickets_count += 1;
        dailySalesMap.set(date, existing);
      }
    });

    // Recent tickets
    const recentTickets = (periodTickets || [])
      .sort((a: any, b: any) => new Date(b.sold_at || 0).getTime() - new Date(a.sold_at || 0).getTime())
      .slice(0, 10)
      .map((t: any) => ({
        id: t.id,
        sold_at: t.sold_at || '',
        price: Number(t.price),
        payment_method: t.payment_method || 'cash',
        customer_name: t.customer_name || '',
        agency_name: '',
      }));

    return {
      today: {
        sales_amount: todaySales,
        tickets_count: (todayTickets || []).length,
        trips_count: todayTripsCount || 0,
      },
      period: {
        sales_amount: periodSales,
        tickets_count: (periodTickets || []).length,
        trips_count: periodTripsCount || 0,
        start: periodStart,
        end: periodEnd,
      },
      per_agency: [],
      daily_sales: Array.from(dailySalesMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
      daily_trips: [],
      recent_tickets: recentTickets,
    };
  },
};
