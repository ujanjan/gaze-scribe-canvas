import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Download, Eye, EyeOff, Sparkles } from "lucide-react";

interface ControlPanelProps {
  isTracking: boolean;
  isCalibrated: boolean;
  gazePointsCount: number;
  onStartTracking: () => void;
  onStopTracking: () => void;
  onRecalibrate: () => void;
  onExportData: () => void;
  onAnalyzeWithAI?: () => void;
  onToggleFaceOverlay?: () => void;
  showFaceOverlay?: boolean;
  isAnalyzing?: boolean;
}

const ControlPanel = ({
  isTracking,
  isCalibrated,
  gazePointsCount,
  onStartTracking,
  onStopTracking,
  onRecalibrate,
  onExportData,
  onAnalyzeWithAI,
  onToggleFaceOverlay,
  showFaceOverlay = true,
  isAnalyzing = false,
}: ControlPanelProps) => {
  return (
    <Card className="p-6">
      <div className="flex flex-col gap-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {!isTracking ? (
            <Button
              onClick={onStartTracking}
              disabled={!isCalibrated}
              className="gap-2 w-40"
            >
              <Play className="h-4 w-4" />
              Start Tracking
            </Button>
          ) : (
            <Button onClick={onStopTracking} variant="secondary" className="gap-2 w-40">
              <Pause className="h-4 w-4" />
              Stop Tracking
            </Button>
          )}

          <Button onClick={onRecalibrate} variant="outline" className="gap-2 w-40">
            <RotateCcw className="h-4 w-4" />
            Recalibrate
          </Button>

          <Button
            onClick={onExportData}
            variant="outline"
            className="gap-2 w-40"
            disabled={gazePointsCount === 0}
          >
            <Download className="h-4 w-4" />
            Export Data
          </Button>

          {onAnalyzeWithAI && gazePointsCount > 0 && (
            <Button
              onClick={onAnalyzeWithAI}
              variant="secondary"
              className="gap-2 w-40"
              disabled={isAnalyzing}
            >
              <Sparkles className="h-4 w-4" />
              {isAnalyzing ? "Analyzing..." : "Analyze with AI"}
            </Button>
          )}

          {onToggleFaceOverlay && (
            <Button
              onClick={onToggleFaceOverlay}
              variant="outline"
              className="gap-2 w-40"
            >
              {showFaceOverlay ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Hide Face Overlay
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Show Face Overlay
                </>
              )}
            </Button>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          <div
            className={`flex h-3 w-3 rounded-full ${
              isTracking
                ? "bg-success animate-pulse"
                : isCalibrated
                ? "bg-accent"
                : "bg-muted-foreground"
            }`}
          />
          <div>
            <p className="text-sm font-medium text-foreground">
              {isTracking
                ? "Tracking Active"
                : isCalibrated
                ? "Ready to Track"
                : "Calibration Required"}
            </p>
            <p className="text-xs text-muted-foreground">
              {gazePointsCount} gaze points recorded
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ControlPanel;
