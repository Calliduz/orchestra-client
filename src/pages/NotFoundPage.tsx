import React, { useEffect } from 'react';
import { AlertCircle, Home, KeyRound } from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';

interface NotFoundPageProps {
  onNavigate: (tab: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  useEffect(() => {
    document.title = 'ORCHESTRA | 404 Route Unresolved';
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 font-mono">
      <Card className="max-w-md w-full text-center p-8 space-y-5">
        <div className="text-4xl font-mono font-black text-[#FF3333] tracking-widest">
          [404_NOT_FOUND]
        </div>

        <div className="space-y-1">
          <h1 className="font-sans font-bold text-sm text-[#E6EDF3] uppercase tracking-wider">
            ROUTER_ENDPOINT_UNRESOLVED
          </h1>
          <p className="text-xs text-[#7D8794] leading-relaxed">
            The target route or telemetry socket path is unregistered in the ORCHESTRA framework dispatch table.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() => onNavigate('dashboard')}
            leftIcon={<Home className="w-3.5 h-3.5" />}
          >
            FACULTY_CONSOLE
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onNavigate('otp')}
            leftIcon={<KeyRound className="w-3.5 h-3.5" />}
          >
            OTP_PORTAL
          </Button>
        </div>
      </Card>
    </div>
  );
};
export default NotFoundPage;
