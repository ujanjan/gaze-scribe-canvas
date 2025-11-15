/**
 * GazeCloudAPI Service
 * Integration with GazeCloud eye-tracking API
 */

// Type definitions for GazeCloudAPI
declare global {
  interface Window {
    GazeCloudAPI: {
      StartEyeTracking: () => void;
      StopEyeTracking: () => void;
      UseClickRecalibration: boolean;
      OnResult: (GazeData: GazeCloudData) => void;
      OnCalibrationComplete: () => void;
      OnCamDenied: () => void;
      OnError: (msg: string) => void;
    };
  }
}

export interface GazeCloudData {
  state: number; // 0: valid gaze data; -1: face tracking lost; 1: gaze data uncalibrated
  docX: number; // gaze x in document coordinates
  docY: number; // gaze y in document coordinates
  time: number; // timestamp
}

export interface GazeData {
  x: number;
  y: number;
  timestamp: number;
  calibrated: boolean;
}

type GazeResultCallback = (data: GazeData) => void;
type CalibrationCompleteCallback = () => void;
type ErrorCallback = (error: string) => void;
type CameraDeniedCallback = () => void;

class GazeCloudService {
  private isInitialized = false;
  private isTracking = false;
  private gazeResultCallback: GazeResultCallback | null = null;
  private calibrationCompleteCallback: CalibrationCompleteCallback | null = null;
  private errorCallback: ErrorCallback | null = null;
  private cameraDeniedCallback: CameraDeniedCallback | null = null;

  /**
   * Initialize GazeCloudAPI
   * Loads the library and sets up callbacks
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isInitialized) {
        resolve();
        return;
      }

      // Check if already loaded
      if (window.GazeCloudAPI) {
        this.setupCallbacks();
        this.isInitialized = true;
        resolve();
        return;
      }

      // Load GazeCloudAPI script
      const script = document.createElement("script");
      script.src = "https://api.gazerecorder.com/GazeCloudAPI.js";
      script.async = true;

      script.onload = () => {
        console.log("GazeCloudAPI loaded successfully");
        this.setupCallbacks();
        this.isInitialized = true;
        resolve();
      };

      script.onerror = () => {
        const error = "Failed to load GazeCloudAPI";
        console.error(error);
        reject(new Error(error));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Setup GazeCloudAPI callbacks
   */
  private setupCallbacks(): void {
    if (!window.GazeCloudAPI) return;

    // Enable click-based recalibration for better results
    window.GazeCloudAPI.UseClickRecalibration = true;

    // Handle gaze data results
    window.GazeCloudAPI.OnResult = (GazeData: GazeCloudData) => {
      if (this.isTracking) {
        const data: GazeData = {
          x: GazeData.docX,
          y: GazeData.docY,
          timestamp: Date.now(),
          calibrated: GazeData.state === 0, // Only valid if state is 0
        };

        // Emit custom event for UI components (like GazePointer)
        window.dispatchEvent(
          new CustomEvent("gazeData", {
            detail: { x: GazeData.docX, y: GazeData.docY, calibrated: data.calibrated },
          })
        );

        // Only record if calibrated
        if (data.calibrated && this.gazeResultCallback) {
          this.gazeResultCallback(data);
        }
      }
    };

    // Handle calibration completion
    window.GazeCloudAPI.OnCalibrationComplete = () => {
      console.log("GazeCloud Calibration Complete");
      if (this.calibrationCompleteCallback) {
        this.calibrationCompleteCallback();
      }
    };

    // Handle camera denied
    window.GazeCloudAPI.OnCamDenied = () => {
      console.error("Camera access denied");
      if (this.cameraDeniedCallback) {
        this.cameraDeniedCallback();
      }
    };

    // Handle errors
    window.GazeCloudAPI.OnError = (msg: string) => {
      console.error("GazeCloud Error:", msg);
      if (this.errorCallback) {
        this.errorCallback(msg);
      }
    };
  }

  /**
   * Start eye tracking
   */
  startTracking(): void {
    if (!window.GazeCloudAPI) {
      console.warn("GazeCloudAPI not initialized");
      return;
    }

    window.GazeCloudAPI.StartEyeTracking();
    this.isTracking = true;
    console.log("Eye tracking started");
  }

  /**
   * Stop eye tracking
   */
  stopTracking(): void {
    if (!window.GazeCloudAPI) {
      console.warn("GazeCloudAPI not initialized");
      return;
    }

    window.GazeCloudAPI.StopEyeTracking();
    this.isTracking = false;
    console.log("Eye tracking stopped");
  }

  /**
   * Set callback for gaze results
   */
  setOnGazeResult(callback: GazeResultCallback): void {
    this.gazeResultCallback = callback;
  }

  /**
   * Set callback for calibration complete
   */
  setOnCalibrationComplete(callback: CalibrationCompleteCallback): void {
    this.calibrationCompleteCallback = callback;
  }

  /**
   * Set callback for errors
   */
  setOnError(callback: ErrorCallback): void {
    this.errorCallback = callback;
  }

  /**
   * Set callback for camera denied
   */
  setOnCameraDenied(callback: CameraDeniedCallback): void {
    this.cameraDeniedCallback = callback;
  }

  /**
   * Check if tracking is active
   */
  isTrackingActive(): boolean {
    return this.isTracking;
  }

  /**
   * Check if initialized
   */
  isLibraryInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Enable click-based recalibration for better accuracy
   */
  enableClickRecalibration(enable: boolean): void {
    if (window.GazeCloudAPI) {
      window.GazeCloudAPI.UseClickRecalibration = enable;
    }
  }

  /**
   * Clean up - stop tracking if active
   */
  cleanup(): void {
    if (this.isTracking) {
      this.stopTracking();
    }
  }
}

// Export singleton instance
export const gazeCloudService = new GazeCloudService();

export default gazeCloudService;
