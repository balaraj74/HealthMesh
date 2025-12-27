import { useState, useEffect } from 'react';
import { QrCode, Download, RefreshCw, Calendar, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface PatientQRDisplayProps {
  patientId: number;
}

interface QRCodeData {
  qrCodeId: number;
  fhirPatientId: string;
  masterPatientIdentifier: string;
  qrImageDataUrl: string;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

export function PatientQRDisplay({ patientId }: PatientQRDisplayProps) {
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  console.log('PatientQRDisplay rendered with patientId:', patientId);

  useEffect(() => {
    if (patientId) {
      loadQRCode();
    }
  }, [patientId]);

  const loadQRCode = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading QR for patient:', patientId);
      
      // First, check if QR code exists
      const existingResponse = await apiRequest('GET', `/api/qr/patient/${patientId}`);
      const result = await existingResponse.json();

      console.log('Existing QR check:', result);

      if (result.success && result.data) {
        // QR exists, but we need to generate the image
        await generateQRImage(result.data);
        return;
      }

      // QR doesn't exist, auto-generate one
      console.log('No existing QR, generating new one...');
      await generateNewQR();
    } catch (error) {
      console.error('Load QR error:', error);
      setError('Failed to load QR code');
      // If error is 404, QR doesn't exist, generate new one
      try {
        await generateNewQR();
      } catch (genError) {
        console.error('Failed to generate new QR:', genError);
        setError('Failed to generate QR code');
      }
    } finally {
      setLoading(false);
    }
  };

  const generateQRImage = async (metadata: any) => {
    // Request the full QR with image
    const response = await apiRequest('POST', '/api/qr/generate', { patientId });
    const result = await response.json();

    if (result.success) {
      setQrData({
        qrCodeId: result.data.qrCodeId,
        fhirPatientId: result.data.fhirPatientId,
        masterPatientIdentifier: result.data.masterPatientIdentifier,
        qrImageDataUrl: result.data.qrImageDataUrl,
        isActive: true,
        createdAt: new Date().toISOString()
      });
    }
  };

  const generateNewQR = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      console.log('Generating new QR for patient:', patientId);
      
      const response = await apiRequest('POST', '/api/qr/generate', { patientId });
      const result = await response.json();

      console.log('Generate QR result:', result);

      if (result.success) {
        setQrData({
          qrCodeId: result.data.qrCodeId,
          fhirPatientId: result.data.fhirPatientId,
          masterPatientIdentifier: result.data.masterPatientIdentifier,
          qrImageDataUrl: result.data.qrImageDataUrl,
          isActive: true,
          createdAt: new Date().toISOString()
        });

        toast({
          title: 'QR Code Generated',
          description: 'Patient QR identity code created successfully',
        });
      } else {
        const errorMsg = result.error || 'Failed to generate QR code';
        setError(errorMsg);
        toast({
          title: 'Generation Failed',
          description: errorMsg,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Generate QR error:', error);
      const errorMsg = 'Failed to generate QR code';
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadQR = () => {
    if (!qrData?.qrImageDataUrl) return;

    const link = document.createElement('a');
    link.href = qrData.qrImageDataUrl;
    link.download = `patient-qr-${qrData.masterPatientIdentifier}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Downloaded',
      description: 'QR code image saved successfully',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <QrCode className="w-5 h-5" />
            Patient QR Identity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <QrCode className="w-5 h-5 text-blue-600" />
          Patient QR Identity
          <Badge variant="outline" className="ml-auto">FHIR R4</Badge>
        </CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Secure longitudinal access · HIPAA compliant
        </p>
      </CardHeader>
      <CardContent>
        {qrData ? (
          <div className="space-y-4">
            {/* QR Code Image */}
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-lg shadow-sm border-2 border-slate-200">
                <img
                  src={qrData.qrImageDataUrl}
                  alt="Patient QR Code"
                  className="w-48 h-48"
                />
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Shield className="w-4 h-4" />
                <span className="font-mono text-xs">{qrData.masterPatientIdentifier}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Calendar className="w-4 h-4" />
                <span>Generated {formatDate(qrData.createdAt)}</span>
              </div>
              {qrData.expiresAt && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span>Expires {formatDate(qrData.expiresAt)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={downloadQR}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={generateNewQR}
                variant="outline"
                size="sm"
                disabled={generating}
              >
                <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Instructions */}
            <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded">
              <p className="font-semibold mb-1">How to use:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Scan to instantly access complete patient history</li>
                <li>Works across all HealthMesh-enabled facilities</li>
                <li>No PHI stored in QR code (encrypted token only)</li>
                <li>All scans are logged for HIPAA compliance</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <QrCode className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            {error ? (
              <>
                <p className="text-red-600 dark:text-red-400 mb-2 font-semibold">
                  {error}
                </p>
                <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">
                  Please try generating the QR code again
                </p>
              </>
            ) : (
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                No QR code generated yet
              </p>
            )}
            <Button
              onClick={generateNewQR}
              disabled={generating}
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4 mr-2" />
                  Generate QR Code
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
