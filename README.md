# VisionForge

## Project Description
**VisionForge** is an advanced, all-in-one AI creative workspace designed to streamline daily tasks through powerful artificial intelligence. Built with a modern Next.js stack, it acts as a central hub where users can generate beautiful images, draft high-quality text, chat directly with their private PDF documents, screen resumes, and deploy autonomous "AI Agents" to conduct deep research and write comprehensive reports. By seamlessly integrating multiple top-tier AI models (like Gemini 2.0 and Llama 3) into a single intuitive dashboard, VisionForge empowers creators, developers, and professionals to 10x their productivity without jumping between different apps.

Below is a simple breakdown of how everything works inside VisionForge.

---

## 🤖 1. AI Agents Workflow

**What is it?**
Instead of just asking an AI a single question, the "AI Agents" feature lets you trigger a multi-step workflow where different specialized AIs talk to each other to complete a complex task from start to finish.

**How the workflow happens:**
1. **The User Prompt:** You type in a complex request (e.g., "Research the history of quantum computing and write a 5-paragraph blog post about it").
2. **The Orchestrator:** The system looks at your request and decides which "Agent" needs to act first.
3. **The Researcher:** A dedicated Researcher AI takes the prompt, goes out, and gathers all the factual data and context.
4. **The Writer:** Once the Researcher is done, the Writer AI takes the research notes and drafts the actual blog post.
5. **The Critic:** The Critic AI reviews the Writer's draft. If it finds mistakes or things to improve, it tells the Writer to fix it.
6. **Final Output:** Once the Critic approves, the final polished result is streamed directly to your screen in beautiful formatting!

**How the Code Works (Frontend & Backend):**
- **Frontend (`src/app/(dashboard)/agents/page.tsx`):** The React UI sends a POST request with the user's prompt to the `/api/agents/run` backend route. It then listens to a Server-Sent Events (SSE) stream to display real-time status updates ("Researcher thinking...", "Writer drafting...") so the user isn't stuck waiting blindly.
- **Backend (`src/app/api/agents/run/route.ts`):** The Next.js API route acts as the Orchestrator. It uses the `@google/generative-ai` SDK (or Groq SDK as a fallback) to loop through the agents. As each agent finishes its step, the backend yields an SSE chunk `data: { type: 'step_update' }` to the frontend. When the Critic approves the final text, the backend saves the run to MongoDB (`AgentRun` model) and yields `data: { type: 'result' }`.

---

## 📝 2. Text Studio

**What is it?**
Your personal AI copywriter. Perfect for single-shot tasks like writing emails, summarizing articles, or brainstorming ideas.

**How the workflow happens:**
1. You type what you want to write.
2. You select a "Tone" (Professional, Casual, Funny) and a "Format" (Email, Blog Post, Code).
3. The AI streams the text directly to your screen in real-time, just like a human typing. 
4. The result is automatically saved to your Library.

**How the Code Works (Frontend & Backend):**
- **Frontend:** The React UI calls the `/api/generate/text` endpoint and uses the browser's native `ReadableStream` API to read chunks of text as they arrive, instantly appending them to the UI state.
- **Backend:** The Next.js API route takes the prompt, tone, and format, constructs a system prompt, and calls Google Gemini using `streamGenerateContent`. It instantly pipes the stream back to the client using Next.js `StreamingTextResponse`. In the `finally` block of the stream, it connects to MongoDB and saves the full text as a `Generation` document.

---

## 🎨 3. Image Studio

**What is it?**
An AI image generator powered by Pollinations AI. 

**How the workflow happens:**
1. You describe the image you want to see (e.g., "A futuristic city at sunset, cyberpunk style").
2. You pick an aspect ratio (Square, Portrait, Landscape) and an art style.
3. VisionForge generates a unique seed behind the scenes to ensure you get a completely brand new image every time.
4. The image is generated and saved directly to your MongoDB database so you never lose it.

**How the Code Works (Frontend & Backend):**
- **Frontend:** The user selects options and submits. The UI shows a loading spinner and sends a standard POST JSON request to `/api/generate/image`. 
- **Backend:** The backend doesn't need to stream. It constructs a highly detailed URL for the `image.pollinations.ai` API using the prompt, width, height, and a random seed. It then immediately saves this URL to MongoDB as a `Generation` (type: image) and returns the URL to the frontend, which renders it in an `<img>` tag.

---

## 📚 4. Knowledge Base (RAG)

**What is it?**
"RAG" stands for Retrieval-Augmented Generation. In simple terms: it lets you chat with your own PDF documents!

**How the workflow happens:**
1. **Upload:** You upload a PDF document (like a textbook, manual, or report).
2. **Reading:** VisionForge extracts all the text from the PDF.
3. **Chatting:** When you ask a question in the chat box, the AI looks specifically at the text inside your uploaded PDF to find the answer. It will *only* answer based on your document, preventing it from making things up!

**How the Code Works (Frontend & Backend):**
- **Frontend:** The user uploads a file using a drag-and-drop zone. The file is sent as `FormData` to `/api/knowledge/upload`. After upload, the chat interface opens.
- **Backend (Upload):** The API uses `pdf-parse` to extract raw text from the buffer and saves it to MongoDB in the `KnowledgeDocument` collection.
- **Backend (Chat):** When the user chats, the UI calls `/api/knowledge/chat`. The backend fetches the specific `KnowledgeDocument` from MongoDB, injects its massive text into the system prompt ("You are answering questions based ONLY on this text: ..."), and streams the AI's response back to the client.

---

## 💼 5. Resume Screener

**What is it?**
An automated HR assistant that tells you if a candidate is a good fit for a job.

**How the workflow happens:**
1. You upload a candidate's Resume (PDF file).
2. You paste the Job Description (JD).
3. The AI reads both and streams back a detailed evaluation: an overall match percentage, the candidate's core strengths, their missing skills, and a final recommendation on whether to hire them.
4. This evaluation is automatically saved to your Library so you can review candidates later.

**How the Code Works (Frontend & Backend):**
- **Frontend:** The user uploads the resume PDF and pastes the Job Description string. The frontend sends this as `FormData` to the `/api/resume-screener` endpoint.
- **Backend:** The API uses `pdf-parse` to extract the text from the resume. It then constructs a highly structured prompt asking the AI to evaluate the resume against the JD and format the output in Markdown. It uses the `groq-sdk` to stream the response back. As the stream closes, the backend saves the evaluation to MongoDB as a `text` Generation with the metadata `format: 'resume-screener'`.

---

## 📖 6. Global Library & Command Palette

**What is it?**
The brain that remembers everything you do.

**How the workflow happens:**
- **The Library:** Every time you generate Text, Images, or Resume Screens, they are saved to your secure MongoDB database. You can view them all in the "Library" tab, favorite the best ones, or delete the bad ones.
- **The Command Palette:** Press `Ctrl + K` (or click the search button) anywhere in the app to open the Global Search. As you type, it instantly searches through your past generations so you can jump right back to an old idea! You can also use it to navigate quickly between the different tools.

**How the Code Works (Frontend & Backend):**
- **Frontend:** The Command Palette uses a `useEffect` debounce timer. When the user stops typing for 300ms, it fetches `/api/library?search={term}`.
- **Backend:** The Library API is fully connected to Mongoose. It uses MongoDB's `$regex` operator (`{ prompt: { $regex: search, $options: 'i' } }`) to do lightning-fast substring searches across the user's secure dataset and returns the JSON array back to the Palette UI for instant rendering.

---

### Tech Stack
* **Frontend:** Next.js 14, React, Tailwind CSS, Framer Motion
* **Backend:** Next.js API Routes, Node.js
* **Database:** MongoDB (via Mongoose)
---

## 🚀 Getting Started (Installation & Setup)

To run VisionForge locally on your own machine, follow these steps:

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/visionforge.git
cd visionforge
```

### 2. Install Dependencies
Make sure you have Node.js installed, then run:
```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Set up Environment Variables
Create a `.env.local` file in the root of your project and add the following keys. You will need to sign up for these free API services:
```env
# Database
MONGODB_URI="your_mongodb_connection_string"

# Authentication
AUTH_SECRET="a_random_secure_string_for_nextauth"
AUTH_GOOGLE_ID="your_google_oauth_client_id"
AUTH_GOOGLE_SECRET="your_google_oauth_client_secret"

# AI Providers
GEMINI_API_KEY="your_google_gemini_api_key"
GROQ_API_KEY="your_groq_llama3_api_key"
```

### 4. Run the Development Server
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. You will be prompted to log in with your Google account to start using the AI tools!
