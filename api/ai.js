export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, apiKey } = req.body;

  if (!prompt || !apiKey) {
    return res.status(400).json({ error: 'Missing prompt or API key' });
  }

  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/gpt2',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_length: 150,
            num_return_sequences: 1
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: `Hugging Face API error: ${response.statusText}`,
        details: errorText
      });
    }

    const result = await response.json();

    // GPT-2 returns an array with generated_text
    if (Array.isArray(result) && result[0]?.generated_text) {
      res.status(200).json(result);
    } else if (result.generated_text) {
      res.status(200).json([result]);
    } else if (result.error) {
      res.status(400).json({ error: result.error });
    } else {
      res.status(200).json(result);
    }
  } catch (error) {
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
}
