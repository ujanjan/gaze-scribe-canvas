import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import CalibrationModal from "@/components/CalibrationModal";
import ControlPanel from "@/components/ControlPanel";
import AnalysisResults from "@/components/AnalysisResults";
import geminiService, { AnalysisResult, GazeDataExport } from "@/services/geminiService";
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
  const [showFaceOverlay, setShowFaceOverlay] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const isTrackingRef = useRef(false);
  // Store gaze points in a ref to avoid expensive state updates on every gaze detection
  // State is only updated when tracking stops for final display
  const gazePointsRef = useRef<GazeData[]>([]);
  
  // Periodically update gaze points count for display (every 500ms)
  useEffect(() => {
    if (!isTracking) return;
    
    const interval = setInterval(() => {
      // Update state with current count for display
      setGazePoints([...gazePointsRef.current]);
    }, 500);
    
    return () => clearInterval(interval);
  }, [isTracking]);

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
            if (data && isTrackingRef.current) {
              // Push to ref array (O(1) operation) instead of state update
              gazePointsRef.current.push({
                x: data.x,
                y: data.y,
                timestamp: Date.now(),
              });
            }
          })
          .saveDataAcrossSessions(true)
          .begin();
        
        // Show the video preview for better debugging
        window.webgazer.showVideoPreview(true);
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

    // Restore main tracking gaze listener after calibration
    // Use setTimeout to ensure calibration modal cleanup completes first
    setTimeout(() => {
      if (window.webgazer) {
        const trackingListener = (data: any, timestamp: number) => {
          if (data && data.x != null && data.y != null && isTrackingRef.current) {
            // Push to ref array (O(1) operation) instead of state update
            gazePointsRef.current.push({
              x: data.x,
              y: data.y,
              timestamp: Date.now(),
            });
          }
        };
        window.webgazer.setGazeListener(trackingListener);
        console.log("Tracking gaze listener restored");
      }
    }, 100);

    toast.success("Calibration complete! You can now start tracking.");
  };

  const handleStartTracking = () => {
    if (!isCalibrated) {
      toast.error("Please complete calibration first.");
      return;
    }
    
    // Ensure gaze listener is set up
    if (window.webgazer) {
      const trackingListener = (data: any, timestamp: number) => {
        if (data && data.x != null && data.y != null && isTrackingRef.current) {
          // Push to ref array (O(1) operation) instead of state update
          gazePointsRef.current.push({
            x: data.x,
            y: data.y,
            timestamp: Date.now(),
          });
        }
      };
      window.webgazer.setGazeListener(trackingListener);
      console.log("Tracking gaze listener set up");
    }
    
    setIsTracking(true);
    isTrackingRef.current = true;
    
    // Clear previous gaze points when starting new tracking session
    gazePointsRef.current = [];
    setGazePoints([]);
    
    toast.success("Eye tracking started!");
  };

  const handleStopTracking = () => {
    setIsTracking(false);
    isTrackingRef.current = false;
    // Sync ref to state only when stopping (for final count display)
    setGazePoints([...gazePointsRef.current]);
    const count = gazePointsRef.current.length;
    console.log(`Tracking stopped. ${count} points recorded.`);
    toast.info(`Eye tracking paused. ${count} points recorded.`);
  };

  const handleRecalibrate = () => {
    setIsTracking(false);
    isTrackingRef.current = false;
    // Clear gaze points when recalibrating
    gazePointsRef.current = [];
    setGazePoints([]);
    setIsCalibrated(false);
    setShowCalibration(true);
    toast.info("Starting recalibration...");
  };

  const handleToggleFaceOverlay = () => {
    if (window.webgazer) {
      const newState = !showFaceOverlay;
      window.webgazer.showVideoPreview(newState);
      setShowFaceOverlay(newState);
      toast.info(newState ? "Face overlay shown" : "Face overlay hidden");
    }
  };

  const getExportData = (): GazeDataExport => {
    const textContainer = textContainerRef.current;
    const bounds = textContainer?.getBoundingClientRect() || {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };

    // Use ref data for export (always up-to-date)
    const points = gazePointsRef.current;

    return {
      metadata: {
        sessionDuration:
          points.length > 0
            ? points[points.length - 1].timestamp -
              points[0].timestamp
            : 0,
        totalGazePoints: points.length,
        calibrated: isCalibrated,
        exportTimestamp: new Date().toISOString(),
        textContainerBounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
      },
      rawGazeData: points,
    };
  };

  const handleExportData = () => {
    if (gazePointsRef.current.length === 0) {
      toast.error("No tracking data to export. Please start tracking first.");
      return;
    }

    const exportData = getExportData();

    const dataWithInstructions = {
      ...exportData,
      instructions: {
        description: "Eye-tracking data export",
        format: "JSON with raw gaze coordinates and metadata",
        usage: "This data can be analyzed by LLMs to understand reading patterns, attention distribution, and user engagement with the text content.",
        fields: {
          metadata:
            "Session information including duration, calibration status, and text container positioning",
          rawGazeData:
            "Array of gaze points with x, y coordinates and timestamps in milliseconds",
          textContainerBounds:
            "Position and dimensions of the text content area for mapping gaze points to text regions",
        },
      },
    };

    const blob = new Blob([JSON.stringify(dataWithInstructions, null, 2)], {
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

  const handleAnalyzeWithAI = async () => {
    if (gazePointsRef.current.length === 0) {
      toast.error("No tracking data to analyze. Please start tracking first.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // Get the readable text from the content area
      const readableText = textContainerRef.current?.innerText || "";

      // Call Gemini API with gaze data
      const exportData = getExportData();
      const result = await geminiService.analyzeGazeData(
        exportData,
        readableText
      );

      setAnalysisResult(result);
      toast.success("Analysis complete! Check the results below.");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Analysis error:", error);
      setAnalysisError(errorMessage);
      toast.error(`Analysis failed: ${errorMessage}`);
    } finally {
      setIsAnalyzing(false);
    }
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
                Eye-Tracking Analysis Tool
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
        <div className="flex gap-8">
          {/* Left Column - 70% - Text Content */}
          <div className="w-[70%]">
            <Card className="relative overflow-hidden bg-card p-8">
              <div className="w-full" ref={textContainerRef}>
                <h2 className="mb-6 text-3xl font-bold text-foreground">
                  The History of KTH Royal Institute of Technology
                </h2>

                <div className="space-y-6 text-lg leading-relaxed text-foreground">
                  <p>
                    KTH Royal Institute of Technology, founded in 1827 as the Technological Institute, is Sweden's largest and oldest technical university. Established to meet the growing demand for skilled engineers during Sweden's industrial revolution, the institution received royal status in 1877, becoming Kungliga Tekniska Högskolan. Throughout its nearly two-century history, KTH has remained at the forefront of technical education and innovation in Scandinavia.
                  </p>

                  <p>
                    Located in Stockholm, KTH's campus combines historic architecture with modern facilities across multiple locations. Today, the university educates approximately 13,000 undergraduate and 1,700 postgraduate students with a staff of around 3,500. KTH offers comprehensive programs in engineering, natural sciences, architecture, industrial management, and urban planning, while maintaining strong partnerships with leading universities worldwide and close collaboration with Swedish and international industries—a defining characteristic that ensures research and education remain relevant to real-world challenges.
                  </p>

                  <p>
                    In recent decades, KTH has embraced digital transformation and sustainability as core themes, launching initiatives focused on climate change, renewable energy, and sustainable development. The university continues to evolve and adapt its programs to meet the demands of a rapidly changing technological landscape while maintaining its commitment to excellence. As Sweden and the world face complex challenges in digitalization, urbanization, and environmental sustainability, KTH remains dedicated to developing the knowledge and solutions needed for a better future.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - 30% - Action Buttons and Controls */}
          <div className="w-[30%] space-y-6">
            {/* Control Panel */}
            <ControlPanel
              isTracking={isTracking}
              isCalibrated={isCalibrated}
              gazePointsCount={gazePoints.length}
              onStartTracking={handleStartTracking}
              onStopTracking={handleStopTracking}
              onRecalibrate={handleRecalibrate}
              onExportData={handleExportData}
              onAnalyzeWithAI={handleAnalyzeWithAI}
              onToggleFaceOverlay={handleToggleFaceOverlay}
              showFaceOverlay={showFaceOverlay}
              isAnalyzing={isAnalyzing}
            />

            {/* Analysis Results Panel */}
            <AnalysisResults
              analysisResult={analysisResult}
              isLoading={isAnalyzing}
              error={analysisError}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="container mx-auto px-6">
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
                recording eye movements.
              </li>
              <li>
                <strong>3. Read the Text:</strong> Read through the text naturally while
                your eye movements are being tracked.
              </li>
              <li>
                <strong>4. Export Data:</strong> When finished, click "Export Data" to
                download your tracking data for analysis.
              </li>
            </ol>
          </Card>
        </div>
      </footer>

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
