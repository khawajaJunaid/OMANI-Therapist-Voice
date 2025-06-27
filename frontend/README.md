# Frontend (React)

A React-based voice chat interface for the Omani Therapist Voice Bot.

## 🚀 Quick Start

### Using Docker (Recommended)

From the project root:
```bash
docker-compose up --build
```

Then open http://localhost:3000 in your browser.

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm start
   ```

3. **Access the application**:
   - Open http://localhost:3000 in your browser
   - Allow microphone access when prompted

## 📁 Project Structure

```
frontend/
├── src/
│   ├── App.js              # Main application component
│   ├── VoiceRecorder.js    # Voice recording and playback
│   └── api/
│       └── proxy.js        # API communication
├── public/
│   └── index.html          # HTML template
└── package.json            # Dependencies and scripts
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the frontend directory:

```env
# Backend API URL
REACT_APP_API_URL=http://localhost:8000
```

## 🎨 Components

### VoiceRecorder.js
Core component for voice interaction:
- Real-time audio capture
- Audio streaming to backend
- Response playback
- Visual feedback for recording states

## 🧪 Testing

```bash
npm test
```

## 🚀 Production Build

### Local Build
```bash
npm run build
```

### Docker Build
```bash
docker build -t omani-therapist-frontend .
docker run -p 3000:3000 omani-therapist-frontend
```

## 🔒 Security

- **Microphone Permissions**: Clear user consent for microphone access
- **Data Privacy**: No audio data is stored locally

## 🐛 Troubleshooting

### Common Issues

**Microphone not working:**
- Check browser permissions
- Ensure HTTPS in production
- Test with different browsers

**Audio playback issues:**
- Check audio format compatibility
- Verify backend TTS response format

**Network errors:**
- Verify backend is running on port 8000
- Check API endpoint configuration

## 📱 Browser Support

- Chrome 66+
- Firefox 60+
- Safari 11+
- Edge 79+

**Note**: Voice recording requires HTTPS in production environments. 