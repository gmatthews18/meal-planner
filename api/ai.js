// Vercel Serverless Function for secure AI proxy
// This keeps your Hugging Face API key secret

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get API key from environment variable
  const apiKey = process.env.HUGGING_FACE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { inputs, parameters } = req.body;

    // Validate input
    if (!inputs || typeof inputs !== 'string') {
      return res.status(400).json({ error: 'Invalid input' });
    }

    // Call Hugging Face API
    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs,
          parameters: parameters || { max_length: 500 },
        }),
      }
    );

    const data = await response.json();

    // Return the response
    res.status(200).json(data);
  } catch (error) {
    console.error('AI API Error:', error);
    res.status(500).json({
      error: 'Failed to process request',
      message: error.message
    });
  }
}
