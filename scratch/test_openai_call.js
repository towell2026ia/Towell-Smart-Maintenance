const apiKey = process.env.OPENAI_API_KEY;

async function testKey() {
  console.log('Testing OPENAI_API_KEY...');
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: 'Ping' }],
        max_tokens: 5
      })
    });
    console.log('HTTP Status:', res.status);
    const body = await res.text();
    console.log('Response:', body);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testKey();
