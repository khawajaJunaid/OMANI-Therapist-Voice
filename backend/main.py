from fastapi import FastAPI, UploadFile, File, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import tempfile
import openai
import requests
import json
import logging
from datetime import datetime

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}
    
@app.post("/audio-chat")
async def audio_chat(audio: UploadFile = File(...), history: str = Form(None), model: str = Form("gpt4o")):
    """
    Direct audio-to-audio conversation with model selection for evaluation
    model parameter: "gpt4o", "claude", or "both"
    """
    try:
        # Save uploaded audio to a temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as tmp:
            content = await audio.read()
            tmp.write(content)
            tmp_path = tmp.name

        openai.api_key = os.getenv("OPENAI_API_KEY")
        anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
        
        # Step 1: Transcribe the audio using OpenAI Whisper
        with open(tmp_path, "rb") as audio_file:
            transcript_response = openai.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="ar"  # Handles mixed Arabic-English well
            )
            transcript = transcript_response.text

        # Step 2: Analyze intent and emotion from transcript
        transcript_lower = transcript.lower()
        intent = "general_conversation"
        emotion = "neutral"
        
        # Anxiety-related keywords (Arabic and English)
        if any(word in transcript_lower for word in ["قلق", "anxiety", "worried", "خايف", "خوف", "fear", "nervous", "توتر", "stress"]):
            intent = "anxiety_consultation"
            emotion = "anxious"
        # Family-related keywords
        elif any(word in transcript_lower for word in ["عائلة", "family", "أب", "أم", "أخ", "أخت", "father", "mother", "brother", "sister", "parents"]):
            intent = "family_counseling"
        # Work-related keywords
        elif any(word in transcript_lower for word in ["عمل", "شغل", "وظيفة", "work", "job", "career", "office", "boss", "colleague"]):
            intent = "work_stress"
            emotion = "stressed"
        # Depression-related keywords
        elif any(word in transcript_lower for word in ["حزين", "حزن", "sad", "depressed", "اكتئاب", "depression", "hopeless", "يأس", "melancholy"]):
            intent = "depression"
            emotion = "sad"
        # Crisis-related keywords
        elif any(word in transcript_lower for word in ["انتحار", "suicide", "kill myself", "أنتحر", "end my life", "لا أريد العيش"]):
            intent = "crisis_intervention"
            emotion = "crisis"
        # Sleep-related keywords
        elif any(word in transcript_lower for word in ["نوم", "sleep", "أرق", "insomnia", "تعب", "tired", "exhausted"]):
            intent = "sleep_issues"
            emotion = "tired"
        # Relationship keywords
        elif any(word in transcript_lower for word in ["علاقة", "relationship", "حب", "love", "زوج", "زوجة", "husband", "wife", "boyfriend", "girlfriend"]):
            intent = "relationship_counseling"
        
        # Gratitude-related keywords (can be combined with other intents)
        if any(word in transcript_lower for word in ["شكرا", "thank you", "grateful", "ممتن", "appreciate", "thanks"]):
            emotion = "grateful"

        # Step 3: Generate AI response(s)
        system_prompt = (
            "أنت معالج نفسي افتراضي تتحدث باللهجة العمانية، وتقدم دعماً نفسياً حساساً ثقافياً وذو جودة علاجية. "
            "يمكنك فهم والرد على مزيج من العربية والإنجليزية (code-switching). "
            "استخدم مصطلحات الصحة النفسية المناسبة، وكن متعاطفاً، وراعِ القيم الإسلامية والعادات العمانية. "
            "استجب بناءً على نية المستخدم وحالته العاطفية. "
            "إذا تحدث المستخدم بمزيج من العربية والإنجليزية، يمكنك الرد بنفس الطريقة أو بالعربية فقط حسب ما يناسب الموقف."
        )
        
        user_prompt = f"النص: {transcript}\nالنية: {intent}\nالعاطفة: {emotion}"
        
        gpt_response = ""
        claude_response = ""
        
        # Generate GPT-4o response
        if model in ["gpt4o", "both"]:
            try:
                messages = [{"role": "system", "content": system_prompt}]
                if history:
                    try:
                        chat_history = json.loads(history)[-6:]  # last 6 turns
                        for msg in chat_history:
                            if msg["sender"] == "user":
                                messages.append({"role": "user", "content": msg["text"]})
                            else:
                                messages.append({"role": "assistant", "content": msg["text"]})
                    except Exception:
                        pass
                messages.append({"role": "user", "content": user_prompt})
                
                response = openai.chat.completions.create(
                    model="gpt-4o",
                    messages=messages,
                    max_tokens=256,
                    temperature=0.7
                )
                gpt_response = response.choices[0].message.content.strip()
            except Exception as e:
                gpt_response = f"[GPT-4o error: {str(e)}]"
        
        # Generate Claude response
        if model in ["claude", "both"]:
            try:
                anthropic_url = "https://api.anthropic.com/v1/messages"
                headers = {
                    "x-api-key": anthropic_api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                }
                
                # Build Claude-style history
                claude_messages = []
                if history:
                    try:
                        chat_history = json.loads(history)[-6:]
                        for msg in chat_history:
                            if msg["sender"] == "user":
                                claude_messages.append({"role": "user", "content": msg["text"]})
                            else:
                                claude_messages.append({"role": "assistant", "content": msg["text"]})
                    except Exception:
                        pass
                claude_messages.append({"role": "user", "content": user_prompt})
                
                data = {
                    "model": "claude-3-opus-20240229",
                    "max_tokens": 256,
                    "temperature": 0.7,
                    "system": system_prompt,
                    "messages": claude_messages
                }
                r = requests.post(anthropic_url, headers=headers, json=data, timeout=30)
                if r.status_code == 200:
                    result = r.json()
                    claude_response = result["content"][0]["text"].strip() if result.get("content") else "[No response]"
                else:
                    claude_response = f"[Claude error: {r.status_code} {r.text}]"
            except Exception as e:
                claude_response = f"[Claude error: {str(e)}]"
        
        # Step 4: Convert response(s) to speech
        audio_responses = {}
        
        if model == "gpt4o" or model == "both":
            if gpt_response and not gpt_response.startswith("[GPT-4o error"):
                tts_response = openai.audio.speech.create(
                    model="tts-1",
                    voice="nova",
                    input=gpt_response
                )
                audio_responses["gpt4o_audio"] = tts_response.content.hex()
        
        if model == "claude" or model == "both":
            if claude_response and not claude_response.startswith("[Claude error"):
                tts_response = openai.audio.speech.create(
                    model="tts-1",
                    voice="nova",
                    input=claude_response
                )
                audio_responses["claude_audio"] = tts_response.content.hex()
        
        # Clean up temp file
        os.remove(tmp_path)
        
        # Return responses based on model selection
        response_data = {
            "transcript": transcript,
            "intent": intent,
            "emotion": emotion,
            "model_used": model
        }
        
        if model == "gpt4o":
            response_data.update({
                "bot_response": gpt_response,
                "audio_content": audio_responses.get("gpt4o_audio", "")
            })
        elif model == "claude":
            response_data.update({
                "bot_response": claude_response,
                "audio_content": audio_responses.get("claude_audio", "")
            })
        elif model == "both":
            response_data.update({
                "gpt4o_response": gpt_response,
                "claude_response": claude_response,
                "gpt4o_audio": audio_responses.get("gpt4o_audio", ""),
                "claude_audio": audio_responses.get("claude_audio", "")
            })
        
        return JSONResponse(response_data)
        
    except Exception as e:
        # Clean up temp file if it exists
        if 'tmp_path' in locals():
            try:
                os.remove(tmp_path)
            except:
                pass
        return JSONResponse({"error": str(e)}, status_code=500) 