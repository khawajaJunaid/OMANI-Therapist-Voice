import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
  try {
    // Get Cloud Run URL from environment variable
    const cloudRunUrl = process.env.CLOUD_RUN_URL;
    
    if (!cloudRunUrl) {
      return res.status(500).json({ error: 'CLOUD_RUN_URL environment variable not set' });
    }

    // Get Google Service Account key from environment variable
    const serviceAccountKey = process.env.GCP_SA_KEY;
    
    if (!serviceAccountKey) {
      return res.status(500).json({ error: 'GCP_SA_KEY environment variable not set' });
    }

    // Generate Google ID token for authentication
    const auth = new GoogleAuth({
      credentials: JSON.parse(serviceAccountKey),
    });
    
    const client = await auth.getIdTokenClient(cloudRunUrl);
    const headers = await client.getRequestHeaders();

    // Construct the full URL for the audio-chat endpoint
    const targetUrl = `${cloudRunUrl}/audio-chat`;

    // Prepare the request to Cloud Run
    const requestOptions = {
      method: req.method,
      headers: {
        ...headers, // This includes the Authorization: Bearer <token>
        'host': new URL(cloudRunUrl).host, // Set correct host header
      },
    };

    // Handle multipart form data
    if (req.method === 'POST') {
      console.log('Request headers:', req.headers);
      console.log('Request body keys:', Object.keys(req.body || {}));
      console.log('Request files keys:', Object.keys(req.files || {}));
      
      // Try to get the raw body first
      const rawBody = await new Promise((resolve) => {
        let data = Buffer.alloc(0);
        req.on('data', chunk => {
          data = Buffer.concat([data, chunk]);
        });
        req.on('end', () => {
          resolve(data);
        });
      });
      
      console.log('Raw body length:', rawBody.length);
      
      // If we have a raw body with content-type multipart, use it directly
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('multipart/form-data') && rawBody.length > 0) {
        console.log('Using raw multipart body');
        requestOptions.body = rawBody;
        requestOptions.headers['content-type'] = contentType;
      } else {
        // Fallback: try to reconstruct from parsed data
        console.log('Reconstructing multipart data from parsed fields');
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const formData = [];
        
        // Add audio file if present
        if (req.files && req.files.audio) {
          console.log('Found audio file in req.files');
          const audioFile = req.files.audio;
          formData.push(`--${boundary}`);
          formData.push('Content-Disposition: form-data; name="audio"; filename="audio.webm"');
          formData.push('Content-Type: audio/webm');
          formData.push('');
          formData.push(audioFile.data);
        } else if (req.body && req.body.audio) {
          console.log('Found audio in req.body');
          // If audio is in body, it might be base64 encoded
          const audioBuffer = Buffer.from(req.body.audio, 'base64');
          formData.push(`--${boundary}`);
          formData.push('Content-Disposition: form-data; name="audio"; filename="audio.webm"');
          formData.push('Content-Type: audio/webm');
          formData.push('');
          formData.push(audioBuffer);
        } else {
          console.log('No audio found in req.files or req.body');
        }
        
        // Add history if present
        if (req.body && req.body.history) {
          formData.push(`--${boundary}`);
          formData.push('Content-Disposition: form-data; name="history"');
          formData.push('');
          formData.push(req.body.history);
        }
        
        // Add model if present
        if (req.body && req.body.model) {
          formData.push(`--${boundary}`);
          formData.push('Content-Disposition: form-data; name="model"');
          formData.push('');
          formData.push(req.body.model);
        }
        
        formData.push(`--${boundary}--`);
        
        // Join form data parts
        const formDataBuffer = Buffer.concat(formData.map(part => 
          typeof part === 'string' ? Buffer.from(part + '\r\n') : part
        ));
        
        console.log('Reconstructed form data length:', formDataBuffer.length);
        requestOptions.body = formDataBuffer;
        requestOptions.headers['content-type'] = `multipart/form-data; boundary=${boundary}`;
      }
    }

    console.log('Forwarding request to:', targetUrl);
    console.log('Request options:', {
      method: requestOptions.method,
      headers: requestOptions.headers,
      bodyLength: requestOptions.body ? requestOptions.body.length : 0
    });

    // Forward the request to Cloud Run
    const response = await fetch(targetUrl, requestOptions);

    console.log('Response status:', response.status);

    // Get response data
    const responseContentType = response.headers.get('content-type');
    let data;
    
    if (responseContentType && responseContentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.arrayBuffer();
    }

    // Set response status and headers
    res.status(response.status);
    
    // Forward response headers (excluding some that Vercel handles)
    const headersToForward = ['content-type', 'content-length', 'cache-control'];
    for (const header of headersToForward) {
      const value = response.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    }

    // Send response
    if (responseContentType && responseContentType.includes('application/json')) {
      res.json(data);
    } else {
      res.send(Buffer.from(data));
    }

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 