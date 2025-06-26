import { GoogleAuth } from 'google-auth-library';

// Configure the API route to handle raw bodies
export const config = {
  api: {
    bodyParser: false,
  },
};

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

    // If it's a POST request with form data, handle it properly
    if (req.method === 'POST' && req.headers['content-type']?.includes('multipart/form-data')) {
      // Read the raw body stream
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      
      await new Promise((resolve, reject) => {
        req.on('end', resolve);
        req.on('error', reject);
      });
      
      const rawBody = Buffer.concat(chunks);

      // For multipart form data, we need to forward the raw body
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          ...headers,
          'host': new URL(cloudRunUrl).host,
          'Content-Type': req.headers['content-type'],
          'Content-Length': rawBody.length.toString(),
        },
        body: rawBody, // Forward the raw body
      });

      // Get the response data
      const responseData = await response.json();
      
      // Return the response with the same status code
      return res.status(response.status).json(responseData);
    } else {
      // For other request types, forward the body as JSON
      const requestOptions = {
        method: req.method,
        headers: {
          ...headers,
          'host': new URL(cloudRunUrl).host,
          'Content-Type': req.headers['content-type'] || 'application/json',
        },
      };

      if (req.body) {
        requestOptions.body = JSON.stringify(req.body);
      }

      const response = await fetch(targetUrl, requestOptions);
      const responseData = await response.json();
      
      return res.status(response.status).json(responseData);
    }

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
} 