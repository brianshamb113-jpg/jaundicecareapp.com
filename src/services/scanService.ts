import { supabase } from '../lib/supabase';

export async function uploadScanImage(
  imageBase64: string,
  parentId: string
): Promise<string | null> {
  try {
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    const byteString = atob(base64Data);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([uint8Array], { type: 'image/jpeg' });
    const timestamp = Date.now();
    const path = `scans/${parentId}/${timestamp}/scan.jpg`;

    const { error } = await supabase.storage
      .from('scans')
      .upload(path, blob, { contentType: 'image/jpeg' });

    if (error) {
      console.warn('Image upload failed, continuing without cloud storage');
      return null;
    }

    const { data: urlData } = supabase.storage.from('scans').getPublicUrl(path);
    return urlData.publicUrl;
  } catch {
    return null;
  }
}

export async function saveScanToDb(params: {
  babyId: string | null;
  parentId: string;
  imageUrl: string | null;
  imagePath: string | null;
  riskLevel: 'High' | 'Medium' | 'Low';
  confidenceScore: number;
  isOffline: boolean;
}) {
  const { data, error } = await supabase
    .from('scans')
    .insert({
      baby_id: params.babyId,
      parent_id: params.parentId,
      image_url: params.imageUrl,
      image_path: params.imagePath,
      risk_level: params.riskLevel,
      confidence_score: params.confidenceScore,
      is_offline: params.isOffline,
      synced_at: params.isOffline ? null : new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createAlertForHighRiskScan(scanId: string, parentId: string) {
  // Find approved hospitals to assign the alert to
  const { data: hospitals } = await supabase
    .from('hospitals')
    .select('user_id, facility_name')
    .eq('is_approved', true)
    .limit(1);

  const hospitalUserId = hospitals && hospitals.length > 0 ? hospitals[0].user_id : null;

  const { data, error } = await supabase
    .from('alerts')
    .insert({
      scan_id: scanId,
      parent_id: parentId,
      hospital_user_id: hospitalUserId,
      hospital_notified: !!hospitalUserId,
      admin_notified: true,
      sent_via: 'in_app',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAlertStatus(
  alertId: string,
  response: 'pending' | 'received' | 'transit' | 'treatment_started' | 'resolved',
  notes?: string
) {
  const updates: Record<string, unknown> = {
    hospital_response: response,
  };
  if (notes !== undefined) updates.notes = notes;
  if (response === 'resolved') {
    updates.resolved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('alerts')
    .update(updates)
    .eq('id', alertId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
