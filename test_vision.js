const fs = require('fs');

async function test() {
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const res = await fetch('http://localhost:3000/api/vision/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: base64,
      mimeType: 'image/png',
      prompt: 'What is this?'
    })
  });
  console.log('POST status:', res.status);
  console.log(await res.text());
}
test();
