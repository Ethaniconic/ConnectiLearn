# ConnectiLearn 🎓

ConnectiLearn is a premium, AI-driven educational platform designed around **Neil Fleming's VARK Learning Model**. By assessing students' individual cognitive preferences, the platform dynamically tailors study documents into customized interactive assets corresponding to Visual, Auditory, Read/Write, and Kinesthetic profiles.

---

## 🚀 Key Features

### 🧠 1. Smart VARK Questionnaire
- A 16-question situational diagnostic that maps cognitive preferences.
- Uses Fleming's relative threshold algorithm to resolve single-modal or multimodal study profiles (e.g., `VK`, `VARK`).

### 📊 2. Dynamic Dashboard & Visualizer
- Visualizes learning styles with a premium SVG Radar Chart profile.
- Shows real-time progress bars, points accumulated across modalities, and telemetry.

### 📚 3. Multi-Sensory Study Engine (8 Interactive Tools)
- **Visual (V)**:
  - *Interactive Mindmap Canvas*: Drag-and-drop nodes with responsive Bezier link curves on a zoomable, pannable grid.
  - *Color-Coded Memory Flashcards*: Double-sided flip cards supporting keyboard navigation (`Space`, `Left`/`Right` arrows).
  - *Concept Art Generator*: Generates visual diagrams via Cloud GPUs.
- **Auditory (A)**:
  - *Dual-Host Radio Podcast*: Playable educational dialogue between hosts Alex and Dr. Taylor.
  - *Aura AI Voice Tutor*: Conversational tutor that utilizes speech recognition (mic input) and stops playback on tab switches.
  - *Mnemonic Memory Songs*: Catchy rhyming verses and choruses generated to memorize facts.
  - *Verbal Recaps*: 60-second summarization streams.
- **Read/Write (R)**:
  - *Cornell Notes Grid*: Systematic study layouts mapping cues, keywords, and summary sections.
  - *Socratic Q&A Guides*: Active textual query deep-dives.
- **Kinesthetic (K)**:
  - *Scenario Roleplay Dilemmas*: Interactive, decision-based practical simulations.
  - *Cloze Fill-in-the-Blank Tasks*: Interactive term masking for active recall testing.

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Vanilla CSS, Lucide icons
- **Backend**: FastAPI (Python), MongoDB (Motor driver), Groq LLM API (Llama 3.1 & 3.3 models)
- **AI Orchestration**: Custom LangGraph active-agent routing
- **Media Engine**: HTML5 Speech Synthesis, Web Speech API Recognition, gTTS, Inference-API Neural Vocoders

---

## 🔧 Installation & Setup

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB instance (local or Atlas)

### 2. Backend Setup
1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file based on `.env.example` and add your configurations:
   ```env
   PORT=8000
   MONGO_URI=mongodb+srv://...
   JWT_SECRET=your_jwt_secret
   GROQ_API_KEY=gsk_...
   ```
5. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

### 3. Frontend Setup
1. Navigate to the client folder:
   ```bash
   cd client
   ```
2. Install package requirements:
   ```bash
   npm install
   ```
3. Create a `.env` file containing:
   ```env
   VITE_API_URL=http://127.0.0.1:8000/api
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

---

## 📦 Docker Containerization

To run the FastAPI backend inside a production container:

```bash
# Build the backend container image
docker build -t connectilearn-backend ./server

# Run the container exposing port 8000
docker run -d -p 8000:8000 --env-file ./server/.env connectilearn-backend
```

---

## 🌐 Production Deployment

- **Backend (Render)**: Set Root Directory to `Connecti-learn/server`, select **Docker** as environment, and load variables (`MONGO_URI`, `JWT_SECRET`, `GROQ_API_KEY`).
- **Frontend (Vercel)**: Import `Connecti-learn/client`, select the **Vite** preset, and set `VITE_API_URL` to point to your live Render backend API endpoint.
