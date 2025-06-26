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
      // Vercel automatically parses multipart data, so we need to reconstruct it
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const formData = [];
      
      // Add audio file if present
      if (req.files && req.files.audio) {
        const audioFile = req.files.audio;
        formData.push(`--${boundary}`);
        formData.push('Content-Disposition: form-data; name="audio"; filename="audio.webm"');
        formData.push('Content-Type: audio/webm');
        formData.push('');
        formData.push(audioFile.data);
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
      
      requestOptions.body = formDataBuffer;
      requestOptions.headers['content-type'] = `multipart/form-data; boundary=${boundary}`;
    }

    // Forward the request to Cloud Run
    const response = await fetch(targetUrl, requestOptions);

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