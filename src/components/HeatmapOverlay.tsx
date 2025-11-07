import { useEffect, useRef } from "react";

interface GazeData {
  x: number;
  y: number;
  timestamp: number;
}

interface HeatmapOverlayProps {
  gazePoints: GazeData[];
  containerRef: React.RefObject<HTMLDivElement>;
}

const HeatmapOverlay = ({ gazePoints, containerRef }: HeatmapOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match container
    const bounds = container.getBoundingClientRect();
    canvas.width = bounds.width;
    canvas.height = bounds.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Filter gaze points that fall within the container
    const containerGazePoints = gazePoints.filter((point) => {
      return (
        point.x >= bounds.left &&
        point.x <= bounds.right &&
        point.y >= bounds.top &&
        point.y <= bounds.bottom
      );
    });

    if (containerGazePoints.length === 0) return;

    // Create heatmap
    const radius = 60; // Radius of each gaze point's influence
    const intensityMap = new Map<string, number>();

    // Build intensity map
    containerGazePoints.forEach((point) => {
      const relativeX = point.x - bounds.left;
      const relativeY = point.y - bounds.top;

      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= radius) {
            const x = Math.floor(relativeX + dx);
            const y = Math.floor(relativeY + dy);
            const key = `${x},${y}`;

            // Calculate intensity based on distance (closer = higher intensity)
            const intensity = 1 - distance / radius;
            const currentIntensity = intensityMap.get(key) || 0;
            intensityMap.set(key, currentIntensity + intensity);
          }
        }
      }
    });

    // Find max intensity for normalization
    let maxIntensity = 0;
    intensityMap.forEach((intensity) => {
      if (intensity > maxIntensity) maxIntensity = intensity;
    });

    // Draw heatmap
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;

    intensityMap.forEach((intensity, key) => {
      const [x, y] = key.split(",").map(Number);
      if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
        const normalizedIntensity = intensity / maxIntensity;
        const color = getHeatmapColor(normalizedIntensity);

        const index = (y * canvas.width + x) * 4;
        data[index] = color.r;
        data[index + 1] = color.g;
        data[index + 2] = color.b;
        data[index + 3] = color.a;
      }
    });

    ctx.putImageData(imageData, 0, 0);

    // Apply blur for smoother heatmap
    ctx.filter = "blur(20px)";
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = "none";
  }, [gazePoints, containerRef]);

  // Standard heatmap color scheme: blue -> green -> yellow -> orange -> red
  const getHeatmapColor = (
    intensity: number
  ): { r: number; g: number; b: number; a: number } => {
    const alpha = Math.min(180, intensity * 180); // Max opacity at 180/255

    if (intensity < 0.2) {
      // Blue
      return { r: 0, g: 0, b: 255, a: alpha };
    } else if (intensity < 0.4) {
      // Blue to Cyan
      const t = (intensity - 0.2) / 0.2;
      return {
        r: 0,
        g: Math.floor(255 * t),
        b: 255,
        a: alpha,
      };
    } else if (intensity < 0.6) {
      // Cyan to Green
      const t = (intensity - 0.4) / 0.2;
      return {
        r: 0,
        g: 255,
        b: Math.floor(255 * (1 - t)),
        a: alpha,
      };
    } else if (intensity < 0.8) {
      // Green to Yellow
      const t = (intensity - 0.6) / 0.2;
      return {
        r: Math.floor(255 * t),
        g: 255,
        b: 0,
        a: alpha,
      };
    } else {
      // Yellow to Red
      const t = (intensity - 0.8) / 0.2;
      return {
        r: 255,
        g: Math.floor(255 * (1 - t)),
        b: 0,
        a: alpha,
      };
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute left-0 top-0 h-full w-full"
      style={{ mixBlendMode: "multiply" }}
    />
  );
};

export default HeatmapOverlay;
