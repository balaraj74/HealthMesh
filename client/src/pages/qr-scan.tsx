import { useState } from 'react';
import { useLocation } from 'wouter';
import { QrCode, Scan } from 'lucide-react';
import { QRScanner } from '@/components/qr-scanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/auth/apiClient';

export default function QRScanPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleScanSuccess = async (qrToken: string) => {
    try {
      setLoading(true);
      setShowScanner(false);

      // Use apiClient which properly handles Entra ID authentication
      const result = await apiClient.post('/api/qr/scan', {
        qrToken,
        accessPurpose: 'clinical_care'
      }) as any;

      if (result.success && result.data) {
        toast({
          title: 'Patient Identified',
          description: `Redirecting to ${result.data.firstName} ${result.data.lastName}'s records`,
        });

        // Redirect to patient details page
        navigate(result.data.redirectUrl || `/patients/${result.data.patientId}`);
      } else {
        toast({
          title: 'Access Denied',
          description: result.error || 'Failed to access patient records',
          variant: 'destructive'
        });
        setLoading(false);
      }
    } catch (error) {
      console.error('QR scan error:', error);
      toast({
        title: 'Error',
        description: 'Failed to process QR code',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Loading patient records...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6">
      {showScanner ? (
        <QRScanner
          onScanSuccess={handleScanSuccess}
          onClose={() => setShowScanner(false)}
        />
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <QrCode className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
                QR Patient Access
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Instant longitudinal patient record access
              </p>
            </div>
          </div>

          {/* Main Card */}
          <Card className="border-2 border-dashed border-blue-300 dark:border-blue-700">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto p-6 bg-blue-50 dark:bg-blue-900/20 rounded-full w-fit mb-4">
                <Scan className="w-16 h-16 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-2xl">
                Scan Patient QR Code
              </CardTitle>
              <CardDescription className="text-base">
                Access complete patient history, diagnoses, medications, and AI insights in seconds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button
                size="lg"
                className="w-full text-lg py-6"
                onClick={() => setShowScanner(true)}
              >
                <QrCode className="w-6 h-6 mr-3" />
                Start Scanner
              </Button>

              {/* Features */}
              <div className="grid gap-4 md:grid-cols-2 pt-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Comprehensive Data</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Demographics, cases, meds, labs, allergies, conditions
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 dark:text-purple-400 font-bold">✓</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">AI Insights</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Risk scores, trend analysis, clinical recommendations
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Timeline View</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Complete care history from past to present
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-red-600 dark:text-red-400 font-bold">✓</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Critical Alerts</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Allergies, chronic conditions, high-risk flags
                    </p>
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-sm font-semibold mb-2">🔒 Security & Compliance</p>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <li>• HIPAA-aligned access controls with role-based permissions</li>
                  <li>• All scans logged for complete audit trail</li>
                  <li>• Encrypted tokens with no PHI in QR code</li>
                  <li>• FHIR R4 compliant data structure</li>
                  <li>• Multi-hospital support with data isolation</li>
                </ul>
              </div>

              {/* Instructions */}
              <div className="text-center text-sm text-slate-600 dark:text-slate-400 pt-2">
                <p className="mb-2">How it works:</p>
                <ol className="inline-block text-left space-y-1">
                  <li>1. Click "Start Scanner" and allow camera access</li>
                  <li>2. Point camera at patient's QR code</li>
                  <li>3. System validates token and checks permissions</li>
                  <li>4. Complete longitudinal dashboard loads instantly</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
