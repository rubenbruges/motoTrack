import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Moto = Database['public']['Tables']['motos']['Row'];
type MotoInsert = Database['public']['Tables']['motos']['Insert'];
type MotoUpdate = Database['public']['Tables']['motos']['Update'];

export async function getMotos(userId: string): Promise<Moto[]> {
  const { data, error } = await supabase
    .from('motos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getMoto(id: string): Promise<Moto | null> {
  const { data, error } = await supabase
    .from('motos')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createMoto(moto: MotoInsert): Promise<Moto> {
  const { data, error } = await supabase
    .from('motos')
    .insert(moto)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMoto(id: string, updates: MotoUpdate): Promise<Moto> {
  const { data, error } = await supabase
    .from('motos')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMoto(id: string): Promise<void> {
  const { error } = await supabase
    .from('motos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
