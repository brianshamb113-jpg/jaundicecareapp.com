import { useState, useEffect, useCallback } from 'react';
import { Loader2, Clock, CheckCircle, Activity, MapPin, Phone, Navigation, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { updateAlertStatus } from '../services/scanService';
import { mapsUrl } from '../services/locationService';
import type { Alert, Hospital, Scan, Profile } from '../types';

const RESPONSE_LABELS: Record<string, string> = {
  pending: 'Pending',
  received: 'Received',
  transit: 'In Transit',
  treatment_started: 'Treatment Started',
  resolved: 'Resolved',
};

const RESPONSE_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  received: 'bg-blue-100 text-blue-700',
  transit: 'bg-amber-100 text-amber-700',
  treatment_started: 'bg-purple-100 text-purple-700',
  resolved: 'bg-green-100 text-green-700',
};

interface LocationUpdate {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  address: string;
  captured_at: string;
}

export default function HospitalDashboard() {
  const { user, profile } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [parentProfiles, setParentProfiles] = useState<Record<string, Profile>>({});

  const loadAlerts = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [alertsRes, hospitalRes] = await Promise.all([
      supabase
        .from('alerts')
        .select('*, scan:scans(*)')
        .eq('hospital_user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('hospitals').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    setAlerts((alertsRes.data as Alert[]) || []);
    setHospital(hospitalRes.data as Hospital);

    const parentIds = [...new Set((alertsRes.data as Alert[] || []).map((a) => a.parent_id))];
    if (parentIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', parentIds);
      const profileMap: Record<string, Profile> = {};
      (profiles as Profile[] || []).forEach((p) => { profileMap[p.id] = p; });
      setParentProfiles(profileMap);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadAlerts();

    const channel = supabase
      .channel('alerts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts', filter: `hospital_user_id=eq.${user?.id}` }, () => {
        loadAlerts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadAlerts, user]);

  const handleUpdateStatus = async (alertId: string, status: typeof RESPONSE_LABELS[keyof typeof RESPONSE_LABELS]) => {
    await updateAlertStatus(alertId, status as Alert['hospital_response']);
    loadAlerts();
    if (selectedAlert?.id === alertId) {
      setSelectedAlert(null);
    }
  };

  const pendingCount = alerts.filter((a) => a.hospital_response === 'pending').length;
  const activeCount = alerts.filter((a) => a.hospital_response !== 'resolved' && a.hospital_response !== 'pending').length;
  const resolvedCount = alerts.filter((a) => a.hospital_response === 'resolved').length;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F6E56]" />
      </div>
    );
  }

  return (
    <div className="pb-28">
      <div className="sticky top-0 z-40 bg-[#0F6E56] text-white p-6 pt-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <Activity className="w-5 h-5 text-[#0F6E56]" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{hospital?.facility_name || 'Hospital Dashboard'}</h1>
            <p className="text-sm opacity-90">{profile?.full_name || ''}</p>
          </div>
        </div>
        {!hospital?.is_approved && (
          <div className="bg-amber-500/20 border border-amber-300/30 rounded-lg p-2 mt-2 text-xs">
            Your facility is pending admin approval. You can view alerts but full functionality requires approval.
          </div>
        )}
      </div>

      <div className="p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Pending" value={pendingCount} color="text-[#BA7517]" bg="bg-amber-50" />
          <StatCard label="Active" value={activeCount} color="text-[#185FA5]" bg="bg-blue-50" />
          <StatCard label="Resolved" value={resolvedCount} color="text-[#27500A]" bg="bg-green-50" />
        </div>

        {/* Alerts List */}
        <div>
          <h2 className="font-bold text-[#1A1A1A] mb-3">Incoming Alerts</h2>
          {alerts.length === 0 ? (
            <div className="bg-[#E1F5EE] rounded-xl p-6 text-center">
              <CheckCircle className="w-8 h-8 text-[#0F6E56] mx-auto mb-2" />
              <p className="text-[#5F5E5A] text-sm">No alerts received yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => {
                const parent = parentProfiles[alert.parent_id];
                const hasGps = alert.latitude !== null && alert.longitude !== null;
                return (
                  <button
                    key={alert.id}
                    onClick={() => setSelectedAlert(alert)}
                    className="w-full bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-[#0F6E56] transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-[#1A1A1A]">{parent?.full_name || 'Unknown parent'}</div>
                        <p className="text-xs text-[#5F5E5A]">{parent?.phone || ''}</p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${RESPONSE_COLORS[alert.hospital_response]}`}>
                        {RESPONSE_LABELS[alert.hospital_response]}
                      </span>
                    </div>
                    {alert.scan && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[#A32D2D] font-bold">{alert.scan.risk_level} Risk</span>
                        <span className="text-xs text-[#5F5E5A] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(alert.created_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {hasGps && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-[#0F6E56]">
                        <Navigation className="w-3 h-3" />
                        <span>GPS location available</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          parentProfile={parentProfiles[selectedAlert.parent_id]}
          onUpdateStatus={(status) => handleUpdateStatus(selectedAlert.id, status)}
          onClose={() => setSelectedAlert(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-2xl p-4 text-center`}>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-[#5F5E5A] mt-1">{label}</p>
    </div>
  );
}

function AlertDetailModal({
  alert,
  parentProfile,
  onUpdateStatus,
  onClose,
}: {
  alert: Alert;
  parentProfile?: Profile;
  onUpdateStatus: (status: Alert['hospital_response']) => void;
  onClose: () => void;
}) {
  const scan = alert.scan as Scan | undefined;
  const [locationUpdates, setLocationUpdates] = useState<LocationUpdate[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);

  const hasGps = alert.latitude !== null && alert.longitude !== null;

  useEffect(() => {
    if (!hasGps) return;
    setLoadingUpdates(true);
    supabase
      .from('alert_location_updates')
      .select('*')
      .eq('alert_id', alert.id)
      .order('captured_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setLocationUpdates((data as LocationUpdate[]) || []);
        setLoadingUpdates(false);
      });
  }, [alert.id, hasGps]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h3 className="font-bold text-[#1A1A1A]">Alert Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Parent Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="font-bold text-sm text-[#1A1A1A]">Parent / Guardian</h4>
            <p className="text-sm text-[#5F5E5A]"><strong>Name:</strong> {parentProfile?.full_name || 'Unknown'}</p>
            <p className="text-sm text-[#5F5E5A] flex items-center gap-1"><Phone className="w-3 h-3" /> {parentProfile?.phone || 'N/A'}</p>
            <p className="text-sm text-[#5F5E5A] flex items-center gap-1"><MapPin className="w-3 h-3" /> {parentProfile?.city || ''}, {parentProfile?.district || ''}</p>
          </div>

          {/* Emergency GPS Location */}
          {hasGps ? (
            <div className="bg-[#FAECE7] border border-[#A32D2D]/20 rounded-lg p-4 space-y-3">
              <h4 className="font-bold text-sm text-[#A32D2D] flex items-center gap-1.5">
                <Navigation className="w-4 h-4" /> Emergency Location
              </h4>
              <div className="space-y-1 text-sm text-[#1A1A1A]">
                <p><strong>Coordinates:</strong> {alert.latitude?.toFixed(5)}, {alert.longitude?.toFixed(5)}</p>
                {alert.location_accuracy !== null && <p><strong>GPS Accuracy:</strong> ±{Math.round(alert.location_accuracy)} meters</p>}
                {alert.location_address && <p><strong>Address:</strong> {alert.location_address}</p>}
                {alert.location_updated_at && (
                  <p><strong>Last updated:</strong> {new Date(alert.location_updated_at).toLocaleString()}</p>
                )}
              </div>
              <a
                href={mapsUrl({ lat: alert.latitude!, lng: alert.longitude! })}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#A32D2D] hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Open in Google Maps
              </a>

              {/* Location history trail */}
              {locationUpdates.length > 0 && (
                <div className="border-t border-[#A32D2D]/10 pt-3">
                  <p className="text-xs font-bold text-[#1A1A1A] mb-2">Location History ({locationUpdates.length})</p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {locationUpdates.map((update) => (
                      <div key={update.id} className="flex items-center gap-2 text-xs text-[#5F5E5A]">
                        <MapPin className="w-3 h-3 text-[#A32D2D] flex-shrink-0" />
                        <span>{update.latitude.toFixed(4)}, {update.longitude.toFixed(4)}</span>
                        <span className="ml-auto">{new Date(update.captured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {loadingUpdates && (
                <div className="flex items-center gap-2 text-xs text-[#5F5E5A]">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading location history...
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-[#5F5E5A] flex items-center gap-2">
              <MapPin className="w-4 h-4" /> No GPS coordinates available for this alert.
            </div>
          )}

          {/* Scan Info */}
          {scan && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="font-bold text-sm text-[#1A1A1A]">Scan Result</h4>
              {scan.image_url && (
                <img src={scan.image_url} alt="Scan" className="w-full rounded-lg border border-gray-200 mb-2" />
              )}
              <p className="text-sm"><strong>Risk Level:</strong> <span className="text-[#A32D2D] font-bold">{scan.risk_level}</span></p>
              <p className="text-sm"><strong>Confidence:</strong> {scan.confidence_score}%</p>
              <p className="text-sm"><strong>Date:</strong> {new Date(scan.scan_date).toLocaleString()}</p>
              {scan.is_offline && (
                <p className="text-xs text-[#BA7517] bg-amber-50 inline-block px-2 py-1 rounded">Offline scan (synced)</p>
              )}
              {/* Scan GPS location */}
              {scan.latitude !== null && scan.longitude !== null && (
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <p className="text-xs font-bold text-[#1A1A1A] mb-1">Scan Location</p>
                  <p className="text-xs text-[#5F5E5A]">{scan.latitude.toFixed(5)}, {scan.longitude.toFixed(5)}</p>
                  {scan.location_address && <p className="text-xs text-[#5F5E5A]">{scan.location_address}</p>}
                  <a
                    href={mapsUrl({ lat: scan.latitude, lng: scan.longitude })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#185FA5] font-semibold hover:underline flex items-center gap-1 mt-1"
                  >
                    <ExternalLink className="w-3 h-3" /> View on Google Maps
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Status Update */}
          <div>
            <h4 className="font-bold text-sm text-[#1A1A1A] mb-2">Update Status</h4>
            <div className="grid grid-cols-2 gap-2">
              {(['pending', 'received', 'transit', 'treatment_started', 'resolved'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => onUpdateStatus(status)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    alert.hospital_response === status
                      ? 'bg-[#0F6E56] text-white'
                      : 'bg-gray-100 text-[#1A1A1A] hover:bg-gray-200'
                  }`}
                >
                  {RESPONSE_LABELS[status]}
                </button>
              ))}
            </div>
          </div>

          {/* Response Time */}
          {alert.response_time && (
            <div className="bg-blue-50 rounded-lg p-3 text-sm text-[#1A1A1A]">
              <strong>Response Time:</strong> {alert.response_time} minutes
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
