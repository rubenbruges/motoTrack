import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Bolsillo = Database['public']['Tables']['bolsillos']['Row'];
type BolsilloInsert = Database['public']['Tables']['bolsillos']['Insert'];
type BolsilloUpdate = Database['public']['Tables']['bolsillos']['Update'];

export async function getBolsillos(motoId: string): Promise<Bolsillo[]> {
  const { data, error } = await supabase
    .from('bolsillos')
    .select('*')
    .eq('moto_id', motoId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createBolsillo(bolsillo: BolsilloInsert): Promise<Bolsillo> {
  const { data, error } = await supabase
    .from('bolsillos')
    .insert(bolsillo)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBolsillo(id: string, updates: BolsilloUpdate): Promise<Bolsillo> {
  const { data, error } = await supabase
    .from('bolsillos')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBolsillo(id: string): Promise<void> {
  const { error } = await supabase
    .from('bolsillos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
