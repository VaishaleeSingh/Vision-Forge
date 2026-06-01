const fs = require('fs');

async function test() {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  let apiKey = '';
  for (const line of envFile.split('\n')) {
    if (line.startsWith('GEMINI_API_KEY=')) {
      apiKey = line.split('=')[1].trim();
    }
  }

  if (!apiKey) {
    console.error("No API key");
    return;
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.models) {
    const modelNames = data.models.map(m => m.name);
    console.log(modelNames.join('\n'));
  } else {
    console.log(data);
  }
}
test();
