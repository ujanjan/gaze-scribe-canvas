# Eye-Tracking Analysis Tool

A web application for eye-tracking research using WebGazer.js with AI-powered analysis. This tool captures eye movements in real-time and uses Google's Gemini AI to provide intelligent insights about reading patterns and user engagement.

## Features

- **GazeCloud API Integration**: Cloud-based real-time eye tracking using webcam with optimized calibration
- **Calibration System**: 9-point calibration for improved accuracy
- **AI-Powered Analysis**: Gemini API integration for intelligent gaze pattern analysis
- **Data Export**: Export tracking data in LLM-friendly JSON format
- **Recalibration**: Ability to recalibrate at any time during the session
- **Prediction Dot**: Visible cursor showing current gaze position
- **Analysis Results Panel**: Display AI analysis directly in the UI

## Running Locally

### Prerequisites
- Node.js (v18 or higher) and npm installed
- A webcam
- Modern web browser (Chrome, Firefox, or Edge recommended)
- Google Gemini API key (optional, for AI analysis features)

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

3. **(Optional) Set up Gemini API for AI Analysis**

   Get your free API key from [Google AI Studio](https://ai.google.dev)

   Create a `.env.local` file in the project root:
   ```bash
   cp .env.example .env.local
   ```

   Add your API key to `.env.local`:
   ```
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```

4. Start the development server
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:8080`

6. **Important**: Grant webcam permissions when prompted by your browser

## Deploying Online

This application can be deployed to various free hosting platforms:

### Cloudflare Pages (Recommended)

1. Push your code to a GitHub, GitLab, or Bitbucket repository
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) and sign up/log in
3. Navigate to **Pages** → **Create a project**
4. Connect your Git repository
5. Configure build settings:
   - **Framework preset**: Vite (or select "None" and configure manually)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (leave as default)
   - **Node.js version**: 18 or higher
   - **Package manager**: npm (Cloudflare will auto-detect from `package-lock.json`)
6. Add environment variables (optional, for AI features):
   - Go to **Settings** → **Environment variables**
   - Add variable:
     - **Variable name**: `VITE_GEMINI_API_KEY`
     - **Value**: Your Gemini API key
   - Apply to **Production**, **Preview**, and **Branch** environments as needed
7. Click **Save and Deploy**

**Note**: The `_redirects` file in the `public` directory ensures proper SPA routing on Cloudflare Pages.

### Netlify

1. Push your code to a GitHub repository
2. Go to [Netlify](https://netlify.com) and sign up/log in
3. Click "New site from Git"
4. Select your repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Add environment variables in Netlify dashboard:
   - Key: `VITE_GEMINI_API_KEY`
   - Value: Your Gemini API key (optional, for AI features)
7. Click "Deploy site"

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

Note: GitHub Pages doesn't support environment variables, so AI analysis features won't work unless you use a backend API proxy.

## How to Use

### 1. Initial Calibration
- When you first load the page, you'll see a calibration modal
- Click "Start Calibration"
- Look directly at each of the 9 points as they appear and click on them
- The calibration improves tracking accuracy

### 2. Start Tracking
- After calibration, click the "Start Tracking" button
- Begin reading the text naturally
- Your gaze movements will be tracked and recorded
- You'll see a dot following your gaze

### 3. Control Your Session
- **Stop Tracking**: Pause the tracking at any time
- **Recalibrate**: If tracking seems inaccurate, recalibrate
- **Export Data**: Download your tracking data in JSON format
- **Analyze with AI** ✨: Click this button to get intelligent analysis (requires Gemini API key)

### 4. AI Analysis (Optional)
- After tracking, click the "Analyze with AI" button
- The system will:
  - Send your gaze coordinate data to Google's Gemini AI
  - Analyze the reading patterns based on coordinate data
  - Display results directly in the interface
- View analysis results in the "Analysis Results" panel:
  - **Reading Pattern**: How the user read (linear, scanning, focused, etc.)
  - **Attention Areas**: Which regions received most focus based on gaze point density
  - **Engagement Metrics**: Estimated engagement level
  - **Recommendations**: Content optimization suggestions
- Copy individual sections or download the full report

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
    "usage": "This data can be analyzed by LLMs to understand reading patterns and engagement...",
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

## AI Analysis with Gemini

When you click "Analyze with AI", the tool sends:

1. **Gaze Coordinates**: Raw JSON data with exact gaze positions and timing
2. **Text Content**: The original text being analyzed for context

Gemini then provides analysis on:

- **Reading Patterns**: Whether you read linearly, scanned content, or focused on specific areas
- **Attention Distribution**: Which sections got the most focus
- **Engagement Level**: Estimated engagement based on fixation patterns
- **Content Insights**: What the reading behavior reveals about comprehension and interest
- **Recommendations**: Suggestions for improving content layout or presentation

### Requirements for AI Analysis

- Valid Google Gemini API key (free tier available)
- Internet connection
- Modern browser

### Privacy Notes for AI Analysis

- The gaze coordinate data is sent directly to Google's Gemini API
- No data is stored on external servers by this application
- Review Google's privacy policy for Gemini API data handling
- All processing is request-based with no persistent storage

## Analyzing with LLMs

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

## Tips for Best Results

1. **Lighting**: Ensure good, even lighting on your face
2. **Position**: Sit at a comfortable distance from the screen (50-70cm)
3. **Stability**: Keep your head relatively still during tracking
4. **Calibration**: Recalibrate if the prediction dot seems inaccurate
5. **Browser**: Use Chrome, Firefox, Edge, Safari 11+, or Opera 40+ for GazeCloud API support
6. **Privacy**: All processing happens in your browser - no data is sent to servers

## Troubleshooting

**Tracking is inaccurate:**
- Try recalibrating
- Check your lighting
- Ensure your face is clearly visible to the webcam
- Close other applications using the webcam

**"Analyze with AI" button not working:**
- Ensure `VITE_GEMINI_API_KEY` is set in `.env.local`
- Verify your API key is valid at [Google AI Studio](https://ai.google.dev)
- Check your API quota/usage
- Open browser console (F12) for detailed error messages
- Ensure you have internet connection

**"Invalid response from Gemini API" error:**
- Your API key may be invalid or expired
- You may have reached your API quota
- Try again after a few moments
- Check the browser console for response details

**Page won't load:**
- Make sure you granted webcam permissions
- Try refreshing the page
- Check browser console for errors

**Tracking not working:**
- Ensure you've clicked "Start Tracking"
- Complete calibration first
- Check that gaze points are being recorded (shown in control panel)

## Technical Details

- **Framework**: React + TypeScript + Vite
- **Eye Tracking**: GazeCloud API (Real-time online eye-tracking, cloud-based processing)
- **AI Analysis**: Google Gemini 2.0 Flash API
- **UI Components**: shadcn/ui with Tailwind CSS
- **State Management**: React Hooks + local state

## Privacy & Data

- All eye tracking happens locally in your browser
- No gaze data is sent to external servers (unless you use AI analysis)
- When using AI Analysis: gaze coordinate data is sent to Google's Gemini API
- GazeCloud API stores calibration data on their servers for your domain (registered at api.gazerecorder.com)
- Exported data is saved only to your local machine
- Review [Google's privacy policy](https://policies.google.com/privacy) for AI analysis data handling

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ⚠️ Safari (limited support)
- ❌ Internet Explorer (not supported)

## License

This project uses GazeCloud API which is licensed under proprietary terms. See the [GazeCloud website](https://gazerecorder.com/gazecloudapi/) for details.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Register your domain at https://api.gazerecorder.com/register/
3. Check browser console for error messages
4. For AI analysis issues, see the "Analyze with AI" troubleshooting section

---

## Version History

### v1.1.0 - AI Analysis Release (init-gemini branch)
- ✨ Added Google Gemini API integration for intelligent gaze analysis
- 📊 New "Analyze with AI" feature with inline results panel
- 📝 AI-generated insights on reading patterns and engagement
- 📥 Download analysis reports
- ✂️ Copy individual analysis sections

### v1.0.0 - Initial Release
- Eye tracking with GazeCloud API (requires domain registration)
- Calibration system
- JSON data export
- Web-based UI with Tailwind CSS

---

Built with [Lovable](https://lovable.dev) | Powered by [GazeCloud API](https://gazerecorder.com/gazecloudapi/) | AI by [Google Gemini](https://ai.google.dev)
