import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Target, Check, AlertCircle } from "lucide-react";
import gazeCloudService from "@/services/gazeCloudService";

interface CalibrationModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onClose: () => void;
}

const CalibrationModal = ({ isOpen, onComplete, onClose }: CalibrationModalProps) => {
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // GazeCloud built-in calibration points - optimized for best results
  const calibrationPoints = [
    { x: 10, y: 10 },    // Top-left
    { x: 90, y: 10 },    // Top-right
    { x: 50, y: 50 },    // Center
    { x: 10, y: 90 },    // Bottom-left
    { x: 90, y: 90 },    // Bottom-right
    { x: 50, y: 10 },    // Top-center
    { x: 50, y: 90 },    // Bottom-center
    { x: 10, y: 50 },    // Left-center
    { x: 90, y: 50 },    // Right-center
  ];

  useEffect(() => {
    if (!isOpen) {
      setCalibrationStep(0);
      setIsCalibrating(false);
      setError(null);
    } else {
      // Setup calibration callbacks when modal opens
      const numPoints = calibrationPoints.length;
      gazeCloudService.setOnCalibrationComplete(() => {
        console.log("Calibration completed");
        setCalibrationStep(numPoints);
      });

      gazeCloudService.setOnCameraDenied(() => {
        setError("Camera access denied. Please allow camera access to proceed.");
      });

      gazeCloudService.setOnError((msg: string) => {
        setError(`Calibration error: ${msg}`);
      });
    }
  }, [isOpen, calibrationPoints.length]);

  const handleStartCalibration = async () => {
    try {
      setError(null);
      setIsCalibrating(true);
      setCalibrationStep(0);

      // Enable click-based recalibration for best results
      gazeCloudService.enableClickRecalibration(true);

      // Start eye tracking (which triggers calibration)
      gazeCloudService.startTracking();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to start calibration";
      setError(errorMsg);
      setIsCalibrating(false);
    }
  };

  const handleCalibrationClick = (index: number) => {
    if (calibrationStep === index) {
      // GazeCloud automatically records calibration points on clicks
      // Just advance to next point
      if (calibrationStep < calibrationPoints.length - 1) {
        setCalibrationStep(calibrationStep + 1);
      } else {
        // Calibration complete
        setTimeout(() => {
          gazeCloudService.stopTracking();
          onComplete();
        }, 500);
      }
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
          <p className="mb-2 text-muted-foreground">
            Before we begin, we need to calibrate the eye-tracking system using GazeCloud API
            for optimal accuracy. You'll be asked to click on 9 points across the screen.
          </p>
          <p className="mb-6 text-sm text-muted-foreground">
            <strong>Tip:</strong> Look directly at each point before clicking for best results.
            GazeCloud will automatically record each calibration point.
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
        <>
          {/* Progress indicator */}
          <div className="fixed left-1/2 top-8 z-50 -translate-x-1/2">
            <Card className="px-6 py-3">
              <p className="text-sm font-medium text-foreground">
                Click on point {calibrationStep + 1} of {calibrationPoints.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                GazeCloud is recording your calibration
              </p>
            </Card>
          </div>

          {/* Calibration points */}
          {calibrationPoints.map((point, index) => (
            <button
              key={index}
              onClick={() => handleCalibrationClick(index)}
              className={`fixed z-40 flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300 ${
                index === calibrationStep
                  ? "scale-100 bg-primary opacity-100 shadow-lg ring-4 ring-primary/30"
                  : index < calibrationStep
                  ? "scale-75 bg-success opacity-50"
                  : "scale-75 bg-muted opacity-30"
              }`}
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
                transform: "translate(-50%, -50%)",
              }}
              disabled={index !== calibrationStep}
            >
              {index < calibrationStep ? (
                <Check className="h-8 w-8 text-success-foreground" />
              ) : (
                <Target
                  className={`h-8 w-8 ${
                    index === calibrationStep
                      ? "text-primary-foreground animate-pulse"
                      : "text-muted-foreground"
                  }`}
                />
              )}
            </button>
          ))}

          {/* Instructions overlay */}
          <div className="fixed left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-lg font-medium text-muted-foreground opacity-50">
              Look at the highlighted point and click on it
            </p>
          </div>

          {/* Error message during calibration */}
          {error && (
            <div className="fixed left-1/2 bottom-8 z-50 -translate-x-1/2 max-w-md">
              <Card className="border-destructive/50 bg-destructive/10 p-4">
                <div className="flex items-center gap-3 text-sm text-destructive">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{error}</p>
                    <button
                      onClick={() => {
                        setError(null);
                        setIsCalibrating(false);
                        gazeCloudService.stopTracking();
                      }}
                      className="mt-2 text-xs underline hover:no-underline"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CalibrationModal;
