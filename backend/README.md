# Backend (FastAPI)

A FastAPI backend service for the Omani Therapist Voice Bot.

## 🚀 Quick Start

### Using Docker (Recommended)

From the project root:
```bash
docker-compose up --build
```

The backend will be available at http://localhost:8000

### Local Development

1. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**:
   ```bash
   cp env.example .env
   # Edit .env with your API keys
   ```

4. **Start the server**:
   ```bash
   uvicorn main:app --reload
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic Configuration (for Claude)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### Required API Keys

- **OpenAI API Key**: For GPT-4o, Whisper STT, and TTS
- **Anthropic API Key**: For Claude Opus 4 integration

## 📡 API Endpoints

### Health Check

#### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

### Audio Chat (Main Endpoint)

#### `POST /audio-chat`
Complete audio-to-audio conversation endpoint. Handles speech-to-text, AI response generation, and text-to-speech in one call.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `audio`: Audio file (WebM format recommended)
  - `history`: JSON string of conversation history (optional)
  - `model`: Model selection - "gpt4o", "claude", or "both" (default: "gpt4o")

**Example Request:**
```bash
curl -X POST \
  -F "audio=@user_audio.webm" \
  -F "history=[{\"sender\":\"user\",\"text\":\"مرحبا\"},{\"sender\":\"bot\",\"text\":\"أهلا وسهلا\"}]" \
  -F "model=gpt4o" \
  http://localhost:8000/audio-chat
```

**Response (GPT-4o model):**
```json
{
  "transcript": "مرحبا، أشعر بالقلق اليوم",
  "intent": "anxiety_consultation",
  "emotion": "anxious",
  "model_used": "gpt4o",
  "bot_response": "أفهم أنك تشعر بالقلق. دعنا نتحدث عن ما يزعجك.",
  "audio_content": "hex_encoded_audio_data"
}
```

**Response (Claude model):**
```json
{
  "transcript": "مرحبا، أشعر بالقلق اليوم",
  "intent": "anxiety_consultation",
  "emotion": "anxious",
  "model_used": "claude",
  "bot_response": "أفهم أنك تشعر بالقلق. دعنا نتحدث عن ما يزعجك.",
  "audio_content": "hex_encoded_audio_data"
}
```

**Response (Both models):**
```json
{
  "transcript": "مرحبا، أشعر بالقلق اليوم",
  "intent": "anxiety_consultation",
  "emotion": "anxious",
  "model_used": "both",
  "gpt4o_response": "أفهم أنك تشعر بالقلق. دعنا نتحدث عن ما يزعجك.",
  "claude_response": "أفهم أنك تشعر بالقلق. دعنا نتحدث عن ما يزعجك.",
  "gpt4o_audio": "hex_encoded_audio_data",
  "claude_audio": "hex_encoded_audio_data"
}
```

## 🏗️ Architecture

### Request Flow

1. **Audio Input** → OpenAI Whisper for transcription
2. **Intent Analysis** → Keyword-based intent and emotion detection
3. **AI Response** → GPT-4o and/or Claude Opus 4 generation
4. **Text-to-Speech** → OpenAI TTS for audio response
5. **Response** → Complete audio and text data

### Supported Intents

The system automatically detects conversation intent based on keywords:

- **anxiety_consultation**: قلق, anxiety, worried, خايف, خوف, fear
- **family_counseling**: عائلة, family, أب, أم, أخ, أخت
- **work_stress**: عمل, شغل, وظيفة, work, job, career
- **depression**: حزين, حزن, sad, depressed, اكتئاب
- **crisis_intervention**: انتحار, suicide, kill myself, أنتحر
- **sleep_issues**: نوم, sleep, أرق, insomnia, تعب
- **relationship_counseling**: علاقة, relationship, حب, love

### Models

- **Primary**: GPT-4o for main conversation
- **Alternative**: Claude Opus 4 for comparison/evaluation
- **STT**: OpenAI Whisper for Arabic transcription
- **TTS**: OpenAI TTS-1 for audio synthesis




### Docker Build
```bash
docker build -t omani-therapist-backend .
docker run -p 8000:8000 omani-therapist-backend
```

### Using Docker Compose
From the project root:
```bash
docker-compose up --build
```
