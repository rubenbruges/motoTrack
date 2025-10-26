import { supabase } from '../lib/supabase';

export const getUsers = async () => {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  return data.users;
};

export const getUserCount = async () => {
  const { count, error } = await supabase
    .from('auth.users')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count;
};