import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2, AlertCircle, CheckCircle, RefreshCw, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { loadTeachableMachineModel, runScan, preprocessImage, type ScanResult, type TMModel } from '../services/aiScan';
import { uploadScanImage, saveScanToDb, createAlertForHighRiskScan } from '../services/scanService';
import type { Baby } from '../types';

type Phase = 'select' | 'capture' | 'analyzing' | 'result';

export default function ScanPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>('select');
  const [babies, setBabies] = useState<Baby[]>([]);
  const [selectedBabyId, setSelectedBabyId] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [model, setModel] = useState<TMModel | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const preselect = searchParams.get('baby');
    if (preselect) setSelectedBabyId(preselect);
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('babies')
      .select('*')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setBabies((data as Baby[]) || []));
  }, [user]);

  useEffect(() => {
    loadTeachableMachineModel().then(setModel);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!capturedImage) return;
    setPhase('analyzing');
    setError(null);

    try {
      const canvas = await preprocessImage(capturedImage);
      const scanResult = await runScan(canvas, model);
      setResult(scanResult);
      setPhase('result');
    } catch {
      setError('Analysis failed. Please try again.');
      setPhase('capture');
    }
  }, [capturedImage, model]);

  const handleSave = async () => {
    if (!user || !result) return;
    setSaving(true);
    setError(null);

    try {
      const imageUrl = await uploadScanImage(capturedImage || '', user.id);
      const scan = await saveScanToDb({
        babyId: selectedBabyId || null,
        parentId: user.id,
        imageUrl,
        imagePath: imageUrl ? `scans/${user.id}/${Date.now()}/scan.jpg` : null,
        riskLevel: result.riskLevel,
        confidenceScore: result.confidence,
        isOffline: !navigator.onLine,
      });

      if (result.riskLevel === 'High') {
        await createAlertForHighRiskScan(scan.id, user.id);
      }

      setSaved(true);
    } catch {
      setError('Failed to save scan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const riskColors: Record<string, { bg: string; badge: string; text: string }> = {
    High: { bg: 'bg-red-50', badge: 'bg-[#A32D2D] text-white', text: 'text-[#A32D2D]' },
    Medium: { bg: 'bg-amber-50', badge: 'bg-[#BA7517] text-white', text: 'text-[#BA7517]' },
    Low: { bg: 'bg-green-50', badge: 'bg-[#27500A] text-white', text: 'text-[#27500A]' },
  };

  const guidance: Record<string, string> = {
    High: 'Critical risk detected. Seek medical attention IMMEDIATELY. The nearest hospital has been automatically alerted. Please proceed to your nearest health facility.',
    Medium: 'Moderate risk detected. Monitor your baby closely and re-scan in 6-8 hours. If yellowing worsens or your baby seems lethargic, contact a healthcare provider.',
    Low: 'Low risk detected. No immediate action needed. Continue to monitor your baby and re-scan if you notice any yellowing of the skin or eyes.',
  };

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0F6E56] text-white p-4 rounded-b-xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/')} className="text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold">New Scan</h2>
          <div className="w-5"></div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Phase: Select Baby */}
        {phase === 'select' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Select Baby *</label>
              {babies.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-[#1A1A1A]">
                  You need to add a baby profile first. Go to your dashboard and tap "Add Baby".
                </div>
              ) : (
                <select
                  value={selectedBabyId}
                  onChange={(e) => setSelectedBabyId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
                >
                  <option value="">Choose a baby...</option>
                  {babies.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} - {new Date(b.date_of_birth).toLocaleDateString()}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="bg-blue-50 border border-[#185FA5] rounded-xl p-4">
              <h3 className="font-bold text-[#1A1A1A] mb-2 text-sm">How to Scan</h3>
              <ol className="text-xs text-[#1A1A1A] space-y-1 list-decimal list-inside">
                <li>Take a clear photo of your baby's face and chest area</li>
                <li>Ensure good lighting (natural light is best)</li>
                <li>Make sure the baby's skin and eyes are visible</li>
                <li>Hold the camera about 30cm from the baby</li>
                <li>Avoid shadows on the baby's skin</li>
              </ol>
            </div>

            <button
              onClick={() => setPhase('capture')}
              disabled={!selectedBabyId}
              className="w-full bg-[#0F6E56] hover:bg-[#0d5844] disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Continue to Camera
            </button>
          </div>
        )}

        {/* Phase: Capture */}
        {phase === 'capture' && (
          <CapturePhase
            capturedImage={capturedImage}
            onCapture={setCapturedImage}
            onAnalyze={handleAnalyze}
            onBack={() => setPhase('select')}
          />
        )}

        {/* Phase: Analyzing */}
        {phase === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full border-4 border-[#0F6E56] border-t-transparent animate-spin mb-4"></div>
            <p className="text-[#5F5E5A] font-semibold">Analyzing image with AI...</p>
            <p className="text-xs text-[#5F5E5A] mt-1">Detecting jaundice indicators in skin and eyes</p>
          </div>
        )}

        {/* Phase: Result */}
        {phase === 'result' && result && (
          <div className="space-y-4">
            {saved && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#27500A]" />
                <p className="text-sm text-[#27500A]">Scan saved successfully{result.riskLevel === 'High' ? ' and hospital alerted' : ''}.</p>
              </div>
            )}

            <div className={`rounded-xl p-6 text-center ${riskColors[result.riskLevel].bg}`}>
              <p className="text-xs font-semibold text-[#5F5E5A] mb-2">RISK LEVEL</p>
              <p className={`text-4xl font-bold mb-1 ${riskColors[result.riskLevel].text}`}>{result.riskLevel}</p>
              <p className="text-sm text-[#5F5E5A]">Confidence: {result.confidence}%</p>
            </div>

            <div className={`rounded-xl p-3 font-bold text-center text-sm ${riskColors[result.riskLevel].badge}`}>
              {result.riskLevel === 'High' ? 'SEEK MEDICAL ATTENTION' : result.riskLevel === 'Medium' ? 'MONITOR CLOSELY' : 'NO IMMEDIATE ACTION NEEDED'}
            </div>

            {capturedImage && (
              <div className="flex justify-center">
                <img src={capturedImage} alt="Scan" className="w-24 h-24 rounded-lg border-2 border-gray-300 object-cover" />
              </div>
            )}

            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs text-[#1A1A1A] leading-relaxed">{guidance[result.riskLevel]}</p>
            </div>

            {/* Confidence breakdown */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-xs font-bold text-[#1A1A1A]">AI Predictions:</p>
              {result.predictions.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-[#5F5E5A] w-20">{p.label}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-[#0F6E56] rounded-full" style={{ width: `${p.probability * 100}%` }} />
                  </div>
                  <span className="text-xs text-[#5F5E5A]">{Math.round(p.probability * 100)}%</span>
                </div>
              ))}
              <p className="text-[10px] text-[#5F5E5A] mt-1">
                Model: {result.modelUsed === 'teachable_machine' ? 'Teachable Machine AI' : 'Rule-based analysis (fallback)'}
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
              <p className="text-[#1A1A1A]"><strong>Disclaimer:</strong> This is a screening tool only. Always confirm results with laboratory testing.</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-[#A32D2D]">{error}</div>
            )}

            {!saved && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-[#0F6E56] hover:bg-[#0d5844] disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Scan Result'}
              </button>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPhase('capture');
                  setCapturedImage(null);
                  setResult(null);
                  setSaved(false);
                  setError(null);
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#1A1A1A] font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> New Scan
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex-1 bg-[#185FA5] hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CapturePhase({
  capturedImage,
  onCapture,
  onAnalyze,
  onBack,
}: {
  capturedImage: string | null;
  onCapture: (img: string) => void;
  onAnalyze: () => void;
  onBack: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch {
        setCameraError('Camera not available. You can upload a photo instead.');
      }
    };
    startCamera();

    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capture = () => {
    if (canvasRef.current && videoRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);
        onCapture(imageData);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onCapture(reader.result as string);
    reader.readAsDataURL(file);
  };

  if (capturedImage) {
    return (
      <div className="space-y-4">
        <img src={capturedImage} alt="Captured" className="w-full rounded-lg border-2 border-gray-300" />
        <div className="flex gap-3">
          <button
            onClick={() => onCapture('')}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#1A1A1A] font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Retake
          </button>
          <button
            onClick={onAnalyze}
            className="flex-1 bg-[#0F6E56] hover:bg-[#0d5844] text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Analyze with AI
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-[#185FA5] font-semibold text-sm flex items-center gap-1 mb-2">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {cameraError ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-[#BA7517] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[#1A1A1A]">{cameraError}</p>
          </div>
        </div>
      ) : (
        <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-white opacity-50 w-3/4 h-2/3 rounded-lg"></div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {!cameraError && (
          <button
            onClick={capture}
            className="flex-1 bg-[#0F6E56] hover:bg-[#0d5844] text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" /> Capture
          </button>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 bg-white border-2 border-[#0F6E56] text-[#0F6E56] font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Upload className="w-5 h-5" /> Upload Photo
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
      </div>
    </div>
  );
}
