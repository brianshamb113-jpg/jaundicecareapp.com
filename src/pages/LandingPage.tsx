import React from 'react';
import { Sun, Shield, Camera, Heart, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F6E56] to-[#0d5844] text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-6 shadow-lg">
            <Sun className="w-10 h-10 text-[#0F6E56]" />
          </div>
          <h1 className="text-4xl font-bold mb-3">JaundiceCARE</h1>
          <p className="text-lg text-white/80 mb-1">Tanzania</p>
          <p className="text-sm text-white/60 max-w-md mx-auto">
            AI-powered neonatal jaundice screening. Scan your baby, get instant risk assessment, and connect with nearby hospitals.
          </p>
        </div>

        {/* Features */}
        <div className="grid gap-4 mb-12">
          <FeatureCard
            icon={<Camera className="w-6 h-6" />}
            title="AI-Powered Scanning"
            description="Take a photo of your baby's skin and eyes. Our AI model detects jaundice risk levels instantly."
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Hospital Alerts"
            description="High-risk cases automatically alert nearby hospitals so they can prepare for your arrival."
          />
          <FeatureCard
            icon={<Heart className="w-6 h-6" />}
            title="Scan History"
            description="Track your baby's screening results over time and share with healthcare providers."
          />
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <button
            onClick={() => onNavigate('/register')}
            className="w-full bg-white text-[#0F6E56] font-bold py-4 px-6 rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2 text-lg"
          >
            Get Started <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => onNavigate('/login')}
            className="w-full bg-white/10 border border-white/30 text-white font-bold py-4 px-6 rounded-xl hover:bg-white/20 transition-colors"
          >
            I Already Have an Account
          </button>
        </div>

        <p className="text-center text-xs text-white/50 mt-8">
          This is a screening tool and does not replace clinical diagnosis. Always confirm results with laboratory testing.
        </p>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 flex gap-4 items-start">
      <div className="bg-white/20 rounded-xl p-3 flex-shrink-0">{icon}</div>
      <div>
        <h3 className="font-bold text-lg mb-1">{title}</h3>
        <p className="text-sm text-white/70">{description}</p>
      </div>
    </div>
  );
}
