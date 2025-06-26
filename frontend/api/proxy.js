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
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });
    
    const client = await auth.getIdTokenClient(cloudRunUrl);
    const headers = await client.getRequestHeaders();

    // Prepare the request to Cloud Run
    const requestOptions = {
      method: req.method,
      headers: {
        ...req.headers,
        ...headers, // This includes the Authorization: Bearer <token>
        'host': new URL(cloudRunUrl).host, // Set correct host header
      },
    };

    // Add body for non-GET requests
    if (req.method !== 'GET' && req.body) {
      requestOptions.body = req.body;
    }

    // Forward the request to Cloud Run
    const response = await fetch(cloudRunUrl, requestOptions);

    // Get response data
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
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
    if (contentType && contentType.includes('application/json')) {
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