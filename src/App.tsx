import React, { useState, useEffect, useRef } from 'react';
import { Home, Camera, FileText, Send, Settings, ChevronRight, AlertCircle, CheckCircle, X, Plus, Download, Trash2, Share2, ArrowLeft } from 'lucide-react';

// Types
interface ScreeningRecord {
  id: string;
  babyId: string;
  motherName: string;
  ageHours: number;
  birthWeight: number;
  gestationalAge: string;
  bilirubin: number;
  status: 'Normal' | 'Monitor' | 'Refer Urgently';
  ward: string;
  workerName: string;
  notes: string;
  timestamp: number;
  imageBase64: string;
}

interface ReferralRecord {
  id: string;
  screeningId: string;
  referralDate: number;
  referredTo: string;
  actionsTaken: string[];
}

interface AppSettings {
  workerName: string;
  facilityName: string;
  referralHospital: string;
  soundAlerts: boolean;
}

interface ScanState {
  step: number;
  babyId: string;
  motherName: string;
  ageHours: number;
  ageUnit: 'Hours' | 'Days';
  birthWeight: number;
  gestationalAge: string;
  ward: string;
  workerName: string;
  notes: string;
  capturedImage: string | null;
  bilirubin: number | null;
  imageFile: File | null;
}

// Utility functions
const generateBabyId = () => `JC-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

const generateBilirubin = (): { value: number; status: 'Normal' | 'Monitor' | 'Refer Urgently' } => {
  const rand = Math.random();
  let value: number;
  let status: 'Normal' | 'Monitor' | 'Refer Urgently';

  if (rand < 0.5) {
    value = 5.0 + Math.random() * 6.9;
    status = 'Normal';
  } else if (rand < 0.8) {
    value = 12.0 + Math.random() * 4.9;
    status = 'Monitor';
  } else {
    value = 17.0 + Math.random() * 5.0;
    status = 'Refer Urgently';
  }

  return { value: parseFloat(value.toFixed(1)), status };
};

const getBiliColor = (status: string) => {
  switch(status) {
    case 'Normal': return 'text-[#27500A] bg-green-50';
    case 'Monitor': return 'text-[#BA7517] bg-yellow-50';
    case 'Refer Urgently': return 'text-[#A32D2D] bg-red-50';
    default: return 'text-gray-800 bg-gray-50';
  }
};

const getStatusBadgeColor = (status: string) => {
  switch(status) {
    case 'Normal': return 'bg-[#27500A] text-white';
    case 'Monitor': return 'bg-[#BA7517] text-white';
    case 'Refer Urgently': return 'bg-[#A32D2D] text-white';
    default: return 'bg-gray-500 text-white';
  }
};

// Home Screen
interface Announcement {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  is_published: boolean;
  created_at: number;
}

const HomeScreen: React.FC<{
  records: ScreeningRecord[];
  referrals: ReferralRecord[];
  onStartScan: () => void;
  onSelectRecord: (record: ScreeningRecord) => void;
}> = ({ records, referrals, onStartScan, onSelectRecord }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const announcements: Announcement[] = (() => {
    try {
      const raw = localStorage.getItem('jc_announcements');
      return raw ? (JSON.parse(raw) as Announcement[]).filter(a => a.is_published) : [];
    } catch {
      return [];
    }
  })();

  const criticalBanners = announcements.filter(a => a.priority === 'Critical');
  const cardAnnouncements = announcements.filter(a => a.priority !== 'Critical');

  const screeningsToday = records.filter(r => new Date(r.timestamp).toDateString() === today.toDateString()).length;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const screeningsWeek = records.filter(r => r.timestamp >= weekAgo.getTime()).length;

  const recentRecords = records.slice(-5).reverse();

  return (
    <div className="pb-28">
      {/* Critical banners */}
      {criticalBanners.map(ann => (
        <div key={ann.id} className="bg-[#A32D2D] text-white px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">{ann.title}</p>
            {ann.body && <p className="text-xs opacity-90 mt-0.5">{ann.body}</p>}
          </div>
        </div>
      ))}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0F6E56] text-white p-6 pt-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <div className="text-[#0F6E56] font-bold text-lg">☀</div>
          </div>
          <div>
            <h1 className="text-2xl font-bold">JaundiceCARE</h1>
            <p className="text-sm opacity-90">Neonatal Screening Tool</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#E1F5EE] rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-[#0F6E56]">{screeningsToday}</p>
            <p className="text-xs text-[#5F5E5A] mt-1">Today</p>
          </div>
          <div className="bg-[#E1F5EE] rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-[#0F6E56]">{screeningsWeek}</p>
            <p className="text-xs text-[#5F5E5A] mt-1">This week</p>
          </div>
          <div className="bg-[#E1F5EE] rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-[#0F6E56]">{referrals.length}</p>
            <p className="text-xs text-[#5F5E5A] mt-1">Referrals</p>
          </div>
        </div>

        {/* Announcements */}
        {cardAnnouncements.length > 0 && (
          <div>
            <h2 className="font-bold text-[#1A1A1A] mb-2 text-sm">Announcements</h2>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {cardAnnouncements.map(ann => (
                <div
                  key={ann.id}
                  className="flex-shrink-0 w-64 bg-white border border-[#E5E3DC] rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      ann.priority === 'High' ? 'bg-[#FAEEDA] text-[#BA7517]' :
                      ann.priority === 'Critical' ? 'bg-[#FAECE7] text-[#A32D2D]' :
                      'bg-[#E1F5EE] text-[#0F6E56]'
                    }`}>
                      {ann.priority}
                    </span>
                    <span className="text-[10px] text-[#5F5E5A]">{ann.category}</span>
                  </div>
                  <p className="font-semibold text-sm text-[#1A1A1A] mb-1">{ann.title}</p>
                  {ann.body && <p className="text-xs text-[#5F5E5A] line-clamp-2">{ann.body}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Start Screening Button */}
        <button
          onClick={onStartScan}
          className="w-full bg-[#0F6E56] hover:bg-[#0d5844] text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
        >
          <Plus className="w-5 h-5 inline mr-2" />
          Start New Screening
        </button>

        {/* Recent Screenings */}
        <div>
          <h2 className="font-bold text-[#1A1A1A] mb-3">Recent Screenings</h2>
          {recentRecords.length === 0 ? (
            <div className="bg-[#E1F5EE] rounded-xl p-6 text-center">
              <p className="text-[#5F5E5A] text-sm">No screenings recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentRecords.map(record => (
                <button
                  key={record.id}
                  onClick={() => onSelectRecord(record)}
                  className="w-full bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-[#0F6E56] transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-[#1A1A1A]">{record.babyId}</div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusBadgeColor(record.status)}`}>
                      {record.status === 'Normal' ? 'NORMAL' : record.status === 'Monitor' ? 'MONITOR' : 'REFER'}
                    </span>
                  </div>
                  <p className="text-sm text-[#5F5E5A] mb-2">{record.motherName}</p>
                  <div className="flex justify-between items-center">
                    <span className={`font-bold text-lg ${getBiliColor(record.status)}`}>
                      {record.bilirubin} mg/dL
                    </span>
                    <span className="text-xs text-[#5F5E5A]">
                      {new Date(record.timestamp).toLocaleDateString()} {new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-[#185FA5] rounded-xl p-4">
          <p className="text-xs text-[#1A1A1A] leading-relaxed">
            <strong>About JaundiceCARE:</strong> This tool uses smartphone colour analysis with a calibration card to estimate bilirubin levels in newborns. Always confirm critical results with laboratory TSB testing.
          </p>
        </div>
      </div>
    </div>
  );
};

// Scan Screen - Step 1
const ScanStep1: React.FC<{
  scan: ScanState;
  setScan: (s: ScanState) => void;
  settings: AppSettings;
}> = ({ scan, setScan, settings }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Baby ID *</label>
        <input
          type="text"
          value={scan.babyId}
          onChange={(e) => setScan({...scan, babyId: e.target.value})}
          placeholder="Auto-generated"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Mother's Name *</label>
        <input
          type="text"
          value={scan.motherName}
          onChange={(e) => setScan({...scan, motherName: e.target.value})}
          placeholder="Enter mother's name"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Age of Baby *</label>
          <input
            type="number"
            value={scan.ageHours || ''}
            onChange={(e) => setScan({...scan, ageHours: parseInt(e.target.value) || 0})}
            placeholder="0"
            min="0"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Unit *</label>
          <select
            value={scan.ageUnit}
            onChange={(e) => setScan({...scan, ageUnit: e.target.value as 'Hours' | 'Days'})}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
          >
            <option value="Hours">Hours</option>
            <option value="Days">Days</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Birth Weight (grams) *</label>
        <input
          type="number"
          value={scan.birthWeight || ''}
          onChange={(e) => setScan({...scan, birthWeight: parseInt(e.target.value) || 0})}
          placeholder="3000"
          min="0"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Gestational Age at Birth *</label>
        <select
          value={scan.gestationalAge}
          onChange={(e) => setScan({...scan, gestationalAge: e.target.value})}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
        >
          <option value="">Select...</option>
          <option value="35">35 weeks</option>
          <option value="36">36 weeks</option>
          <option value="37">37 weeks</option>
          <option value="38">38 weeks</option>
          <option value="39">39 weeks</option>
          <option value="40+">40+ weeks</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Ward / Facility Name *</label>
        <input
          type="text"
          value={scan.ward}
          onChange={(e) => setScan({...scan, ward: e.target.value})}
          placeholder={settings.facilityName || "Enter facility name"}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Healthcare Worker Name *</label>
        <input
          type="text"
          value={scan.workerName}
          onChange={(e) => setScan({...scan, workerName: e.target.value})}
          placeholder={settings.workerName || "Your name"}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Clinical Notes (optional)</label>
        <textarea
          value={scan.notes}
          onChange={(e) => setScan({...scan, notes: e.target.value})}
          placeholder="Any additional clinical observations..."
          rows={3}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
        />
      </div>
    </div>
  );
};

// Scan Screen - Step 2
const ScanStep2: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-6 space-y-4">
        <svg viewBox="0 0 200 250" className="w-full max-w-xs mx-auto mb-4">
          {/* Baby simplified outline */}
          <circle cx="100" cy="80" r="20" fill="none" stroke="#0F6E56" strokeWidth="2"/>
          <path d="M 100 100 Q 95 130 90 160 L 110 160 Q 105 130 100 100" fill="none" stroke="#0F6E56" strokeWidth="2"/>

          {/* Calibration card */}
          <rect x="75" y="115" width="50" height="30" fill="none" stroke="#BA7517" strokeWidth="2" strokeDasharray="4"/>
          <text x="100" y="135" textAnchor="middle" fontSize="10" fill="#BA7517" fontWeight="bold">CARD</text>

          {/* Phone/camera */}
          <path d="M 85 20 L 115 20 L 115 35 L 85 35 Z" fill="none" stroke="#185FA5" strokeWidth="2"/>
          <circle cx="100" cy="27" r="3" fill="#185FA5"/>

          {/* Distance indicator */}
          <line x1="120" y1="27" x2="120" y2="115" stroke="#27500A" strokeWidth="2" strokeDasharray="3"/>
          <text x="135" y="75" fontSize="10" fill="#27500A" fontWeight="bold">20cm</text>
        </svg>

        <div className="space-y-3">
          <h3 className="font-bold text-[#1A1A1A] text-lg">Calibration Card Placement</h3>
          <ol className="text-sm text-[#1A1A1A] space-y-2 list-decimal list-inside">
            <li>Place the Picterus calibration card flat on the baby's chest</li>
            <li>Ensure no shadows fall across the card or skin</li>
            <li>Hold phone camera 20cm above, perpendicular to skin</li>
            <li>Ensure the area is well lit (natural light or ceiling light)</li>
            <li>Keep the baby still during capture</li>
          </ol>
        </div>

        <div className="bg-amber-50 border-2 border-[#BA7517] rounded-lg p-3 flex gap-2">
          <AlertCircle className="w-5 h-5 text-[#BA7517] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#1A1A1A]">Do not proceed without the calibration card. Results without proper placement will be inaccurate.</p>
        </div>
      </div>
    </div>
  );
};

// Camera component
const CameraCapture: React.FC<{
  onCapture: (imageBase64: string) => void;
  onCancel: () => void;
}> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        alert('Camera not available. Please check permissions.');
      }
    };
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capture = () => {
    if (canvasRef.current && videoRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, -videoRef.current.videoWidth, 0);
        const imageData = canvasRef.current.toDataURL('image/jpeg', 0.7);
        setCapturedImage(imageData);
      }
    }
  };

  if (capturedImage) {
    return (
      <div className="space-y-4">
        <img src={capturedImage} alt="Captured" className="w-full rounded-lg border-2 border-gray-300" />
        <div className="flex gap-3">
          <button
            onClick={() => setCapturedImage(null)}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-[#1A1A1A] font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Retake
          </button>
          <button
            onClick={() => onCapture(capturedImage)}
            className="flex-1 bg-[#0F6E56] hover:bg-[#0d5844] text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Analyse
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Guide frame overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="border-2 border-white opacity-50 w-3/4 h-2/3 rounded-lg"></div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-300 hover:bg-gray-400 text-[#1A1A1A] font-bold py-3 px-4 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={capture}
          className="flex-1 bg-white hover:bg-gray-100 text-[#1A1A1A] font-bold py-3 px-4 rounded-lg border-2 border-[#0F6E56] transition-colors"
        >
          Capture
        </button>
      </div>
    </div>
  );
};

// Scan Screen - Step 3
const ScanStep3: React.FC<{
  onImageCapture: (image: string) => void;
  onBack: () => void;
}> = ({ onImageCapture, onBack }) => {
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="text-[#185FA5] font-semibold text-sm flex items-center gap-1 mb-2"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <CameraCapture
        onCapture={onImageCapture}
        onCancel={onBack}
      />
    </div>
  );
};

// Scan Screen - Step 4
const ScanStep4: React.FC<{
  scan: ScanState;
  onSaveRecord: (record: ScreeningRecord) => void;
  onCompleteReferral: () => void;
  onNewScan: () => void;
}> = ({ scan, onSaveRecord, onCompleteReferral, onNewScan }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [result, setResult] = useState<{ value: number; status: 'Normal' | 'Monitor' | 'Refer Urgently' } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const analysisResult = generateBilirubin();
      setResult(analysisResult);
      setIsAnalyzing(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-full border-4 border-[#0F6E56] border-t-transparent animate-pulse-slow mb-4"></div>
        <p className="text-[#5F5E5A] font-semibold">Analysing image...</p>
      </div>
    );
  }

  if (!result) return null;

  const guidance = {
    'Normal': 'Bilirubin within safe range. No immediate treatment required. Re-screen in 24 hours if jaundice is clinically visible.',
    'Monitor': 'Bilirubin approaching clinical threshold. Initiate monitoring every 6–8 hours. Prepare for phototherapy if levels rise above 17 mg/dL.',
    'Refer Urgently': 'Bilirubin at critical level. Initiate phototherapy IMMEDIATELY. Perform confirmatory TSB lab test. Contact the attending neonatologist. Complete referral form now.'
  };

  const handleSave = () => {
    const record: ScreeningRecord = {
      id: `${Date.now()}`,
      babyId: scan.babyId,
      motherName: scan.motherName,
      ageHours: scan.ageUnit === 'Hours' ? scan.ageHours : scan.ageHours * 24,
      birthWeight: scan.birthWeight,
      gestationalAge: scan.gestationalAge,
      bilirubin: result.value,
      status: result.status,
      ward: scan.ward,
      workerName: scan.workerName,
      notes: scan.notes,
      timestamp: Date.now(),
      imageBase64: scan.capturedImage || ''
    };
    onSaveRecord(record);
  };

  return (
    <div className="space-y-4">
      <div className={`rounded-xl p-6 text-center ${getBiliColor(result.status)}`}>
        <p className="text-xs font-semibold text-[#5F5E5A] mb-2">ESTIMATED BILIRUBIN</p>
        <p className="text-5xl font-bold mb-1">{result.value}</p>
        <p className="text-sm">mg/dL</p>
      </div>

      <div className={`rounded-xl p-4 font-bold text-center text-white ${getStatusBadgeColor(result.status)}`}>
        {result.status === 'Normal' ? 'NORMAL' : result.status === 'Monitor' ? 'MONITOR CLOSELY' : 'REFER URGENTLY'}
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <p className="text-xs text-[#1A1A1A] leading-relaxed">{guidance[result.status]}</p>
      </div>

      {scan.capturedImage && (
        <div className="flex justify-center">
          <img src={scan.capturedImage} alt="Captured scan" className="w-20 h-20 rounded-lg border-2 border-gray-300 object-cover" />
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
        <p><strong>Baby ID:</strong> {scan.babyId}</p>
        <p><strong>Mother:</strong> {scan.motherName}</p>
        <p><strong>Age:</strong> {scan.ageHours} {scan.ageUnit}</p>
        <p><strong>Ward:</strong> {scan.ward}</p>
        <p><strong>Time:</strong> {new Date().toLocaleString()}</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
        <p className="text-[#1A1A1A]"><strong>Disclaimer:</strong> This is a screening estimate only. Always confirm critical results with laboratory total serum bilirubin (TSB) testing.</p>
      </div>

      <div className="space-y-2">
        <button
          onClick={handleSave}
          className="w-full bg-[#0F6E56] hover:bg-[#0d5844] text-white font-bold py-3 px-4 rounded-lg transition-colors"
        >
          Save Record
        </button>
        {result.status !== 'Normal' && (
          <button
            onClick={onCompleteReferral}
            className="w-full bg-[#185FA5] hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Complete Referral Form
          </button>
        )}
        <button
          onClick={onNewScan}
          className="w-full bg-gray-300 hover:bg-gray-400 text-[#1A1A1A] font-bold py-3 px-4 rounded-lg transition-colors"
        >
          New Screening
        </button>
      </div>
    </div>
  );
};

// Scan Screen Container
const ScanScreen: React.FC<{
  records: ScreeningRecord[];
  referrals: ReferralRecord[];
  settings: AppSettings;
  onRecordSaved: (record: ScreeningRecord) => void;
  onNavigateToRefer: (record: ScreeningRecord) => void;
  onBackHome: () => void;
}> = ({ records, referrals, settings, onRecordSaved, onNavigateToRefer, onBackHome }) => {
  const [step, setStep] = useState(1);
  const [scan, setScan] = useState<ScanState>({
    step: 1,
    babyId: generateBabyId(),
    motherName: '',
    ageHours: 0,
    ageUnit: 'Hours',
    birthWeight: 0,
    gestationalAge: '',
    ward: settings.facilityName,
    workerName: settings.workerName,
    notes: '',
    capturedImage: null,
    bilirubin: null,
    imageFile: null
  });

  const canProceed = step === 1 ?
    (scan.babyId && scan.motherName && scan.ageHours > 0 && scan.birthWeight > 0 && scan.gestationalAge && scan.ward && scan.workerName) :
    step === 2 ? true : step === 3 ? !!scan.capturedImage : true;

  const handleNextStep = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      // Camera will handle next
    }
  };

  const handleCapture = (imageBase64: string) => {
    setScan({...scan, capturedImage: imageBase64});
    setStep(4);
  };

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0F6E56] text-white p-4 rounded-b-xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBackHome} className="text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold">New Screening</h2>
          <div className="w-5"></div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span>Step {step} / 4</span>
          </div>
          <div className="h-1.5 bg-white bg-opacity-30 rounded-full overflow-hidden">
            <div className="h-full bg-white transition-all" style={{ width: `${(step / 4) * 100}%` }}></div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {step === 1 && <ScanStep1 scan={scan} setScan={setScan} settings={settings} />}
        {step === 2 && <ScanStep2 />}
        {step === 3 && <ScanStep3 onImageCapture={handleCapture} onBack={() => setStep(2)} />}
        {step === 4 && (
          <ScanStep4
            scan={scan}
            onSaveRecord={(record) => {
              onRecordSaved(record);
              onBackHome();
            }}
            onCompleteReferral={() => {
              if (scan.capturedImage) {
                const tempRecord: ScreeningRecord = {
                  id: `${Date.now()}`,
                  babyId: scan.babyId,
                  motherName: scan.motherName,
                  ageHours: scan.ageUnit === 'Hours' ? scan.ageHours : scan.ageHours * 24,
                  birthWeight: scan.birthWeight,
                  gestationalAge: scan.gestationalAge,
                  bilirubin: 0,
                  status: 'Monitor',
                  ward: scan.ward,
                  workerName: scan.workerName,
                  notes: scan.notes,
                  timestamp: Date.now(),
                  imageBase64: scan.capturedImage
                };
                onNavigateToRefer(tempRecord);
              }
            }}
            onNewScan={() => {
              setScan({
                step: 1,
                babyId: generateBabyId(),
                motherName: '',
                ageHours: 0,
                ageUnit: 'Hours',
                birthWeight: 0,
                gestationalAge: '',
                ward: settings.facilityName,
                workerName: settings.workerName,
                notes: '',
                capturedImage: null,
                bilirubin: null,
                imageFile: null
              });
              setStep(1);
            }}
          />
        )}

        {step < 4 && (
          <div className="flex gap-3 pt-4">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-[#1A1A1A] font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Back
              </button>
            )}
            {step < 3 && (
              <button
                onClick={handleNextStep}
                disabled={!canProceed}
                className="flex-1 bg-[#0F6E56] hover:bg-[#0d5844] disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                Next
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Records Screen
const RecordsScreen: React.FC<{
  records: ScreeningRecord[];
  onSelectRecord: (record: ScreeningRecord) => void;
}> = ({ records, onSelectRecord }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Normal' | 'Monitor' | 'Refer Urgently'>('All');
  const [selectedRecord, setSelectedRecord] = useState<ScreeningRecord | null>(null);

  const filteredRecords = records
    .filter(r => filter === 'All' || r.status === filter)
    .filter(r =>
      r.babyId.toLowerCase().includes(search.toLowerCase()) ||
      r.motherName.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => b.timestamp - a.timestamp);

  if (selectedRecord) {
    return (
      <div className="pb-28">
        <div className="sticky top-0 z-40 bg-[#0F6E56] text-white p-4 rounded-b-xl shadow-lg flex items-center justify-between">
          <button onClick={() => setSelectedRecord(null)} className="text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold">Record Details</h2>
          <div className="w-5"></div>
        </div>

        <div className="p-4 space-y-4">
          {selectedRecord.imageBase64 && (
            <img src={selectedRecord.imageBase64} alt="Scan" className="w-full rounded-lg border-2 border-gray-300" />
          )}

          <div className={`rounded-xl p-6 text-center ${getBiliColor(selectedRecord.status)}`}>
            <p className="text-sm font-semibold mb-1">BILIRUBIN LEVEL</p>
            <p className="text-4xl font-bold">{selectedRecord.bilirubin}</p>
            <p className="text-sm">mg/dL</p>
          </div>

          <div className={`rounded-xl p-3 font-bold text-center text-white text-sm ${getStatusBadgeColor(selectedRecord.status)}`}>
            {selectedRecord.status === 'Normal' ? 'NORMAL' : selectedRecord.status === 'Monitor' ? 'MONITOR CLOSELY' : 'REFER URGENTLY'}
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <p><strong>Baby ID:</strong> {selectedRecord.babyId}</p>
            <p><strong>Mother:</strong> {selectedRecord.motherName}</p>
            <p><strong>Age:</strong> {selectedRecord.ageHours} hours ({(selectedRecord.ageHours / 24).toFixed(1)} days)</p>
            <p><strong>Birth Weight:</strong> {selectedRecord.birthWeight}g</p>
            <p><strong>Gestational Age:</strong> {selectedRecord.gestationalAge} weeks</p>
            <p><strong>Ward:</strong> {selectedRecord.ward}</p>
            <p><strong>Worker:</strong> {selectedRecord.workerName}</p>
            <p><strong>Date/Time:</strong> {new Date(selectedRecord.timestamp).toLocaleString()}</p>
            {selectedRecord.notes && <p><strong>Notes:</strong> {selectedRecord.notes}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28">
      <div className="sticky top-0 z-40 bg-[#0F6E56] text-white p-4 rounded-b-xl shadow-lg">
        <h2 className="font-bold text-lg mb-4">Screening Records</h2>
        <input
          type="text"
          placeholder="Search by Baby ID or mother name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 rounded-lg text-[#1A1A1A]"
        />
      </div>

      <div className="p-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['All', 'Normal', 'Monitor', 'Refer Urgently'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
                filter === f
                  ? 'bg-[#0F6E56] text-white'
                  : 'bg-[#E1F5EE] text-[#0F6E56]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {filteredRecords.length === 0 ? (
          <div className="bg-[#E1F5EE] rounded-xl p-6 text-center">
            <p className="text-[#5F5E5A] text-sm">No records found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRecords.map(record => (
              <button
                key={record.id}
                onClick={() => setSelectedRecord(record)}
                className="w-full bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-[#0F6E56] transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-[#1A1A1A]">{record.babyId}</div>
                    <p className="text-xs text-[#5F5E5A]">{record.motherName}</p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusBadgeColor(record.status)}`}>
                    {record.status === 'Normal' ? 'NORMAL' : record.status === 'Monitor' ? 'MONITOR' : 'REFER'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className={`font-bold ${getBiliColor(record.status)}`}>
                    {record.bilirubin} mg/dL
                  </span>
                  <span className="text-xs text-[#5F5E5A]">
                    {new Date(record.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Referral Screen
const ReferralScreen: React.FC<{
  records: ScreeningRecord[];
  referrals: ReferralRecord[];
  settings: AppSettings;
  prefilledRecord?: ScreeningRecord;
  onBackHome: () => void;
}> = ({ records, referrals, settings, prefilledRecord, onBackHome }) => {
  const [selectedScreeningId, setSelectedScreeningId] = useState(prefilledRecord?.id || '');
  const [referredTo, setReferredTo] = useState(settings.referralHospital);
  const [actionsTaken, setActionsTaken] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);

  const screeningRecord = selectedScreeningId
    ? records.find(r => r.id === selectedScreeningId)
    : prefilledRecord;

  const referralId = `JCR-${Date.now()}`;

  const relevantRecords = records.filter(r => r.status !== 'Normal');

  const toggleAction = (action: string) => {
    setActionsTaken(prev =>
      prev.includes(action)
        ? prev.filter(a => a !== action)
        : [...prev, action]
    );
  };

  const generateReferralLetter = () => {
    if (!screeningRecord) return '';

    return `
JAUNDICECARE TANZANIA — NEONATAL REFERRAL LETTER

Date: ${new Date().toLocaleDateString()}
Reference: ${referralId}

─────────────────────────────────────────────

PATIENT INFORMATION
Baby ID: ${screeningRecord.babyId}
Mother: ${screeningRecord.motherName}
Age at Screening: ${screeningRecord.ageHours} hours
Birth Weight: ${screeningRecord.birthWeight}g
Gestational Age: ${screeningRecord.gestationalAge} weeks

SCREENING RESULTS
Bilirubin Level: ${screeningRecord.bilirubin} mg/dL
Status: ${screeningRecord.status}
Date of Screening: ${new Date(screeningRecord.timestamp).toLocaleString()}

REFERRAL DETAILS
Referring Facility: ${screeningRecord.ward}
Referred To: ${referredTo}
Referring Healthcare Worker: ${screeningRecord.workerName}

REASON FOR REFERRAL
${screeningRecord.status === 'Monitor'
  ? 'Bilirubin approaching phototherapy threshold. Monitoring required.'
  : 'Critical bilirubin level. Immediate phototherapy and confirmatory TSB required.'}

ACTIONS TAKEN
${actionsTaken.length > 0 ? actionsTaken.map(a => `✓ ${a}`).join('\n') : '• None yet'}

ADDITIONAL NOTES
${notes || 'None'}

─────────────────────────────────────────────

DISCLAIMER
This referral is based on smartphone-assisted bilirubin estimation and must be confirmed by laboratory TSB before final clinical decisions.

Generated by JaundiceCARE Tanzania
www.jaundicecare.org

Referred by: ${screeningRecord.workerName}
Facility: ${screeningRecord.ward}
Date: ${new Date().toLocaleDateString()}
    `.trim();
  };

  return (
    <div className="pb-28">
      <div className="sticky top-0 z-40 bg-[#0F6E56] text-white p-4 rounded-b-xl shadow-lg flex items-center justify-between">
        <button onClick={onBackHome} className="text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-bold">Referral Form</h2>
        <div className="w-5"></div>
      </div>

      <div className="p-4 space-y-4">
        {!prefilledRecord && (
          <div>
            <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Select Patient *</label>
            <select
              value={selectedScreeningId}
              onChange={(e) => setSelectedScreeningId(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
            >
              <option value="">Choose a patient...</option>
              {relevantRecords.map(r => (
                <option key={r.id} value={r.id}>
                  {r.babyId} - {r.motherName} ({r.bilirubin} mg/dL)
                </option>
              ))}
            </select>
          </div>
        )}

        {screeningRecord && (
          <>
            <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-sm">
              <p><strong>Baby ID:</strong> {screeningRecord.babyId}</p>
              <p><strong>Mother:</strong> {screeningRecord.motherName}</p>
              <p><strong>Bilirubin:</strong> {screeningRecord.bilirubin} mg/dL</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Referred To *</label>
              <input
                type="text"
                value={referredTo}
                onChange={(e) => setReferredTo(e.target.value)}
                placeholder="Hospital or physician name"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-3">Actions Taken</label>
              <div className="space-y-2">
                {['Started phototherapy', 'Performed TSB lab test', 'Contacted neonatologist', 'Notified family'].map(action => (
                  <label key={action} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={actionsTaken.includes(action)}
                      onChange={() => toggleAction(action)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-[#1A1A1A]">{action}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Additional Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional clinical information..."
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
              />
            </div>

            <button
              onClick={() => setShowPrintModal(true)}
              className="w-full bg-[#0F6E56] hover:bg-[#0d5844] text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Generate Referral Letter
            </button>
          </>
        )}

        {!screeningRecord && selectedScreeningId && (
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-[#A32D2D]">Record not found</p>
          </div>
        )}
      </div>

      {/* Print Modal */}
      {showPrintModal && screeningRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="font-bold text-[#1A1A1A]">Referral Letter</h3>
              <button onClick={() => setShowPrintModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <pre className="whitespace-pre-wrap font-mono text-xs text-[#1A1A1A] bg-gray-50 p-4 rounded-lg mb-4 overflow-auto">
                {generateReferralLetter()}
              </pre>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    window.print();
                    setShowPrintModal(false);
                  }}
                  className="w-full bg-[#0F6E56] hover:bg-[#0d5844] text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  Print
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generateReferralLetter());
                    alert('Referral letter copied to clipboard');
                    setShowPrintModal(false);
                  }}
                  className="w-full bg-[#185FA5] hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" /> Copy to Clipboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Settings Screen
const SettingsScreen: React.FC<{
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  records: ScreeningRecord[];
  onExport: () => void;
  onClearData: () => void;
}> = ({ settings, onSettingsChange, records, onExport, onClearData }) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleExportCSV = () => {
    const headers = ['Baby ID', 'Mother Name', 'Age (hours)', 'Birth Weight (g)', 'Gestational Age', 'Bilirubin (mg/dL)', 'Status', 'Ward', 'Worker', 'Notes', 'Timestamp'];
    const rows = records.map(r => [
      r.babyId,
      r.motherName,
      r.ageHours,
      r.birthWeight,
      r.gestationalAge,
      r.bilirubin,
      r.status,
      r.ward,
      r.workerName,
      r.notes,
      new Date(r.timestamp).toLocaleString()
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jaundicecare-records-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="pb-28">
      <div className="bg-[#0F6E56] text-white p-4 rounded-b-xl shadow-lg">
        <h2 className="font-bold text-lg">Settings</h2>
      </div>

      <div className="p-4 space-y-6">
        {/* Worker Information */}
        <div>
          <h3 className="font-bold text-[#1A1A1A] mb-3">Healthcare Worker</h3>
          <input
            type="text"
            placeholder="Your name"
            value={settings.workerName}
            onChange={(e) => onSettingsChange({...settings, workerName: e.target.value})}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
          />
        </div>

        {/* Facility Information */}
        <div>
          <h3 className="font-bold text-[#1A1A1A] mb-3">Facility / Ward Name</h3>
          <input
            type="text"
            placeholder="Facility or ward name"
            value={settings.facilityName}
            onChange={(e) => onSettingsChange({...settings, facilityName: e.target.value})}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
          />
        </div>

        {/* Referral Hospital */}
        <div>
          <h3 className="font-bold text-[#1A1A1A] mb-3">Default Referral Hospital</h3>
          <input
            type="text"
            placeholder="Hospital name for referrals"
            value={settings.referralHospital}
            onChange={(e) => onSettingsChange({...settings, referralHospital: e.target.value})}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
          />
        </div>

        {/* Sound Alerts */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <label className="font-semibold text-[#1A1A1A]">Sound Alerts for Critical Results</label>
          <button
            onClick={() => onSettingsChange({...settings, soundAlerts: !settings.soundAlerts})}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.soundAlerts ? 'bg-[#0F6E56]' : 'bg-gray-300'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.soundAlerts ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Data Management */}
        <div>
          <h3 className="font-bold text-[#1A1A1A] mb-3">Data Management</h3>
          <div className="space-y-2">
            <button
              onClick={handleExportCSV}
              className="w-full bg-[#185FA5] hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Export Records as CSV
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full bg-[#A32D2D] hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Clear All Records
            </button>
          </div>
        </div>

        {/* About */}
        <div className="bg-blue-50 rounded-lg p-4 space-y-3">
          <h3 className="font-bold text-[#1A1A1A]">About</h3>
          <div className="text-xs text-[#1A1A1A] space-y-2">
            <p><strong>Version:</strong> v1.0.0</p>
            <p className="leading-relaxed">
              JaundiceCARE Tanzania is a smartphone-based neonatal jaundice screening prototype developed for academic and research purposes.
            </p>
            <p className="leading-relaxed">
              <strong>Technology:</strong> Picterus AS (Norway) / GOAL 3 (Netherlands) — Eurostars Programme
            </p>
            <p className="leading-relaxed text-amber-900">
              This app does not replace clinical diagnosis. Always confirm results with laboratory testing.
            </p>
          </div>
        </div>

        {/* Admin Access */}
        <div>
          <h3 className="font-bold text-[#1A1A1A] mb-3">Admin Access</h3>
          <a
            href="/admin"
            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#0F6E56] text-[#0F6E56] rounded-lg text-sm font-semibold hover:bg-[#E1F5EE] transition-colors"
          >
            Open Admin Portal →
          </a>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm space-y-4">
            <h3 className="font-bold text-lg text-[#1A1A1A]">Clear All Records?</h3>
            <p className="text-sm text-[#5F5E5A]">This action cannot be undone. All screening records will be permanently deleted.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-[#1A1A1A] font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearData();
                  setShowClearConfirm(false);
                }}
                className="flex-1 bg-[#A32D2D] hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Bottom Navigation
const BottomNav: React.FC<{
  currentScreen: string;
  onNavigate: (screen: string) => void;
}> = ({ currentScreen, onNavigate }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'scan', label: 'Scan', icon: Camera },
    { id: 'records', label: 'Records', icon: FileText },
    { id: 'refer', label: 'Refer', icon: Send },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 flex justify-around items-center max-w-2xl mx-auto w-full">
      {navItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onNavigate(id)}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors min-h-16 ${
            currentScreen === id
              ? 'text-[#0F6E56] bg-[#E1F5EE]'
              : 'text-[#5F5E5A] hover:text-[#0F6E56]'
          }`}
        >
          <Icon className="w-5 h-5 mb-1" />
          <span className="text-xs font-semibold">{label}</span>
        </button>
      ))}
    </nav>
  );
};

// Main App
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [records, setRecords] = useState<ScreeningRecord[]>(() => {
    const stored = localStorage.getItem('jaundiceCare_records');
    return stored ? JSON.parse(stored) : [];
  });
  const [referrals, setReferrals] = useState<ReferralRecord[]>(() => {
    const stored = localStorage.getItem('jaundiceCare_referrals');
    return stored ? JSON.parse(stored) : [];
  });
  const [settings, setSettings] = useState<AppSettings>(() => {
    const stored = localStorage.getItem('jaundiceCare_settings');
    return stored ? JSON.parse(stored) : {
      workerName: '',
      facilityName: '',
      referralHospital: '',
      soundAlerts: false
    };
  });
  const [selectedRecordForReferral, setSelectedRecordForReferral] = useState<ScreeningRecord | null>(null);
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<ScreeningRecord | null>(null);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('jaundiceCare_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('jaundiceCare_referrals', JSON.stringify(referrals));
  }, [referrals]);

  useEffect(() => {
    localStorage.setItem('jaundiceCare_settings', JSON.stringify(settings));
  }, [settings]);

  const handleRecordSaved = (record: ScreeningRecord) => {
    setRecords([...records, record]);
    if (settings.soundAlerts && record.status === 'Refer Urgently') {
      // Simple beep using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    }
  };

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen);
    setSelectedRecordDetail(null);
    setSelectedRecordForReferral(null);
  };

  return (
    <div
      className="h-screen flex flex-col max-w-2xl mx-auto relative"
      style={{
        backgroundImage: `url('/image copy.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Soft overlay to keep UI readable over the background */}
      <div className="absolute inset-0 bg-white/60 pointer-events-none z-0" />
      <div className="flex-1 overflow-y-auto relative z-10">
        {currentScreen === 'home' && (
          <HomeScreen
            records={records}
            referrals={referrals}
            onStartScan={() => setCurrentScreen('scan')}
            onSelectRecord={(record) => {
              setSelectedRecordDetail(record);
              setCurrentScreen('records');
            }}
          />
        )}
        {currentScreen === 'scan' && (
          <ScanScreen
            records={records}
            referrals={referrals}
            settings={settings}
            onRecordSaved={handleRecordSaved}
            onNavigateToRefer={(record) => {
              setSelectedRecordForReferral(record);
              setCurrentScreen('refer');
            }}
            onBackHome={() => setCurrentScreen('home')}
          />
        )}
        {currentScreen === 'records' && (
          <RecordsScreen
            records={records}
            onSelectRecord={setSelectedRecordDetail}
          />
        )}
        {currentScreen === 'refer' && (
          <ReferralScreen
            records={records}
            referrals={referrals}
            settings={settings}
            prefilledRecord={selectedRecordForReferral || undefined}
            onBackHome={() => setCurrentScreen('home')}
          />
        )}
        {currentScreen === 'settings' && (
          <SettingsScreen
            settings={settings}
            onSettingsChange={setSettings}
            records={records}
            onExport={() => {
              const headers = ['Baby ID', 'Mother Name', 'Age (hours)', 'Birth Weight (g)', 'Gestational Age', 'Bilirubin (mg/dL)', 'Status', 'Ward', 'Worker', 'Notes', 'Timestamp'];
              const rows = records.map(r => [
                r.babyId,
                r.motherName,
                r.ageHours,
                r.birthWeight,
                r.gestationalAge,
                r.bilirubin,
                r.status,
                r.ward,
                r.workerName,
                r.notes,
                new Date(r.timestamp).toLocaleString()
              ]);

              const csv = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
              ].join('\n');

              const blob = new Blob([csv], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `jaundicecare-records-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
            }}
            onClearData={() => {
              setRecords([]);
              setReferrals([]);
            }}
          />
        )}
      </div>
      <div className="relative z-10">
        <BottomNav currentScreen={currentScreen} onNavigate={handleNavigate} />
      </div>
    </div>
  );
}
