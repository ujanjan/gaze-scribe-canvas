import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import CalibrationModal from "@/components/CalibrationModal";
import HeatmapOverlay from "@/components/HeatmapOverlay";
import ControlPanel from "@/components/ControlPanel";
import { Eye } from "lucide-react";

// Type definitions for WebGazer
declare global {
  interface Window {
    webgazer: any;
  }
}

interface GazeData {
  x: number;
  y: number;
  timestamp: number;
}

const Index = () => {
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const [gazePoints, setGazePoints] = useState<GazeData[]>([]);
  const [webgazerLoaded, setWebgazerLoaded] = useState(false);
  const textContainerRef = useRef<HTMLDivElement>(null);

  // Load WebGazer.js
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://webgazer.cs.brown.edu/webgazer.js";
    script.async = true;
    script.onload = () => {
      console.log("WebGazer loaded successfully");
      setWebgazerLoaded(true);
      
      // Initialize WebGazer
      if (window.webgazer) {
        window.webgazer
          .setRegression("ridge")
          .setTracker("TFFacemesh")
          .setGazeListener((data: any, timestamp: number) => {
            if (data && isTracking) {
              setGazePoints((prev) => [
                ...prev,
                { x: data.x, y: data.y, timestamp: Date.now() },
              ]);
            }
          })
          .saveDataAcrossSessions(true)
          .begin();
        
        // Hide the video preview by default
        window.webgazer.showVideoPreview(false);
        window.webgazer.showPredictionPoints(true);
      }
    };
    script.onerror = () => {
      toast.error("Failed to load WebGazer.js. Please refresh the page.");
    };
    document.body.appendChild(script);

    return () => {
      if (window.webgazer) {
        window.webgazer.end();
      }
    };
  }, []);

  useEffect(() => {
    if (webgazerLoaded && !isCalibrated) {
      // Show calibration modal after a brief delay
      setTimeout(() => {
        setShowCalibration(true);
      }, 1000);
    }
  }, [webgazerLoaded, isCalibrated]);

  const handleCalibrationComplete = () => {
    setIsCalibrated(true);
    setShowCalibration(false);
    toast.success("Calibration complete! You can now start tracking.");
  };

  const handleStartTracking = () => {
    if (!isCalibrated) {
      toast.error("Please complete calibration first.");
      return;
    }
    setIsTracking(true);
    toast.success("Eye tracking started");
  };

  const handleStopTracking = () => {
    setIsTracking(false);
    toast.info("Eye tracking paused");
  };

  const handleRecalibrate = () => {
    setIsTracking(false);
    setShowCalibration(true);
    toast.info("Starting recalibration...");
  };

  const handleExportData = () => {
    if (gazePoints.length === 0) {
      toast.error("No tracking data to export. Please start tracking first.");
      return;
    }

    // Calculate heatmap intensity data
    const textContainer = textContainerRef.current;
    if (!textContainer) return;

    const bounds = textContainer.getBoundingClientRect();
    const exportData = {
      metadata: {
        sessionDuration: gazePoints.length > 0 
          ? gazePoints[gazePoints.length - 1].timestamp - gazePoints[0].timestamp 
          : 0,
        totalGazePoints: gazePoints.length,
        calibrated: isCalibrated,
        exportTimestamp: new Date().toISOString(),
        textContainerBounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
      },
      rawGazeData: gazePoints,
      instructions: {
        description: "Eye-tracking heatmap data export",
        format: "JSON with raw gaze coordinates and metadata",
        usage: "This data can be analyzed by LLMs to understand reading patterns, attention distribution, and user engagement with the text content.",
        fields: {
          metadata: "Session information including duration, calibration status, and text container positioning",
          rawGazeData: "Array of gaze points with x, y coordinates and timestamps in milliseconds",
          textContainerBounds: "Position and dimensions of the text content area for mapping gaze points to text regions",
        },
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eye-tracking-data-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Data exported successfully!");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Eye className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Eye-Tracking Heatmap Visualization
              </h1>
              <p className="text-sm text-muted-foreground">
                WebGazer.js Research Tool
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Control Panel */}
          <ControlPanel
            isTracking={isTracking}
            isCalibrated={isCalibrated}
            gazePointsCount={gazePoints.length}
            onStartTracking={handleStartTracking}
            onStopTracking={handleStopTracking}
            onRecalibrate={handleRecalibrate}
            onExportData={handleExportData}
          />

          {/* Text Content with Heatmap Overlay */}
          <Card className="relative overflow-hidden bg-card p-8">
            <div className="mx-auto w-full max-w-2xl" ref={textContainerRef}>
              <h2 className="mb-6 text-3xl font-bold text-foreground">
                The History of KTH Royal Institute of Technology
              </h2>

              <div className="space-y-6 text-lg leading-relaxed text-foreground">
                <p>
                  KTH Royal Institute of Technology, founded in 1827, stands as Sweden's
                  largest and oldest technical university. Originally established as the
                  Technological Institute (Teknologiska Institutet), it was created to
                  meet the growing need for skilled engineers during Sweden's industrial
                  revolution. The institution received its royal status in 1877, becoming
                  Kungliga Tekniska Högskolan, which translates to "Royal Institute of
                  Technology" in English. Throughout its nearly two-century history, KTH
                  has been at the forefront of technical education and innovation in
                  Scandinavia.
                </p>

                <p>
                  Located in the heart of Stockholm, KTH's main campus occupies a
                  magnificent site that combines historic architecture with modern
                  facilities. The campus has expanded significantly over the years, now
                  encompassing multiple locations across Stockholm. Today, KTH educates
                  approximately 13,000 undergraduate and 1,700 postgraduate students,
                  employing around 3,500 staff members. The university offers programs
                  spanning a wide range of disciplines including engineering, natural
                  sciences, architecture, industrial management, and urban planning,
                  making it a comprehensive institution for technical and scientific
                  education.
                </p>

                <p>
                  KTH has produced numerous notable alumni who have made significant
                  contributions to science, technology, and industry. The university's
                  research output is substantial, with KTH researchers publishing
                  extensively in prestigious international journals. The institution has
                  established strong partnerships with leading universities worldwide and
                  maintains close collaboration with Swedish and international industries.
                  This connection between academia and industry has been a defining
                  characteristic of KTH throughout its history, ensuring that research
                  and education remain relevant to real-world challenges and
                  opportunities.
                </p>

                <p>
                  In recent decades, KTH has embraced digital transformation and
                  sustainability as core themes in its research and education. The
                  university has launched several initiatives focused on climate change,
                  renewable energy, and sustainable development. KTH continues to evolve,
                  adapting its programs to meet the demands of a rapidly changing
                  technological landscape while maintaining its commitment to excellence
                  in education and research. As Sweden and the world face complex
                  challenges in areas such as digitalization, urbanization, and
                  environmental sustainability, KTH remains dedicated to developing the
                  knowledge and solutions needed for a better future.
                </p>
              </div>

              {/* Heatmap Overlay */}
              {isTracking && (
                <HeatmapOverlay
                  gazePoints={gazePoints}
                  containerRef={textContainerRef}
                />
              )}
            </div>
          </Card>

          {/* Info Card */}
          <Card className="bg-muted p-6">
            <h3 className="mb-3 text-lg font-semibold text-foreground">
              How to Use This Tool
            </h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li>
                <strong>1. Calibration:</strong> Complete the initial calibration by
                clicking on the points displayed on screen. This helps improve tracking
                accuracy.
              </li>
              <li>
                <strong>2. Start Tracking:</strong> Click "Start Tracking" to begin
                recording eye movements and generating the heatmap.
              </li>
              <li>
                <strong>3. Read the Text:</strong> Read through the text naturally. The
                heatmap will update in real-time showing where your attention is focused.
              </li>
              <li>
                <strong>4. Export Data:</strong> When finished, click "Export Data" to
                download your tracking data for analysis.
              </li>
            </ol>
          </Card>
        </div>
      </main>

      {/* Calibration Modal */}
      {showCalibration && (
        <CalibrationModal
          isOpen={showCalibration}
          onComplete={handleCalibrationComplete}
          onClose={() => setShowCalibration(false)}
        />
      )}
    </div>
  );
};

export default Index;
