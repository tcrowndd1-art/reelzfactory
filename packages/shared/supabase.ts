import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// Users
// ============================================
export async function getOrCreateUser(telegramId: number, username?: string, displayName?: string) {
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (existing) return existing;

  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      telegram_id: telegramId,
      telegram_username: username,
      display_name: displayName,
    })
    .select()
    .single();

  if (error) throw error;
  return newUser;
}

// ============================================
// Channels
// ============================================
export async function getUserChannels(userId: string) {
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createChannel(userId: string, channelData: any) {
  const { data, error } = await supabase
    .from('channels')
    .insert({ user_id: userId, ...channelData })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateChannel(channelId: string, updates: any) {
  const { data, error } = await supabase
    .from('channels')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', channelId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// Productions
// ============================================
export async function createProduction(productionData: any) {
  const { data, error } = await supabase
    .from('productions')
    .insert(productionData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProduction(productionId: string, updates: any) {
  const { data, error } = await supabase
    .from('productions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', productionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserProductions(userId: string, status?: string, limit = 10) {
  let query = supabase
    .from('productions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getTodayProductions(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('productions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================
// API Keys
// ============================================
export async function saveApiKey(userId: string, provider: string, apiKey: string) {
  const { data, error } = await supabase
    .from('api_keys')
    .upsert(
      { user_id: userId, provider, api_key: apiKey, is_valid: true },
      { onConflict: 'user_id,provider' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserApiKeys(userId: string) {
  const { data, error } = await supabase
    .from('api_keys')
    .select('provider, is_valid, last_checked_at')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

// ============================================
// Series
// ============================================
export async function createSeries(seriesData: any) {
  const { data, error } = await supabase
    .from('series')
    .insert(seriesData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserSeries(userId: string) {
  const { data, error } = await supabase
    .from('series')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================
// Schedules
// ============================================
export async function createSchedule(scheduleData: any) {
  const { data, error } = await supabase
    .from('schedules')
    .insert(scheduleData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserSchedules(userId: string) {
  const { data, error } = await supabase
    .from('schedules')
    .select('*, channels(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================
// Reference Materials
// ============================================
export async function saveReference(refData: any) {
  const { data, error } = await supabase
    .from('ref_materials')
    .insert(refData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getReferences(userId: string, type?: string) {
  let query = supabase
    .from('ref_materials')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (type) query = query.eq('type', type);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ============================================
// Cost Logs
// ============================================
export async function logCost(userId: string, productionId: string | null, provider: string, cost: number, callType?: string) {
  const { error } = await supabase
    .from('cost_logs')
    .insert({
      user_id: userId,
      production_id: productionId,
      provider,
      api_call_type: callType,
      cost,
    });

  if (error) throw error;
}

export async function getMonthlyCost(userId: string) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('cost_logs')
    .select('provider, cost')
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString());

  if (error) throw error;

  const total = (data || []).reduce((sum, log) => sum + log.cost, 0);
  const byProvider: Record<string, number> = {};
  (data || []).forEach(log => {
    byProvider[log.provider] = (byProvider[log.provider] || 0) + log.cost;
  });

  return { total, byProvider };
}

// ============================================
// Admin
// ============================================
export async function isAdmin(telegramId: number): Promise<boolean> {
  const { data } = await supabase
    .from('admin_users')
    .select('id')
    .eq('telegram_id', telegramId)
    .single();

  return !!data;
}

export async function getAdminStats() {
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  const { count: totalProductions } = await supabase
    .from('productions')
    .select('*', { count: 'exact', head: true });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: todayProductions } = await supabase
    .from('productions')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString());

  const { count: todayUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString());

  return {
    totalUsers: totalUsers || 0,
    totalProductions: totalProductions || 0,
    todayProductions: todayProductions || 0,
    todayNewUsers: todayUsers || 0,
  };
}

// ============================================
// Feature Usage Tracking
// ============================================
export async function trackFeature(userId: string, feature: string, metadata?: any) {
  const { error } = await supabase
    .from('feature_usage')
    .insert({
      user_id: userId,
      feature,
      metadata: metadata || {},
    });

  if (error) console.error('Feature tracking error:', error);
}
