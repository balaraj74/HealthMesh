import { useState, useRef, useEffect } from 'react';
import { X, Upload, Camera, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import jsQR from 'jsqr';

interface QRScannerProps {
  onScanSuccess: (token: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const [scanMode, setScanMode] = useState<'camera' | 'upload'>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start camera scanning
  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
        requestAnimationFrame(scanQRCode);
      }
    } catch (err: any) {
      setError('Camera access denied. Please allow camera permission or upload QR image.');
      setIsScanning(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  // Scan QR code from video stream
  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      requestAnimationFrame(scanQRCode);
      return;
    }

    // Set canvas size to video size
    canvas.height = video.videoHeight;
    canvas.width = video.videoWidth;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // Scan for QR code
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code) {
      // QR code detected!
      handleQRDetected(code.data);
    } else {
      // Continue scanning
      requestAnimationFrame(scanQRCode);
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          handleQRDetected(code.data);
        } else {
          setError('No QR code found in image. Please try another image.');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Handle QR code detection
  const handleQRDetected = (data: string) => {
    setSuccess(true);
    stopCamera();

    // Security: Validate QR format before sending to server
    // Format: v1:encrypted:iv:authTag
    if (!data || typeof data !== 'string') {
      setError('Invalid QR code data.');
      setSuccess(false);
      return;
    }

    // Length check (prevent DoS)
    if (data.length > 2000 || data.length < 50) {
      setError('Invalid QR code format. This is not a valid HealthMesh patient QR code.');
      setSuccess(false);
      return;
    }

    // Format validation
    if (!data.startsWith('v1:')) {
      setError('Invalid QR code format. This is not a HealthMesh patient QR code.');
      setSuccess(false);
      return;
    }

    // Structure validation (should have exactly 4 parts)
    const parts = data.split(':');
    if (parts.length !== 4) {
      setError('Invalid QR code structure. Please scan a valid HealthMesh QR code.');
      setSuccess(false);
      return;
    }

    // Validate hex encoding for encrypted parts
    const hexRegex = /^[a-fA-F0-9]+$/;
    if (!hexRegex.test(parts[1]) || !hexRegex.test(parts[2]) || !hexRegex.test(parts[3])) {
      setError('Invalid QR code encoding. Please scan a valid HealthMesh QR code.');
      setSuccess(false);
      return;
    }

    // Small delay for visual feedback
    setTimeout(() => {
      onScanSuccess(data);
    }, 500);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Auto-start camera when mode is camera
  useEffect(() => {
    if (scanMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [scanMode]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Camera className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Scan Patient QR Code
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Scan to access patient longitudinal records
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={scanMode === 'camera' ? 'default' : 'outline'}
              onClick={() => setScanMode('camera')}
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              Camera
            </Button>
            <Button
              variant={scanMode === 'upload' ? 'default' : 'outline'}
              onClick={() => setScanMode('upload')}
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Image
            </Button>
          </div>

          {/* Scanner Area */}
          <div className="relative bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden mb-4">
            {scanMode === 'camera' ? (
              <div className="relative aspect-video">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 border-4 border-blue-500 rounded-lg animate-pulse" />
                  </div>
                )}
                {success && (
                  <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-full">
                      <CheckCircle2 className="w-16 h-16 text-green-600" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video flex items-center justify-center p-8">
                <div className="text-center">
                  <Upload className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Upload an image containing the QR code
                  </p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Image
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Hidden canvas for processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Status Messages */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-400">
                QR code detected! Loading patient data...
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
            <p className="font-semibold">Instructions:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Position the QR code within the scanning area</li>
              <li>Ensure good lighting for best results</li>
              <li>Hold steady until the code is detected</li>
              <li>Only HealthMesh patient QR codes are accepted</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
