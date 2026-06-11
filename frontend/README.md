# HireFlow - Agent-First Client Interface

This is the frontend client for HireFlow, built using **React (Vite)** and styled with **Tailwind CSS**. It is designed around an agent-first user experience.

## The Mission
Our mission is to humanize and streamline hiring by making the AI agent the primary workspace. The screen is split between a conversational interface on the right (65%) and a reactive Kanban board on the left (35%). Recruiter operations are completely conversational:
- Upload resumes directly inside the chat using the paperclip button.
- Type out campaign requirements (e.g., *"I need to hire a Full Stack Developer"*).
- Watch the Kanban board update dynamically as the pipeline parses, embeds, and ranks candidates in the background.

---

## Key Features

- **Split Screen Layout**: Stacks the Kanban board on the left, ensuring recruitment progress is always visible while chatting.
- **In-Chat File Uploads**: Seamlessly upload multiple PDF resumes within the conversation flow.
- **Reactive Polling**: Automatically refreshes candidate positions on the Kanban board as the backend processes candidate files.
- **Interactive Candidate Cards**: Click on candidate cards in the Kanban board to inspect AI-generated insights, match score breakdowns, and personalized interview questions.

---

## Environment Configuration

Create a `.env` file in the `frontend` root folder:

```env
# Local Backend URL
VITE_API_URL=http://localhost:8000
```

For production, configurations are loaded from `.env.production`.

---

## Local Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Run Development Server**:
   ```bash
   npm run dev
   ```
3. **Build for Production**:
   ```bash
   npm run build
   ```
