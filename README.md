# Omani Therapist Voice Bot

A real-time, voice-only Omani Arabic mental health chatbot with culturally sensitive, therapeutic-grade conversations.

## 🚀 Quick Start (Docker)

### Prerequisites
- Docker and Docker Compose installed
- API keys for OpenAI and Anthropic

### Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd voice-bot
   ```

2. **Set up environment variables**:
   ```bash
   cp backend/env.example backend/.env
   # Edit backend/.env with your API keys
   ```

3. **Start the application**:
   ```bash
   docker-compose up --build
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

That's it! The application is now running locally with Docker.

## 📊 Model Performance Results

### Overall Model Comparison (GPT-4o vs Claude-3-Opus)

| Metric                  | GPT-4o   | Claude   | Winner |
| ----------------------- | -------- | -------- | ------ |
| Intent Accuracy (Avg)   | **4.1**  | 3.4      | GPT-4o |
| Cultural Score (Avg)    | **4.8**  | 3.6      | GPT-4o |
| Therapeutic Score (Avg) | **4.1**  | 3.2      | GPT-4o |
| Safety Score (Avg)      | **4.2**  | 3.6      | GPT-4o |
| Response Time (Avg)     | ~17.62s  | ~17.91s  | Tie    |

### Key Findings:
- **GPT-4o** performs better across all therapeutic scenarios
- **Cultural sensitivity** is significantly stronger with GPT-4o (4.8 vs 3.6)
- **Crisis intervention** needs improvement for both models
- **Response times** are nearly identical between models

📋 **Detailed testing results**: [View Complete Metrics Tracker](./docs/METRICS_TRACKER.md)

📝 **Conversation logs**: [View Chat Logs](./docs/conversations/) - Real conversation examples from testing scenarios

## 🏗️ Production Deployment

### Architecture Overview

The application is deployed using a secure, scalable architecture:

- **Frontend**: Deployed to Vercel with a proxy function for authentication
- **Backend**: Deployed to Google Cloud Run as an authenticated service
- **Authentication**: Google ID tokens handled by Vercel proxy → Cloud Run

### Backend Deployment (Google Cloud Run)

1. **Build and deploy to Cloud Run**:
   ```bash
   # Build the container
   docker build -t omani-therapist-backend ./backend
   
   # Deploy to Cloud Run (authenticated service)
   gcloud run deploy omani-therapist-backend \
     --image omani-therapist-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated=false \
     --set-env-vars="OPENAI_API_KEY=your_key,ANTHROPIC_API_KEY=your_key"
   ```

2. **Configure service account** (if needed):
   ```bash
   # Create service account for the proxy
   gcloud iam service-accounts create vercel-proxy \
     --display-name="Vercel Proxy Service Account"
   
   # Grant necessary permissions
   gcloud projects add-iam-policy-binding your-project-id \
     --member="serviceAccount:vercel-proxy@your-project-id.iam.gserviceaccount.com" \
     --role="roles/run.invoker"
   ```

### Frontend Deployment (Vercel)

1. **Set up Vercel environment variables**:
   ```env
   CLOUD_RUN_URL=https://your-service-name-xxxxx-uc.a.run.app
   GCP_SA_KEY={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
   ```

2. **Deploy to Vercel**:
   ```bash
   cd frontend
   vercel --prod
   ```

### Authentication Flow

1. **Vercel Proxy Function** (`/api/proxy.js`):
   - Receives audio files from the frontend
   - Generates Google ID tokens using service account credentials
   - Forwards authenticated requests to Cloud Run

2. **Cloud Run Service**:
   - Accepts only authenticated requests
   - Processes audio files and returns AI responses
   - Handles STT, LLM processing, and TTS

### Security Features

- ✅ **Authenticated Cloud Run Service**: Only accepts requests with valid Google ID tokens
- ✅ **Secure Proxy**: Vercel function adds authentication headers


## 📊 System Architecture

### Architecture Diagram

![System Architecture](./Architecture%20diagram.png)

*The diagram shows the complete system flow from user interaction through Vercel frontend, proxy authentication, Google Cloud Run backend, and AI service integration.*

### Key Architecture Components

- **User Interface**: Web browser with voice recording capabilities
- **Frontend (Vercel)**: React app with proxy function for authentication
- **Backend (Cloud Run)**: FastAPI service with authenticated endpoints
- **AI Services**: OpenAI (Whisper, GPT-4o, TTS-1) and Anthropic (Claude 3 Opus)
- **Authentication**: Google ID tokens via service account
- **Data Flow**: Secure audio processing pipeline with real-time responses

## 📁 Project Structure

```
voice-bot/
├── frontend/          # React app for voice chat UI
│   ├── api/
│   │   └── proxy.js   # Vercel proxy function for authentication
│   └── vercel.json    # Vercel deployment configuration
├── backend/           # FastAPI backend (STT, LLM, TTS)
├── docs/              # Documentation and guides
└── docker-compose.yml # Container orchestration (local development)
```

## 🔧 Configuration

### Required API Keys

Create a `.env` file in the `backend/` directory with:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Anthropic Configuration (for Claude)
ANTHROPIC_API_KEY=your_anthropic_api_key

# Google Cloud Configuration (for STT/TTS)
GOOGLE_APPLICATION_CREDENTIALS=./gcloud-key.json
```

### Google Cloud Setup

1. Create a Google Cloud project
2. Enable Speech-to-Text and Text-to-Speech APIs
3. Create a service account and download credentials as `gcloud-key.json`
4. Place `gcloud-key.json` in the `backend/` directory

## 🏗️ Architecture

1. **Voice Capture & STT**: Real-time audio transcription
2. **AI Response**: GPT-4o (primary) with Claude Opus 4 (fallback)
3. **Cultural Adaptation**: Omani Arabic language and cultural context

## 📚 Documentation

- **Frontend Setup**: See `/frontend/README.md`
- **Backend Setup**: See `/backend/README.md`

## Future Roadmap
- Service sepration for transcription and guardrais
- For effective messages we can use a smaller model for intent classification and diagnosing issues quicker, set functios to call in case of crisis after identifying key words
- Persistent chat history storage for revisiting old conversations and maintaiing a log of conversations
