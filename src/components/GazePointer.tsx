import { useEffect, useState } from "react";

interface GazePointerProps {
  isTracking: boolean;
}

const GazePointer = ({ isTracking }: GazePointerProps) => {
  const [gazePosition, setGazePosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isTracking) {
      setGazePosition(null);
      return;
    }

    // Listen to GazeCloud data from window
    const handleGazeData = (event: any) => {
      if (event.detail && event.detail.x !== undefined && event.detail.y !== undefined) {
        setGazePosition({
          x: event.detail.x,
          y: event.detail.y,
        });
      }
    };

    window.addEventListener("gazeData", handleGazeData);

    return () => {
      window.removeEventListener("gazeData", handleGazeData);
    };
  }, [isTracking]);

  if (!isTracking || !gazePosition) {
    return null;
  }

  return (
    <>
      {/* Gaze pointer dot */}
      <div
        className="fixed z-10 pointer-events-none"
        style={{
          left: `${gazePosition.x}px`,
          top: `${gazePosition.y}px`,
          transform: "translate(-50%, -50%)",
        }}
      >
        {/* Outer ring */}
        <div className="absolute w-8 h-8 border-2 border-primary rounded-full opacity-60" />
        {/* Inner dot */}
        <div className="absolute w-2 h-2 bg-primary rounded-full left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        {/* Crosshair */}
        <div className="absolute w-6 h-0.5 bg-primary opacity-40 left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute h-6 w-0.5 bg-primary opacity-40 left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Coordinates display */}
      <div className="fixed top-4 right-4 z-10 bg-background/80 backdrop-blur border border-border rounded-lg px-3 py-2 pointer-events-none">
        <p className="text-xs font-mono text-foreground">
          X: {Math.round(gazePosition.x)} | Y: {Math.round(gazePosition.y)}
        </p>
      </div>
    </>
  );
};

export default GazePointer;
