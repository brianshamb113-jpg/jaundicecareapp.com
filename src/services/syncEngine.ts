import { supabase } from '../lib/supabase';
import { deleteStoreItem, getStoreItems, putStoreItem, type OfflineAlert, type OfflineScan, type SyncQueueItem } from './offlineDb';
import { uploadScanImage } from './scanService';

let syncInProgress = false;

export async function syncOfflineData(): Promise<{ synced: number; pending: number }> {
  if (!navigator.onLine || syncInProgress) return { synced: 0, pending: 0 };
  syncInProgress = true;
  let synced = 0;
  try {
    const queue = await getStoreItems<SyncQueueItem>('syncQueue');
    const due = queue.filter((item) => new Date(item.nextAttemptAt).getTime() <= Date.now());
    for (const item of due.sort((a, b) => priority(a.type) - priority(b.type))) {
      try {
        if (item.type === 'scan') await syncScan(item.recordId);
        if (item.type === 'alert') await syncAlert(item.recordId);
        await deleteStoreItem('syncQueue', item.id);
        synced += 1;
      } catch {
        const attempts = item.attempts + 1;
        await putStoreItem('syncQueue', {
          ...item,
          attempts,
          nextAttemptAt: new Date(Date.now() + Math.min(60 * 60 * 1000, 1000 * 2 ** attempts)).toISOString(),
        });
      }
    }
    return { synced, pending: Math.max(0, queue.length - synced) };
  } finally {
    syncInProgress = false;
  }
}

async function syncScan(recordId: string): Promise<void> {
  const scan = await getStoreItems<OfflineScan>('scans').then((items) => items.find((item) => item.id === recordId));
  if (!scan) return;
  const imageUrl = scan.imageData ? await uploadScanImage(scan.imageData, scan.parentId) : null;
  const { error } = await supabase.from('scans').insert({
    id: scan.id,
    baby_id: scan.babyId || null,
    parent_id: scan.parentId,
    image_url: imageUrl,
    image_path: scan.imagePath || null,
    risk_level: scan.riskLevel,
    confidence_score: scan.confidenceScore,
    scan_date: scan.scanDate,
    is_offline: true,
    synced_at: new Date().toISOString(),
    latitude: scan.location?.lat ?? null,
    longitude: scan.location?.lng ?? null,
    location_accuracy: scan.location?.accuracy ?? null,
    location_address: scan.location?.address ?? null,
    location_captured_at: scan.scanDate,
  });
  if (error && !error.message.includes('duplicate key')) throw error;
  await deleteStoreItem('scans', recordId);
}

async function syncAlert(recordId: string): Promise<void> {
  const alert = await getStoreItems<OfflineAlert>('alerts').then((items) => items.find((item) => item.id === recordId));
  if (!alert) return;
  const { error } = await supabase.from('alerts').insert({
    id: alert.id,
    scan_id: alert.scanId,
    parent_id: alert.parentId,
    hospital_user_id: alert.hospitalId,
    hospital_notified: false,
    admin_notified: true,
    sent_via: 'in_app',
    latitude: alert.location?.lat ?? null,
    longitude: alert.location?.lng ?? null,
    location_accuracy: alert.location?.accuracy ?? null,
    location_address: alert.location?.address ?? null,
    location_updated_at: alert.createdAt,
  });
  if (error && !error.message.includes('duplicate key')) throw error;
  await deleteStoreItem('alerts', recordId);
}

function priority(type: SyncQueueItem['type']): number {
  return type === 'alert' ? 0 : type === 'scan' ? 1 : 2;
}
