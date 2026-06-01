const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function test() {
  const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
  try {
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', mimeType: 'image/png' } },
          { text: 'What is this?' }
        ]
      }]
    });
    console.log(result.response.text());
  } catch (err) {
    console.error(err.message);
  }
}
test();
