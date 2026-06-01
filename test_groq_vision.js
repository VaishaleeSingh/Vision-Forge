const Groq = require('groq-sdk');
require('dotenv').config({ path: '.env.local' });

async function test() {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.2-90b-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is this?' },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' } }
          ]
        }
      ]
    });
    console.log(res.choices[0].message.content);
  } catch (err) {
    console.error(err.message);
  }
}
test();
