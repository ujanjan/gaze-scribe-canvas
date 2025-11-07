import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Target, Check } from "lucide-react";

interface CalibrationModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onClose: () => void;
}

const CalibrationModal = ({ isOpen, onComplete, onClose }: CalibrationModalProps) => {
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Calibration points positioned across the screen
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
    }
  }, [isOpen]);

  const handleStartCalibration = () => {
    setIsCalibrating(true);
    setCalibrationStep(0);
  };

  const handleCalibrationClick = (index: number) => {
    if (calibrationStep === index) {
      // Record calibration point with WebGazer
      if (window.webgazer) {
        const point = calibrationPoints[index];
        const x = (window.innerWidth * point.x) / 100;
        const y = (window.innerHeight * point.y) / 100;
        
        // Add calibration point
        window.webgazer.recordScreenPosition(x, y, "click");
      }

      if (calibrationStep < calibrationPoints.length - 1) {
        setCalibrationStep(calibrationStep + 1);
      } else {
        // Calibration complete
        setTimeout(() => {
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
          <p className="mb-6 text-muted-foreground">
            Before we begin, we need to calibrate the eye-tracking system to improve
            accuracy. You'll be asked to click on 9 points on the screen. Please look
            directly at each point as you click it.
          </p>
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
        </>
      )}
    </div>
  );
};

export default CalibrationModal;
