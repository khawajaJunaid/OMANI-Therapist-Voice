import React, { useState, useRef } from 'react';

function VoiceRecorder({ onRecordingComplete }) {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [evaluation, setEvaluation] = useState({
    helpfulness: 0,
    cultural_sensitivity: 0,
    therapeutic_quality: 0,
    response_length: 0
  });

  const startRecording = async () => {
    setAudioURL(null);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new window.MediaRecorder(stream);
    audioChunksRef.current = [];
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };
    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(audioBlob);
      setAudioURL(url);
      if (onRecordingComplete) onRecordingComplete(audioBlob);
    };
    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const evaluateResponse = (response, criteria) => {
    // Simple evaluation logic
    const metrics = {
      helpfulness: criteria.helpful ? 1 : 0,
      cultural_sensitivity: criteria.cultural ? 1 : 0,
      therapeutic_quality: criteria.therapeutic ? 1 : 0,
      response_length: response.length
    };
    setEvaluation(metrics);
  };

  return (
    <div>
      <button onClick={recording ? stopRecording : startRecording} style={{ fontSize: 18, padding: '10px 20px' }}>
        {recording ? 'Stop Recording' : 'Start Recording'}
      </button>
      {audioURL && (
        <div style={{ marginTop: 16, padding: '12px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <div style={{ marginBottom: 8, fontWeight: 'bold', color: '#495057' }}>Your Recording:</div>
          <audio src={audioURL} controls style={{ width: '100%' }} />
        </div>
      )}
    </div>
  );
}

export default VoiceRecorder; 