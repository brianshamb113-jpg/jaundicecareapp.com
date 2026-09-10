import { supabase } from '../lib/supabase';
import { putStoreItem, putStoreItem as putOfflineItem, type OfflineAlert, type OfflineScan, type SyncQueueItem } from './offlineDb';
import type { LocationData } from './locationService';

export async function uploadScanImage(imageBase64: string, parentId: string): Promise<string | null> {
  try {
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    const byteString = atob(base64Data);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i += 1) uint8Array[i] = byteString.charCodeAt(i);
    const blob = new Blob([uint8Array], { type: 'image/jpeg' });
    const path = `scans/${parentId}/${Date.now()}/scan.jpg`;
    const { error } = await supabase.storage.from('scans').upload(path, blob, { contentType: 'image/jpeg' });
    if (error) return null;
    return supabase.storage.from('scans').getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

export interface SaveScanParams {
  id?: string;
  babyId: string | null;
  parentId: string;
  imageBase64?: string;
  imageUrl: string | null;
  imagePath: string | null;
  riskLevel: 'High' | 'Medium' | 'Low';
  confidenceScore: number;
  isOffline: boolean;
  location: LocationData | null;
}

export async function saveScanToDb(params: SaveScanParams) {
  const id = params.id || crypto.randomUUID();
  const payload = {
    id,
    baby_id: params.babyId,
    parent_id: params.parentId,
    image_url: params.imageUrl,
    image_path: params.imagePath,
    risk_level: params.riskLevel,
    confidence_score: params.confidenceScore,
    is_offline: params.isOffline,
    synced_at: params.isOffline ? null : new Date().toISOString(),
    latitude: params.location?.lat ?? null,
    longitude: params.location?.lng ?? null,
    location_accuracy: params.location?.accuracy ?? null,
    location_address: params.location?.address ?? null,
    location_captured_at: params.location?.capturedAt ?? null,
  };

  if (!navigator.onLine || params.isOffline) {
    const offlineScan: OfflineScan = {
      id,
      babyId: params.babyId || '',
      imageData: params.imageBase64 || '',
      imagePath: params.imagePath || '',
      location: params.location ? { lat: params.location.lat, lng: params.location.lng, accuracy: params.location.accuracy, address: params.location.address } : null,
      riskLevel: params.riskLevel,
      confidenceScore: params.confidenceScore,
      scanDate: new Date().toISOString(),
      isSynced: false,
      syncAttempts: 0,
      lastSyncAttempt: null,
      parentId: params.parentId,
    };
    await putStoreItem('scans', offlineScan);
    await enqueue({ id: crypto.randomUUID(), type: 'scan', recordId: id, attempts: 0, nextAttemptAt: new Date().toISOString(), createdAt: new Date().toISOString() });
    return payload;
  }

  const { data, error } = await supabase.from('scans').insert(payload).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function createAlertForHighRiskScan(scanId: string, parentId: string, location: LocationData | null) {
  const hospitalUserId = await findNearestHospital(location);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const locationFields = {
    latitude: location?.lat ?? null,
    longitude: location?.lng ?? null,
    location_accuracy: location?.accuracy ?? null,
    location_address: location?.address ?? null,
    location_updated_at: location?.capturedAt ?? createdAt,
  };

  if (!navigator.onLine) {
    const offlineAlert: OfflineAlert = {
      id,
      scanId,
      parentId,
      location: location ? { lat: location.lat, lng: location.lng, accuracy: location.accuracy, address: location.address } : null,
      riskLevel: 'High',
      hospitalId: hospitalUserId,
      createdAt,
      sentAt: null,
      isSent: false,
      retryCount: 0,
      lastRetry: null,
    };
    await putOfflineItem('alerts', offlineAlert);
    await enqueue({ id: crypto.randomUUID(), type: 'alert', recordId: id, attempts: 0, nextAttemptAt: createdAt, createdAt });
    return offlineAlert;
  }

  const { data, error } = await supabase.from('alerts').insert({
    id,
    scan_id: scanId,
    parent_id: parentId,
    hospital_user_id: hospitalUserId,
    hospital_notified: !!hospitalUserId,
    admin_notified: true,
    sent_via: 'in_app',
    ...locationFields,
  }).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateAlertLocation(alertId: string, parentId: string, location: LocationData): Promise<void> {
  const fields = {
    latitude: location.lat,
    longitude: location.lng,
    location_accuracy: location.accuracy,
    location_address: location.address,
    location_updated_at: location.capturedAt,
  };
  const { error } = await supabase.from('alerts').update(fields).eq('id', alertId).eq('parent_id', parentId);
  if (error) throw error;
  const { error: historyError } = await supabase.from('alert_location_updates').insert({
    alert_id: alertId,
    parent_id: parentId,
    latitude: location.lat,
    longitude: location.lng,
    accuracy: location.accuracy,
    address: location.address,
    captured_at: location.capturedAt,
  });
  if (historyError) throw historyError;
}

export async function updateAlertStatus(alertId: string, response: 'pending' | 'received' | 'transit' | 'treatment_started' | 'resolved', notes?: string) {
  const updates: Record<string, unknown> = { hospital_response: response };
  if (notes !== undefined) updates.notes = notes;
  if (response === 'resolved') updates.resolved_at = new Date().toISOString();
  const { data, error } = await supabase.from('alerts').update(updates).eq('id', alertId).select().maybeSingle();
  if (error) throw error;
  return data;
}

async function findNearestHospital(location: LocationData | null): Promise<string | null> {
  const { data: hospitals } = await supabase.from('hospitals').select('user_id').eq('is_approved', true);
  if (!hospitals?.length) return null;
  if (!location) return hospitals[0].user_id;
  const ids = hospitals.map((hospital) => hospital.user_id);
  const { data: profiles } = await supabase.from('profiles').select('id, latitude, longitude').in('id', ids);
  const candidates = (profiles || []).filter((profile) => profile.latitude !== null && profile.longitude !== null);
  if (!candidates.length) return hospitals[0].user_id;
  candidates.sort((a, b) => distanceKm(location.lat, location.lng, a.latitude as number, a.longitude as number) - distanceKm(location.lat, location.lng, b.latitude as number, b.longitude as number));
  return candidates[0].id;
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radians = (value: number) => value * Math.PI / 180;
  const a = Math.sin(radians(lat2 - lat1) / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(radians(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function enqueue(item: SyncQueueItem): Promise<void> {
  await putStoreItem('syncQueue', item);
}
