# Glide+ (Capstone Project)

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


