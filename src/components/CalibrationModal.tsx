import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Target, Check } from "lucide-react";
import {
  CalibrationPoint,
  GazeSample,
  averageGazeSamples,
} from "@/utils/calibrationUtils";

interface CalibrationModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onClose: () => void;
}

// Calibration constants
const COUNTDOWN_DURATION = 3; // seconds
const STABILIZATION_THRESHOLD = 50; // pixels
const STABILIZATION_DURATION = 400; // milliseconds
const POINT_SIZE = 32; // pixels (h-32 w-32 = 128px total, 64px radius)

// Calibration points ordered: corners first → edges → center last
const calibrationPoints: CalibrationPoint[] = [
  { x: 10, y: 10 }, // Top-left (corner)
  { x: 90, y: 10 }, // Top-right (corner)
  { x: 10, y: 90 }, // Bottom-left (corner)
  { x: 90, y: 90 }, // Bottom-right (corner)
  { x: 50, y: 10 }, // Top-center (edge)
  { x: 10, y: 50 }, // Left-center (edge)
  { x: 90, y: 50 }, // Right-center (edge)
  { x: 50, y: 90 }, // Bottom-center (edge)
  { x: 50, y: 50 }, // Center (LAST - most important reference)
];

type CalibrationPhase = "idle" | "calibrating" | "complete";

const CalibrationModal = ({ isOpen, onComplete, onClose }: CalibrationModalProps) => {
  const [phase, setPhase] = useState<CalibrationPhase>("idle");
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [isStabilizing, setIsStabilizing] = useState(false);
  
  // Refs for gaze collection
  const gazeSamplesRef = useRef<GazeSample[]>([]);
  const stabilizationStartRef = useRef<number | null>(null);
  const gazeListenerRef = useRef<((data: any) => void) | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stabilizationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPhase("idle");
      setCalibrationStep(0);
      setCountdownValue(null);
      setIsStabilizing(false);
      gazeSamplesRef.current = [];
      stabilizationStartRef.current = null;
      cleanupTimers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Cleanup timers
  const cleanupTimers = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (stabilizationTimerRef.current) {
      clearInterval(stabilizationTimerRef.current);
      stabilizationTimerRef.current = null;
    }
  }, []);

  // Setup gaze listener for calibration
  useEffect(() => {
    if (!isOpen || !window.webgazer || phase !== "calibrating") return;

    const setupGazeListener = () => {
      // Store current gaze samples
      const listener = (data: any) => {
        if (data && data.x !== null && data.y !== null) {
          const sample: GazeSample = {
            x: data.x,
            y: data.y,
            timestamp: Date.now(),
          };

          if (phase === "calibrating") {
            gazeSamplesRef.current.push(sample);
          }
        }
      };

      gazeListenerRef.current = listener;
      window.webgazer.setGazeListener(listener);
    };

    setupGazeListener();

    return () => {
      // Don't reset listener here - let the parent component handle it
      // This prevents the listener from being cleared when calibration completes
      gazeListenerRef.current = null;
    };
  }, [isOpen, phase]);

  // Check gaze stabilization
  useEffect(() => {
    if (phase !== "calibrating" || countdownValue !== null || !isStabilizing) return;

    const checkStabilization = () => {
      if (!window.webgazer || gazeSamplesRef.current.length < 3) return;

      const point = calibrationPoints[calibrationStep];
      const targetX = (window.innerWidth * point.x) / 100;
      const targetY = (window.innerHeight * point.y) / 100;

      // Get recent samples (last 5)
      const recentSamples = gazeSamplesRef.current.slice(-5);
      const avgGaze = averageGazeSamples(recentSamples);

      const distance = Math.sqrt(
        Math.pow(avgGaze.x - targetX, 2) + Math.pow(avgGaze.y - targetY, 2)
      );

      if (distance <= STABILIZATION_THRESHOLD) {
        if (stabilizationStartRef.current === null) {
          stabilizationStartRef.current = Date.now();
        } else {
          const elapsed = Date.now() - stabilizationStartRef.current;
          if (elapsed >= STABILIZATION_DURATION) {
            // Gaze is stable, record calibration point
            handleStabilized();
          }
        }
      } else {
        // Reset stabilization timer if gaze moves away
        stabilizationStartRef.current = null;
      }
    };

    stabilizationTimerRef.current = setInterval(checkStabilization, 100);

    return () => {
      if (stabilizationTimerRef.current) {
        clearInterval(stabilizationTimerRef.current);
        stabilizationTimerRef.current = null;
      }
    };
  }, [phase, calibrationStep, countdownValue, isStabilizing]);

  const handleStartCalibration = () => {
    setPhase("calibrating");
    setCalibrationStep(0);
    gazeSamplesRef.current = [];
    startCountdown();
  };

  const startCountdown = () => {
    setCountdownValue(COUNTDOWN_DURATION);
    setIsStabilizing(false);
    stabilizationStartRef.current = null;
    gazeSamplesRef.current = [];

    let count = COUNTDOWN_DURATION;
    countdownTimerRef.current = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownValue(count);
      } else {
        setCountdownValue(null);
        setIsStabilizing(true);
        cleanupTimers();
      }
    }, 1000);
  };

  const handleStabilized = () => {
    if (!window.webgazer) return;

    const point = calibrationPoints[calibrationStep];
    const targetX = (window.innerWidth * point.x) / 100;
    const targetY = (window.innerHeight * point.y) / 100;

    // Use averaged gaze samples for calibration
    const avgGaze = averageGazeSamples(gazeSamplesRef.current);
    
    // Record calibration point with WebGazer
    window.webgazer.recordScreenPosition(targetX, targetY, "click");

    // Move to next point
    if (calibrationStep < calibrationPoints.length - 1) {
      setTimeout(() => {
        setCalibrationStep(calibrationStep + 1);
        setIsStabilizing(false);
        stabilizationStartRef.current = null;
        gazeSamplesRef.current = [];
        startCountdown();
      }, 200);
    } else {
      // Calibration complete
      setTimeout(() => {
        setPhase("complete");
        handleComplete();
      }, 500);
    }
  };

  const handleCalibrationClick = (index: number) => {
    // Fallback: allow manual click if auto-advance doesn't work
    if (calibrationStep === index && phase === "calibrating") {
      handleStabilized();
    }
  };

  const handleRecalibrate = () => {
    setPhase("calibrating");
    setCalibrationStep(0);
    gazeSamplesRef.current = [];
    startCountdown();
  };

  const handleComplete = () => {
    onComplete();
  };

  if (!isOpen) return null;

  const currentPoint = calibrationPoints[calibrationStep];
  const currentPointX = (window.innerWidth * currentPoint.x) / 100;
  const currentPointY = (window.innerHeight * currentPoint.y) / 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      {phase === "idle" ? (
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
            accuracy. You'll be asked to look at 9 points on the screen. Please look
            directly at each point as it appears. The system will automatically advance
            when your gaze stabilizes.
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
      ) : phase === "calibrating" ? (
        <>
          {/* Progress indicator */}
          <div className="fixed left-1/2 top-8 z-50 -translate-x-1/2">
            <Card className="px-6 py-3">
              <p className="text-sm font-medium text-foreground">
                Calibrating point {calibrationStep + 1} of {calibrationPoints.length}
              </p>
            </Card>
          </div>

          {/* Countdown display */}
          {countdownValue !== null && (
            <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/20">
                <span className="text-6xl font-bold text-primary">{countdownValue}</span>
              </div>
            </div>
          )}

          {/* Active calibration point */}
          {countdownValue === null && (
            <button
              onClick={() => handleCalibrationClick(calibrationStep)}
              className={`fixed z-40 flex h-32 w-32 items-center justify-center rounded-full transition-all duration-300 ${
                isStabilizing
                  ? "bg-yellow-500 shadow-lg ring-4 ring-yellow-500/30 animate-pulse"
                  : "bg-primary shadow-lg ring-4 ring-primary/30"
              }`}
              style={{
                left: `${currentPointX}px`,
                top: `${currentPointY}px`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <Target className="h-16 w-16 text-primary-foreground" />
            </button>
          )}

          {/* Instructions overlay */}
          <div className="fixed left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-lg font-medium text-muted-foreground opacity-50">
              {countdownValue !== null
                ? `Get ready... ${countdownValue}`
                : isStabilizing
                ? "Look at the point and keep your gaze steady"
                : "Look at the highlighted point"}
            </p>
          </div>
        </>
      ) : phase === "complete" ? (
        <Card className="max-w-md p-8 text-center shadow-xl">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
              <Check className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="mb-4 text-2xl font-bold text-foreground">
            Calibration Complete
          </h2>
          <p className="mb-6 text-muted-foreground">
            Your eye-tracking system has been calibrated. You can now start tracking.
          </p>
          <div className="space-y-3">
            <Button onClick={handleComplete} className="w-full" size="lg">
              Start Tracking
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
};

export default CalibrationModal;
