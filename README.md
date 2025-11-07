# Eye-Tracking Heatmap Visualization Tool

A web application for eye-tracking research using WebGazer.js. This tool captures eye movements in real-time and visualizes them as a heatmap overlay on text content.

## Features

- **WebGazer.js Integration**: Browser-based eye tracking using webcam
- **Calibration System**: 9-point calibration for improved accuracy
- **Real-time Heatmap**: Live visualization of attention and focus areas
- **Data Export**: Export tracking data in LLM-friendly JSON format
- **Recalibration**: Ability to recalibrate at any time during the session
- **Prediction Dot**: Visible cursor showing current gaze position

## Running Locally

### Prerequisites
- Node.js (v18 or higher) and npm installed
- A webcam
- Modern web browser (Chrome, Firefox, or Edge recommended)

### Installation & Running

1. Clone this repository
```bash
git clone <repository-url>
cd <project-directory>
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:8080`

5. **Important**: Grant webcam permissions when prompted by your browser

## Deploying Online

This application can be deployed to various free hosting platforms:

### Netlify (Recommended)

1. Push your code to a GitHub repository
2. Go to [Netlify](https://netlify.com) and sign up/log in
3. Click "New site from Git"
4. Select your repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Click "Deploy site"

### Vercel

1. Push your code to a GitHub repository
2. Go to [Vercel](https://vercel.com) and sign up/log in
3. Click "Import Project"
4. Select your repository
5. Vercel will auto-detect settings
6. Click "Deploy"

### GitHub Pages

1. In your repository, go to Settings → Pages
2. Select the branch you want to deploy
3. Update `vite.config.ts` to include:
   ```typescript
   base: '/your-repo-name/'
   ```
4. Build and deploy:
   ```bash
   npm run build
   git add dist -f
   git commit -m "Deploy to GitHub Pages"
   git subtree push --prefix dist origin gh-pages
   ```

## How to Use

### 1. Initial Calibration
- When you first load the page, you'll see a calibration modal
- Click "Start Calibration"
- Look directly at each of the 9 points as they appear and click on them
- The calibration improves tracking accuracy

### 2. Start Tracking
- After calibration, click the "Start Tracking" button
- Begin reading the text naturally
- The heatmap will update in real-time showing where you're looking
- You'll see a dot following your gaze

### 3. Control Your Session
- **Stop Tracking**: Pause the tracking at any time
- **Recalibrate**: If tracking seems inaccurate, recalibrate
- **Export Data**: Download your tracking data when finished

### 4. Export and Analysis
- Click "Export Data" to download a JSON file
- The file contains raw gaze coordinates and session metadata
- This data is structured for easy analysis by LLMs

## Exported Data Format

The exported JSON file contains:

```json
{
  "metadata": {
    "sessionDuration": 45320,
    "totalGazePoints": 2847,
    "calibrated": true,
    "exportTimestamp": "2025-01-15T10:30:45.123Z",
    "textContainerBounds": {
      "x": 200,
      "y": 150,
      "width": 800,
      "height": 600
    }
  },
  "rawGazeData": [
    {
      "x": 450,
      "y": 320,
      "timestamp": 1705318245123
    }
    // ... more gaze points
  ],
  "instructions": {
    "description": "Eye-tracking heatmap data export",
    "format": "JSON with raw gaze coordinates and metadata",
    "usage": "This data can be analyzed by LLMs...",
    "fields": {
      // Field descriptions
    }
  }
}
```

### Data Fields Explained

- **metadata.sessionDuration**: Total tracking time in milliseconds
- **metadata.totalGazePoints**: Number of gaze points captured
- **metadata.textContainerBounds**: Position and size of the text area on screen
- **rawGazeData**: Array of all gaze points with x/y coordinates (in pixels) and timestamps

### Analyzing with LLMs

The exported data can be used to:
- Identify which text sections received most attention
- Calculate reading patterns and speed
- Detect areas of confusion (repeated fixations)
- Compare attention across different paragraphs
- Analyze reading order and flow

Example prompt for LLM analysis:
```
Analyze this eye-tracking data and identify:
1. Which paragraphs received the most attention
2. Areas where the reader seemed confused (repeated fixations)
3. Overall reading pattern (linear vs. scattered)
4. Engagement level based on fixation duration
```

## Interpreting the Heatmap

The heatmap uses a standard color scheme:

- 🔵 **Blue**: Low attention/few fixations
- 🟢 **Green**: Moderate attention
- 🟡 **Yellow**: High attention
- 🟠 **Orange**: Very high attention
- 🔴 **Red**: Maximum attention/most fixations

**What to look for:**
- Red/orange zones indicate areas where the reader spent most time
- Blue zones indicate areas that were skipped or glanced at quickly
- Scattered hotspots may indicate confusion or difficulty
- Linear patterns suggest smooth reading flow

## Tips for Best Results

1. **Lighting**: Ensure good, even lighting on your face
2. **Position**: Sit at a comfortable distance from the screen (50-70cm)
3. **Stability**: Keep your head relatively still during tracking
4. **Calibration**: Recalibrate if the prediction dot seems inaccurate
5. **Browser**: Use Chrome or Firefox for best WebGazer.js performance
6. **Privacy**: All processing happens in your browser - no data is sent to servers

## Troubleshooting

**Tracking is inaccurate:**
- Try recalibrating
- Check your lighting
- Ensure your face is clearly visible to the webcam
- Close other applications using the webcam

**Page won't load:**
- Make sure you granted webcam permissions
- Try refreshing the page
- Check browser console for errors

**Heatmap not appearing:**
- Ensure you've clicked "Start Tracking"
- Complete calibration first
- Check that gaze points are being recorded (shown in control panel)

## Technical Details

- **Framework**: React + TypeScript + Vite
- **Eye Tracking**: WebGazer.js (TFFacemesh tracker, Ridge regression)
- **UI Components**: shadcn/ui with Tailwind CSS
- **Heatmap**: Custom canvas-based implementation

## Privacy & Data

- All eye tracking happens locally in your browser
- No data is sent to external servers
- WebGazer.js may store calibration data in browser localStorage
- Exported data is saved only to your local machine

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ⚠️ Safari (limited support)
- ❌ Internet Explorer (not supported)

## License

This project uses WebGazer.js which is licensed under GPL-3.0. See the [WebGazer.js repository](https://github.com/brownhci/WebGazer) for details.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review WebGazer.js documentation
3. Check browser console for error messages

---

Built with [Lovable](https://lovable.dev) | Powered by [WebGazer.js](https://webgazer.cs.brown.edu/)
