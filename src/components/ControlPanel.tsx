import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Download, Trash2 } from "lucide-react";

interface ControlPanelProps {
  isTracking: boolean;
  isCalibrated: boolean;
  gazePointsCount: number;
  onStartTracking: () => void;
  onStopTracking: () => void;
  onRecalibrate: () => void;
  onExportData: () => void;
  onClearHeatmap?: () => void;
}

const ControlPanel = ({
  isTracking,
  isCalibrated,
  gazePointsCount,
  onStartTracking,
  onStopTracking,
  onRecalibrate,
  onExportData,
  onClearHeatmap,
}: ControlPanelProps) => {
  return (
    <Card className="p-6">
      <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
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

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {!isTracking ? (
            <Button
              onClick={onStartTracking}
              disabled={!isCalibrated}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Start Tracking
            </Button>
          ) : (
            <Button onClick={onStopTracking} variant="secondary" className="gap-2">
              <Pause className="h-4 w-4" />
              Stop Tracking
            </Button>
          )}

          <Button onClick={onRecalibrate} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Recalibrate
          </Button>

          <Button
            onClick={onExportData}
            variant="outline"
            className="gap-2"
            disabled={gazePointsCount === 0}
          >
            <Download className="h-4 w-4" />
            Export Data
          </Button>

          {onClearHeatmap && gazePointsCount > 0 && (
            <Button
              onClick={onClearHeatmap}
              variant="outline"
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear Heatmap
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ControlPanel;
