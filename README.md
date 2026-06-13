🔗 Live Demo: https://frontend-gold-one-34.vercel.app
📦 Track: MongoDB | Google Cloud Rapid Agent Hackathon 2026

# HireFlow - Agent-First AI Recruiter App

HireFlow is an AI-powered applicant parsing, evaluation, and ranking platform built for small businesses. Rather than forcing recruiters to navigate complex dashboards, HireFlow is designed **agent-first**: a conversational assistant serves as the primary interface, while a reactive Kanban board updates dynamically in the background to show hiring progression.

---

## The Mission
Traditional applicant tracking systems are tedious, rigid, and require manual data entry. HireFlow's mission is to make hiring as simple as having a conversation. 
1. The recruiter tells the agent what role they are hiring for (e.g. *"I need a Senior React developer"*).
2. The recruiter attaches resumes directly inside the chat.
3. The agent initiates the parsing, embedding, and matching pipeline, populating and moving candidates on the Kanban board in real time.
4. The recruiter asks questions, moves candidates, and gathers AI-generated interview queries conversationally.

---

## System Architecture

```text
+-------------------------------------------------------------+
|                       React Frontend                        |
|        (Split Screen: 35% Kanban Board | 65% Agent Chat)     |
+------------------------------+------------------------------+
                               |
                        (HTTP / REST APIs)
                               v
+-------------------------------------------------------------+
|                       FastAPI Backend                       |
|   (routes/chat.py / services/pipeline.py / pdf_parser.py)   |
+----------------------+------------------------------+-------+
                       |                              |
                       | (Vertex AI SDK)              | (PyMongo Client)
                       v                              v
           +-----------------------+            +-----------+
           | Vertex AI             |            | MongoDB   |
           | - gemini-2.5-flash    |            | Atlas     |
           | - text-embedding-004  |            | (Resumes  |
           +-----------------------+            | / Vector) |
                                                +-----------+
```

---

## Tech Stack

- **Conversational Engine**: Gemini 2.5 Flash (via Vertex AI SDK using Google Cloud credits)
- **Embeddings Model**: Vertex AI `text-embedding-004` (for vector embeddings)
- **Vector Database**: MongoDB Atlas (Vector Search using `$vectorSearch` and index `"resume_vector_index"`)
- **Backend Framework**: FastAPI + Uvicorn (Python)
- **PDF Parser**: PyMuPDF
- **Frontend Client**: React (Vite) + Tailwind CSS
- **Container Infrastructure**: Google Cloud Run & Google Cloud Build

---

## Local Setup Instructions

### Prerequisites
- Python 3.11 or later
- Node.js v18 or later and npm
- A MongoDB Atlas Cluster (with Vector Search enabled)
- A Google Cloud Platform (GCP) project with Vertex AI APIs enabled

### 1. Local Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment and install requirements:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. Create a `.env` file (use `.env.template` as a guide) and populate your credentials:
   ```env
   MONGODB_URI=your_mongodb_atlas_uri
   GOOGLE_CLOUD_PROJECT=your_gcp_project_id
   GOOGLE_CLOUD_LOCATION=us-central1
   ```
4. Authenticate your terminal with Google Cloud:
   ```bash
   gcloud auth application-default login
   ```
5. Run the server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### 2. Local Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`.

---

## Deployment

### Container Deployment to Google Cloud Run (Backend)

We deploy our backend to Cloud Run using Google Cloud Build. Execute the deployment by setting the required variables:

```bash
chmod +x deploy.sh
PROJECT_ID="your-project-id" MONGODB_URI="your-mongo-uri" ./deploy.sh
```

The script will automatically build your container image via Google Cloud Build and deploy it to Google Cloud Run with the correct environment variables bound.

### Static Build Deployment (Frontend)
1. Add your deployed backend Cloud Run URL to `frontend/.env.production`:
   ```env
   VITE_API_URL=https://hireflow-backend-xxxxxx.a.run.app
   ```
2. Build the production build:
   ```bash
   cd frontend
   npm run build
   ```
3. Deploy the resulting `frontend/dist` directory to your static hosting provider (Vercel, Firebase Hosting, Netlify, etc.).

---

## 🚀 Hackathon Demo Guide (How to Present)

Follow these steps to demonstrate the full end-to-end capabilities of HireFlow:

### Phase 1: Conversational Pipeline Setup
1. **Open the web app**: Go to the client URL.
2. **Review Connection Status**: Verify the top-right indicator reads **Atlas DB: Connected**.
3. **Engage the Agent**:
   - In the chat panel on the right, type: *"I need to hire a Full Stack React developer."*
   - The agent will greet you and prompt you to upload candidate resumes.
4. **Upload Resumes**:
   - Click the paperclip attachment button in the chat input.
   - Select multiple PDF resumes and click send.
5. **Watch the Magic Happen**:
   - The agent uploads the files, triggers the parsing pipeline, and reports back that evaluation has started.
   - On the left pane, watch the Kanban board automatically update in real-time (polling every 5 seconds) as candidates are ranked and moved to their matched stages.

### Phase 2: Candidate Deep-Dive & Control
1. **Review Match Summaries**: The agent will respond conversationally in the chat with a ranked summary of the top matching candidates.
2. **Interactive Insights**:
   - Click any card on the Kanban board.
   - Inspect the candidate's custom matching score, specific reasons to hire, and tailored interview questions.
3. **Conversational Controls**:
   - Chat with the agent to perform actions. For example, type: *"What are the weaknesses of candidate [Name]?"* or *"Generate interview questions for [Name]"*.
   - You can even move candidates conversationally: *"Move [Name] to Rejected."* The Kanban board updates instantly!
