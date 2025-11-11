import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Target, Check } from "lucide-react";

interface CalibrationModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onClose: () => void;
}

// WebGazer readiness check helper
const isWebGazerReady = (): boolean => {
  return (
    typeof window !== "undefined" &&
    window.webgazer &&
    typeof window.webgazer.recordScreenPosition === "function"
  );
};

// Helper function for viewport-aware coordinate calculation
const getScreenCoordinates = (point: { x: number; y: number }) => {
  const rect = document.documentElement.getBoundingClientRect();
  return {
    x: (rect.width * point.x) / 100,
    y: (rect.height * point.y) / 100,
  };
};

// Calculate offset percentage for circle radius (h-20 w-20 = 80px, radius = 40px)
// This ensures corner circles are fully visible with outer edge touching screen edge
const getCornerOffset = () => {
  const rect = document.documentElement.getBoundingClientRect();
  const circleRadius = 40; // 80px / 2 (h-20 w-20 = 5rem = 80px)
  return {
    x: (circleRadius / rect.width) * 100,
    y: (circleRadius / rect.height) * 100,
  };
};

const CalibrationModal = ({ isOpen, onComplete, onClose }: CalibrationModalProps) => {
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isPointReady, setIsPointReady] = useState(false);
  const fixationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate corner offset to ensure circles are fully visible
  // This will be calculated dynamically based on viewport size
  const [cornerOffset, setCornerOffset] = useState({ x: 2, y: 2 }); // Default fallback

  useEffect(() => {
    const updateCornerOffset = () => {
      const offset = getCornerOffset();
      setCornerOffset(offset);
    };
    
    updateCornerOffset();
    window.addEventListener('resize', updateCornerOffset);
    return () => window.removeEventListener('resize', updateCornerOffset);
  }, []);

  // 17-point calibration grid with optimized order (corners first, center last)
  // Order: 4 corners → edge points → inner points → center
  // Corners are positioned so outer edge of circle touches screen edge
  // Remaining points are evenly distributed: 33.33%, 66.67%
  const calibrationPoints = useMemo(() => [
    // Corners first (points 0-3) - Outer edge touches screen edge
    { x: cornerOffset.x, y: cornerOffset.y },           // Top-left corner
    { x: 100 - cornerOffset.x, y: cornerOffset.y },     // Top-right corner
    { x: cornerOffset.x, y: 100 - cornerOffset.y },     // Bottom-left corner
    { x: 100 - cornerOffset.x, y: 100 - cornerOffset.y }, // Bottom-right corner
    // Edge points (points 4-11) - Evenly spaced between corners
    { x: 33.33, y: cornerOffset.y },                   // Top edge left
    { x: 66.67, y: cornerOffset.y },                   // Top edge right
    { x: cornerOffset.x, y: 33.33 },                   // Left edge top
    { x: cornerOffset.x, y: 66.67 },                   // Left edge bottom
    { x: 100 - cornerOffset.x, y: 33.33 },             // Right edge top
    { x: 100 - cornerOffset.x, y: 66.67 },             // Right edge bottom
    { x: 33.33, y: 100 - cornerOffset.y },              // Bottom edge left
    { x: 66.67, y: 100 - cornerOffset.y },             // Bottom edge right
    // Inner points (points 12-15) - All 4 inner points
    { x: 33.33, y: 33.33 },                            // Inner top-left
    { x: 66.67, y: 33.33 },                            // Inner top-right
    { x: 33.33, y: 66.67 },                            // Inner bottom-left
    { x: 66.67, y: 66.67 },                            // Inner bottom-right
    // Center point last (point 16)
    { x: 50, y: 50 },                                  // Center
  ], [cornerOffset]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCalibrationStep(0);
      setIsCalibrating(false);
      setIsPointReady(false);
      if (fixationTimerRef.current) {
        clearTimeout(fixationTimerRef.current);
        fixationTimerRef.current = null;
      }
    }
  }, [isOpen]);

  // Handle fixation timer when calibration step changes
  useEffect(() => {
    if (isCalibrating && isOpen) {
      // Reset point readiness
      setIsPointReady(false);
      
      // Clear any existing timer
      if (fixationTimerRef.current) {
        clearTimeout(fixationTimerRef.current);
      }

      // Start 1.5-second fixation timer
      fixationTimerRef.current = setTimeout(() => {
        setIsPointReady(true);
        fixationTimerRef.current = null;
      }, 1500);

      // Cleanup on unmount or step change
      return () => {
        if (fixationTimerRef.current) {
          clearTimeout(fixationTimerRef.current);
          fixationTimerRef.current = null;
        }
      };
    }
  }, [calibrationStep, isCalibrating, isOpen]);

  const handleStartCalibration = () => {
    // Check WebGazer readiness before starting
    if (!isWebGazerReady()) {
      toast.error("WebGazer is not ready. Please wait for initialization or refresh the page.");
      return;
    }
    setIsCalibrating(true);
    setCalibrationStep(0);
    setIsPointReady(false);
  };

  const handleCalibrationClick = (index: number) => {
    // Only allow click if it's the current step and point is ready
    if (calibrationStep !== index || !isPointReady) {
      return;
    }

    // Check WebGazer readiness before recording
    if (!isWebGazerReady()) {
      toast.error("WebGazer is not ready. Please refresh the page.");
      return;
    }

    // Record calibration point with WebGazer using improved coordinate calculation
    const point = calibrationPoints[index];
    const coords = getScreenCoordinates(point);
    window.webgazer.recordScreenPosition(coords.x, coords.y, "click");

    // Move to next step or complete calibration
    if (calibrationStep < calibrationPoints.length - 1) {
      setCalibrationStep(calibrationStep + 1);
    } else {
      // Calibration complete
      setTimeout(() => {
        onComplete();
      }, 500);
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
            accuracy. You'll be asked to click on 17 points on the screen. Please look
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
          {calibrationPoints.map((point, index) => {
            const isCurrentPoint = index === calibrationStep;
            const isReady = isCurrentPoint && isPointReady;
            
            return (
              <button
                key={index}
                onClick={() => handleCalibrationClick(index)}
                className={`fixed z-40 flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 ${
                  isCurrentPoint
                    ? isReady
                      ? "scale-100 bg-primary opacity-100 shadow-lg ring-4 ring-primary/30 cursor-pointer"
                      : "scale-100 bg-primary opacity-80 shadow-lg ring-4 ring-primary/20 cursor-wait"
                    : index < calibrationStep
                    ? "scale-75 bg-success opacity-50"
                    : "scale-75 bg-muted opacity-30"
                }`}
                style={{
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
                disabled={!isCurrentPoint || !isReady}
              >
                {index < calibrationStep ? (
                  <Check className="h-10 w-10 text-success-foreground" />
                ) : (
                  <Target
                    className={`h-10 w-10 ${
                      isCurrentPoint
                        ? isReady
                          ? "text-primary-foreground animate-pulse"
                          : "text-primary-foreground animate-pulse opacity-70"
                        : "text-muted-foreground"
                    }`}
                  />
                )}
              </button>
            );
          })}

          {/* Instructions overlay */}
          <div className="fixed left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-lg font-medium text-muted-foreground opacity-50">
              {isPointReady
                ? "Look at the highlighted point and click on it"
                : "Focus on the highlighted point..."}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default CalibrationModal;
