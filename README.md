# HireFlow - Full-Stack AI Hiring Agent App

HireFlow is an AI-powered applicant tracking and resume evaluation platform. It parses resumes, structures the candidate data using Gemini, embeds the records using Vertex AI Text Embeddings, saves them into a MongoDB Atlas database, matches candidates with job requirements via Vector Search, ranks them, and renders results inside a React Kanban Board.

---

## Architecture Diagram (ASCII)

```text
+-------------------------------------------------------+
|                    React Frontend                     |
|            (UploadPanel / Kanban / Stepper)           |
+---------------------------+---------------------------+
                            |
                     (HTTP / REST APIs)
                            v
+-------------------------------------------------------+
|                    FastAPI Backend                    |
|    (main.py / pipeline.py / pdf_parser.py / CORS)     |
+-----+---------------------+---------------------+-----+
      |                     |                     |
      | (Vertex AI SDK)     | (Vertex AI SDK)     | (PyMongo Client)
      v                     v                     v
+-----------+         +-----------+         +-----------+
| Gemini    |         | Vertex AI |         | MongoDB   |
| 2.0 Flash |         | text-     |         | Atlas     |
| (Rank &   |         | embedding-|         | (Resumes  |
| Structure)|         | 004)      |         | / Vector) |
+-----------+         +-----------+         +-----------+
```

---

## Tech Stack

- **Large Language Model**: Gemini 2.0 Flash (via Vertex AI SDK)
- **Embeddings**: Vertex AI `text-embedding-004`
- **Vector Database**: MongoDB Atlas (Vector Search using `$vectorSearch` and index `"resume_vector_index"`)
- **Container Infrastructure**: Google Cloud Run & Google Cloud Build
- **Cloud Orchestration**: Google Cloud Agent Builder
- **Backend**: FastAPI + Python (PyMuPDF parser)
- **Frontend**: React (Vite) + Tailwind CSS v4

---

## Setup Instructions

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
3. Setup your `.env` variables (use `.env.template` as a guide):
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
4. Open the browser to the local Vite URL (typically `http://localhost:5173`).

---

## Deployment to Google Cloud

### Manual Container Deployment (Backend)
To manually deploy the FastAPI backend container to Google Cloud Run, execute the following commands in your terminal:

1. Build the container image in Google Cloud Build:
   ```bash
   gcloud builds submit --tag gcr.io/$PROJECT_ID/hireflow-backend ./backend
   ```
2. Deploy the container to Google Cloud Run:
   ```bash
   gcloud run deploy hireflow-backend \
     --image gcr.io/$PROJECT_ID/hireflow-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars MONGODB_URI=$MONGODB_URI,GOOGLE_CLOUD_PROJECT=$PROJECT_ID
   ```

Alternatively, you can automate this by setting your environment variables and running our convenience script:
```bash
chmod +x deploy.sh
PROJECT_ID="your-project-id" MONGODB_URI="your-mongo-uri" ./deploy.sh
```

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
3. Deploy the resulting `frontend/dist` directory to your static hosting provider (e.g. Firebase Hosting, Cloud Storage, Vercel, or Netlify).
