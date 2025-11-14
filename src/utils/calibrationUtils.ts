export interface CalibrationResult {
  meanError: number;
  maxError: number;
  stdDev: number;
  quality: 'good' | 'acceptable' | 'poor';
  pointErrors: Array<{ point: number; error: number }>;
}

export interface CalibrationPoint {
  x: number;
  y: number;
}

export interface GazeSample {
  x: number;
  y: number;
  timestamp: number;
}

/**
 * Calculate distance between two points
 */
export function calculateDistance(
  point1: { x: number; y: number },
  point2: { x: number; y: number }
): number {
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
  );
}

/**
 * Calculate mean of an array of numbers
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate standard deviation of an array of numbers
 */
export function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = calculateMean(values);
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const variance = calculateMean(squaredDiffs);
  return Math.sqrt(variance);
}

/**
 * Determine calibration quality based on mean error
 */
export function determineQuality(meanError: number): 'good' | 'acceptable' | 'poor' {
  if (meanError < 50) return 'good';
  if (meanError < 100) return 'acceptable';
  return 'poor';
}

/**
 * Calculate calibration validation metrics
 */
export function calculateCalibrationMetrics(
  calibrationPoints: CalibrationPoint[],
  gazeSamples: GazeSample[][],
  screenWidth: number,
  screenHeight: number
): CalibrationResult {
  const pointErrors: Array<{ point: number; error: number }> = [];
  const allErrors: number[] = [];

  calibrationPoints.forEach((point, index) => {
    const targetX = (screenWidth * point.x) / 100;
    const targetY = (screenHeight * point.y) / 100;
    const samples = gazeSamples[index] || [];

    if (samples.length === 0) {
      pointErrors.push({ point: index, error: Infinity });
      return;
    }

    // Calculate average gaze position for this point
    const avgGazeX = calculateMean(samples.map((s) => s.x));
    const avgGazeY = calculateMean(samples.map((s) => s.y));

    // Calculate error distance
    const error = calculateDistance(
      { x: targetX, y: targetY },
      { x: avgGazeX, y: avgGazeY }
    );

    pointErrors.push({ point: index, error });
    allErrors.push(error);
  });

  const meanError = calculateMean(allErrors);
  const maxError = Math.max(...allErrors);
  const stdDev = calculateStdDev(allErrors);
  const quality = determineQuality(meanError);

  return {
    meanError,
    maxError,
    stdDev,
    quality,
    pointErrors,
  };
}

/**
 * Average multiple gaze samples
 */
export function averageGazeSamples(samples: GazeSample[]): { x: number; y: number } {
  if (samples.length === 0) return { x: 0, y: 0 };
  return {
    x: calculateMean(samples.map((s) => s.x)),
    y: calculateMean(samples.map((s) => s.y)),
  };
}

