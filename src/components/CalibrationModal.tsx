import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Target, AlertCircle, Loader } from "lucide-react";
import gazeCloudService from "@/services/gazeCloudService";

interface CalibrationModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onClose: () => void;
}

const CalibrationModal = ({ isOpen, onComplete, onClose }: CalibrationModalProps) => {
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsCalibrating(false);
      setError(null);
    } else {
      // Setup calibration callbacks when modal opens
      gazeCloudService.setOnCalibrationComplete(() => {
        console.log("GazeCloud calibration completed");
        setIsCalibrating(false);
        setTimeout(() => {
          onComplete();
        }, 500);
      });

      gazeCloudService.setOnCameraDenied(() => {
        setError("Camera access denied. Please allow camera access to proceed.");
        setIsCalibrating(false);
      });

      gazeCloudService.setOnError((msg: string) => {
        setError(`Calibration error: ${msg}`);
        setIsCalibrating(false);
      });
    }
  }, [isOpen, onComplete]);

  const handleStartCalibration = async () => {
    try {
      setError(null);
      setIsCalibrating(true);

      // Enable click-based recalibration for best results
      gazeCloudService.enableClickRecalibration(true);

      // Start eye tracking (which triggers GazeCloud's native calibration)
      gazeCloudService.startTracking();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to start calibration";
      setError(errorMsg);
      setIsCalibrating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      {!isCalibrating ? (
        <Card className="max-w-md p-8 text-center shadow-xl">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
              <Target className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h2 className="mb-4 text-2xl font-bold text-foreground">
            Calibration Required
          </h2>
          <p className="mb-6 text-muted-foreground">
            GazeCloud API will guide you through eye-tracking calibration.
            Follow the on-screen instructions for best results.
          </p>
          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="space-y-3">
            <Button onClick={handleStartCalibration} className="w-full" size="lg">
              Start Calibration
            </Button>
            <Button onClick={onClose} variant="outline" className="w-full">
              Skip for Now
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="max-w-md p-8 text-center shadow-xl">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
              <Loader className="h-8 w-8 text-primary-foreground animate-spin" />
            </div>
          </div>
          <h2 className="mb-4 text-2xl font-bold text-foreground">
            Calibrating...
          </h2>
          <p className="mb-6 text-muted-foreground">
            GazeCloud is calibrating your eye-tracker. Follow the on-screen prompts
            and look directly at each calibration target for best accuracy.
          </p>
          {error && (
            <div className="rounded-lg bg-destructive/10 p-4">
              <div className="flex items-center gap-3 text-sm text-destructive">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-medium">{error}</p>
                  <button
                    onClick={() => {
                      setError(null);
                      setIsCalibrating(false);
                      gazeCloudService.stopTracking();
                    }}
                    className="mt-2 text-xs underline hover:no-underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default CalibrationModal;
