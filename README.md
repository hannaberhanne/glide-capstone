# Glide+ 

## Project Description
Glide+ is an AI-powered student life platform that helps college students manage academics, habits, and social activities in one place. It combines:
- Adaptive planning and scheduling (manual + AI-assisted)
- Gamified habit tracking with XP, streaks, and rewards
- Course navigation with prerequisites and balanced schedule suggestions
- Social and travel planning with cost-splitting and group coordination
- 
## Project Links
- [Trello Board](https://trello.com/b/ojeLj9Bu/glide)  
- [Requirements Document](https://spartansut-my.sharepoint.com/:w:/g/personal/hanna_berhane_spartans_ut_edu/EYtv0MSXZS1FieKw-US5ifEBTQNF6m7p-EJdWJzJNHyumw?e=VgKGCj)  
- [Presentation Slides](https://www.canva.com/design/DAGztzdzz1Q/dPnlwVj2nlOrsNdMaiBZpA/edit?utm_content=DAGztzdzz1Q&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton)  
- [Google Survey](https://forms.gle/examplelink)
- 
## Tech Stack
- Frontend: Vite + React (web)
- Backend: Node.js with Express
- Database: Firebase Firestore / PostgreSQL
- AI/NLP: OpenAI API (+ HuggingFace for ML)
- Integrations: Canvas API, Google Calendar API

## Team Members
- Hanna Berhane : Primarily Backend 
- Anthony Soria : Primarily Frontend
- Wafae Benkassou : Primarily Frontend 
- Joseph DiMartino : Primarily Backend

## Setup

1. Clone it:
```bash
git clone https://github.com/hannaberhanne/glide-capstone.git
cd glide-capstone
```

2. Install frontend:
```bash
cd frontend
npm install
```

3. Install backend:
```bash
cd ../backend
npm install
```
4. Add your Firebase keys to `.env` files in both frontend and backend folders
   - Frontend needs: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, etc.
   - Backend needs: `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`
   - New services:
     - OpenAI: `OPENAI_API_KEY`
     - Canvas: `CANVAS_BASE_URL`, `CANVAS_TOKEN`

5. Run backend:
```bash
cd backend
npm run start
```

6. Run frontend (different terminal):
```bash
cd frontend
npm run dev
```

Go to `http://localhost:5173`

## Current features (Dec 2025)
- AI scheduler + Today view (`/today`): generates daily schedule blocks via GPT-4o-mini and stores them in `schedule_blocks`.
- Task/Habit XP: completing a task (`PATCH /api/tasks/:taskId/complete`) or a scheduled block/ habit awards XP and updates totals.
- Canvas sync: auto-creates user doc, stores token, and upserts Canvas assignments into tasks (default category: academic).
- Habits page rebuilt: create/complete habits with streaks and XP.
- Dashboard/Planner refactor: Task modal uses hours in UI but saves `estimatedMinutes` under the hood; filters and grouped upcoming lists.

## Key API routes
- Tasks: `POST /api/tasks`, `PATCH /api/tasks/:taskId`, `PATCH /api/tasks/:taskId/complete`
- Habits: `POST /api/habits`, `GET /api/habits`, `PATCH /api/habits/:habitId/complete`
- Scheduler: `POST /api/schedule/generate`, `GET /api/schedule/today`, `POST /api/schedule/replan`, `PATCH /api/schedule/blocks/:blockId/complete`
- Canvas: `POST /api/canvas/sync`

## Conventions
- Effort units: UI asks for hours; backend stores `estimatedMinutes`. Anything ≤12 in `estimatedTime` is treated as hours and converted to minutes.
- Categories: Canvas tasks default to `academic`.

## Sprint 1 Summary

The main goal for Sprint 1 was to set up all the basic stuff we needed to get the project running. We focused on making sure both the backend and frontend were connected to Firebase, getting environment variables set up, and making sure routing worked for all our pages.

By the end of this sprint, we were able to:
- Connect Firebase to our project and get authentication working (login + signup)
- Create `.env` files for both frontend and backend
- Set up our `users` and `tasks` collections in Firestore
- Successfully read and write data from the database
- Add all main routes (`/login`, `/signup`, `/dashboard`, `/planner`, `/habits`)
- Build the basic dashboard layout and show data from Firestore

Everything runs locally now and works how we expected it to. We’re planning to use Sprint 2 to start adding more UI styling, the task creation feature, and start working on the habits section.

## Sprint 2 Summary
- AI scheduling + Today view (OpenAI-powered) with schedule blocks stored in Firestore.
- Canvas assignments sync into tasks (academic by default) with stored Canvas tokens.
- XP on completion for tasks/habits; Habits/Goals page rebuilt with streaks.
- Dashboard/Planner refactor with reusable task modal (hours in UI, minutes in storage), filters, and layout polish across pages.
