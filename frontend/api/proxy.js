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

    // Forward the request body and content-type
    if (req.method === 'POST') {
      // Get the raw body
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const rawBody = Buffer.concat(chunks);
      
      requestOptions.body = rawBody;
      
      // Preserve the original content-type header
      if (req.headers['content-type']) {
        requestOptions.headers['content-type'] = req.headers['content-type'];
      }
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