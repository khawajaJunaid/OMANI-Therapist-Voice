import React, { useState, useRef, useEffect } from 'react';
import VoiceRecorder from './VoiceRecorder';
import AuthWrapper from './AuthWrapper';

function App() {
  const [chat, setChat] = useState([]); // { sender: 'user'|'bot', text: string }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [botAudioUrl, setBotAudioUrl] = useState(null);
  const [selectedModel, setSelectedModel] = useState('gpt4o'); // 'gpt4o', 'claude', 'both'
  const audioRef = useRef(null);

  const handleRecordingComplete = async (audioBlob) => {
    setError('');
    setLoading(true);
    setBotAudioUrl(null);
    
    try {
      // Send audio to the Vercel proxy endpoint
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('history', JSON.stringify(chat));
      formData.append('model', selectedModel);
      
      console.log('Sending audio to Vercel proxy...');
      let response = await fetch('/api/proxy', {
        method: 'POST',
        body: formData,
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        let backendMsg = '';
        try { 
          backendMsg = await response.text(); 
          console.log('Backend error response:', backendMsg);
        } catch (e) {
          console.log('Could not read error response:', e);
        }
        throw new Error(`Audio chat failed (${response.status} ${response.statusText}): ${backendMsg}`);
      }
      
      const data = await response.json();
      console.log('Backend response data:', data);
      
      const transcript = data.transcript;
      const botResponse = data.bot_response;
      
      // Add both user and bot messages to chat
      setChat((prev) => [...prev, 
        { sender: 'user', text: transcript },
        { sender: 'bot', text: botResponse }
      ]);
      
      // Convert hex audio content back to blob and play
      if (data.audio_content) {
        const audioBytes = new Uint8Array(data.audio_content.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setBotAudioUrl(audioUrl);
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play();
          }
        }, 200);
      }
      
    } catch (err) {
      console.error('Error in handleRecordingComplete:', err);
      let details = err.message;
      if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        details = 'Network error: Could not connect to backend server. Please ensure the backend is running and accessible.';
      }
      if (err.stack) details += '\n' + err.stack;
      setError('Error: ' + details);
    } finally {
      setLoading(false);
    }
  };

  const VoiceBotApp = () => (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', marginTop: 40, background: '#f4f8fb', minHeight: '100vh' }}>
      <h1>OMANI-Therapist-Voice</h1>
      <p>Direct Audio-to-Audio Omani Arabic Mental Health Chatbot</p>
      <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
        Speak naturally - your voice goes directly to AI and back as voice response
      </p>

      
      <div style={{ margin: '40px auto', maxWidth: 400, padding: 20, background: '#fff', border: '1px solid #eee', borderRadius: 16, minHeight: 480, boxShadow: '0 2px 8px #0001' }}>
        <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 16, textAlign: 'left', padding: 4 }}>
          {chat.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                marginBottom: 8
              }}
            >
              {msg.sender === 'bot' && (
                <img
                  src="https://ui-avatars.com/api/?name=Therapist&background=0D8ABC&color=fff"
                  alt="Therapist"
                  style={{ width: 32, height: 32, borderRadius: '50%', marginRight: 8 }}
                />
              )}
              <div
                style={{
                  background: msg.sender === 'user' ? '#0D8ABC' : '#eee',
                  color: msg.sender === 'user' ? '#fff' : '#222',
                  borderRadius: 16,
                  padding: '10px 16px',
                  maxWidth: 220,
                  fontSize: 16,
                  boxShadow: '0 1px 4px #0001',
                  marginLeft: msg.sender === 'user' ? 0 : 8,
                  marginRight: msg.sender === 'user' ? 8 : 0
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                  {msg.sender === 'user' ? 'You' : 'Therapist'}
                </div>
                <div>{msg.text}</div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Model Selection */}
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: '#333' }}>
            Choose AI Model:
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '14px',
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
          >
            <option value="gpt4o">GPT-4o</option>
            <option value="claude">Claude</option>
            <option value="both">Both Models</option>
          </select>
        </div>
        
        <VoiceRecorder onRecordingComplete={handleRecordingComplete} />
        {loading && <p style={{ color: '#888' }}>Processing...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {botAudioUrl && (
          <audio ref={audioRef} src={botAudioUrl} autoPlay style={{ display: 'none' }} />
        )}
      </div>
    </div>
  );

  return (
    <AuthWrapper>
      <VoiceBotApp />
    </AuthWrapper>
  );
}

export default App; 