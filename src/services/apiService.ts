import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const toCamel = (str: string) =>
  str.replace(/([-_][a-z])/g, (g) => g.toUpperCase().replace('-', '').replace('_', ''));

const toSnake = (str: string) =>
  str.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);

const mapKeysCamel = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(mapKeysCamel);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((acc, key) => {
      acc[toCamel(key)] = mapKeysCamel(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
};

const mapKeysSnake = (obj: any): any => {
  if (obj !== null && typeof obj === 'object' && !Array.isArray(obj) && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((acc, key) => {
      acc[toSnake(key)] = obj[key];
      return acc;
    }, {} as any);
  }
  return obj;
};

const pkField = (entity: string) => (entity === 'users' ? 'uid' : 'id');

export const apiService = {
  async get(entity: string, params: Record<string, string> = {}) {
    let query = supabase.from(entity).select('*');

    for (const [key, val] of Object.entries(params)) {
      const col = key.includes('_') ? key : toSnake(key);
      query = (query as any).eq(col, val);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return mapKeysCamel(data ?? []);
  },

  async post(entity: string, payload: any) {
    const snakeData = mapKeysSnake({ ...payload });
    const pk = pkField(entity);

    const { data, error } = await supabase
      .from(entity)
      .upsert(snakeData, { onConflict: pk })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapKeysCamel(data);
  },

  async delete(entity: string, id: string) {
    const pk = pkField(entity);
    const { data, error } = await supabase
      .from(entity)
      .delete()
      .eq(pk, id)
      .select();

    if (error) throw new Error(error.message);
    return mapKeysCamel(data ?? []);
  },

  async login(payload: { email?: string; phone?: string; password: string }) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Login failed: ${res.status}`);
    return data;
  },

  async inspectDb() {
    const { data, error } = await supabase
      .from('users')
      .select('uid, email, phone, role')
      .limit(1);
    if (error) throw new Error(error.message);
    return data;
  },
};
