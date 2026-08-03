<div align="center">

# 🛡️ SafeStride

### 

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-AI-8E75B2?logo=google&logoColor=white)](https://ai.google.dev/)
[![Deployed](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://vercel.com/)
[![Deployed](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render&logoColor=white)](https://render.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](#-license)
**Not just another maps app. Not just another AI chatbot. SafeStride brings smart safety, real-time awareness, and emergency support together—so you can focus on the journey, not the "what ifs."**
**SafeStride helps people travel solo with more confidence** — combining journey management, an AI safety assistant, emergency tools, and real-time infrastructure into one platform.

</div>

---

## ✨ Features

| Category | Highlights |
|---|---|
| 🔐 **Authentication** | Registration, login, JWT-based auth, protected routes, session management |
| 🧭 **Dashboard** | Responsive dashboard with navigation cards for journeys, AI, and emergency tools |
| 🗺️ **Journey Management** | Journey creation, route generation, journey status, Google Maps integration |
| 🤖 **AI Safety Assistant** | Gemini-powered chat for travel safety advice, emergency guidance & preparedness tips |
| 🚨 **Emergency Tools** | SOS interface, emergency contact structure, emergency guidance workflow |
| 🔔 **Notifications** | Firebase Cloud Messaging setup with push notification infrastructure |
| ⚡ **Real-Time Ready** | Socket.IO initialized for live features |
| 🔒 **Security First** | Env-based secrets, backend-only API keys, GitHub secret scanning cleanup |

---

## 🏗️ Architecture Overview

```
User
  │
  ▼
React Frontend (Vite + TypeScript)
  │
  ▼
Express REST API
  │
  ▼
Auth Middleware (JWT)
  │
  ▼
Business Logic Layer
  │
  ├──▶ MongoDB (persistence)
  ├──▶ Redis (cache / queues)
  ├──▶ Socket.IO (real-time)
  ├──▶ Google Gemini API (AI provider layer)
  ├──▶ Google Maps Platform (routes & location)
  └──▶ Firebase Cloud Messaging (notifications)
```

The AI layer is isolated behind a **provider abstraction** — app code never talks to the Gemini SDK directly, making it easy to swap or add providers later.

---

## 🛠️ Tech Stack

**Frontend**

| Tech | Purpose |
|---|---|
| React + TypeScript | UI & type safety |
| Vite | Build tooling |
| Tailwind CSS | Styling |
| Framer Motion | Animations |
| React Router | Routing |
| Axios | API communication |
| Zustand | State management |

**Backend**

| Tech | Purpose |
|---|---|
| Node.js + Express | REST API server |
| MongoDB | Database |
| Redis | Caching & queues |
| Socket.IO | Real-time communication |
| JWT | Authentication |

**AI & Integrations**

| Tech | Purpose |
|---|---|
| Google Gemini API | Safety assistant |
| Google Maps Platform | Routes & location |
| Firebase Cloud Messaging | Notifications |

**Deployment**

| Layer | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Render |

---

## 📁 Folder Structure

```
SafeStride
├── safestride-client        # React frontend
│   ├── src
│   ├── components
│   ├── pages
│   ├── services
│   ├── hooks
│   ├── store
│   ├── utils
│   ├── layouts
│   └── router
│
├── safestride-server        # Express backend
│   ├── src
│   ├── config
│   ├── controllers
│   ├── middleware
│   ├── routes
│   ├── services
│   ├── models
│   ├── providers          # AI provider abstraction (Gemini)
│   ├── sockets
│   ├── queues
│   └── validators
│
├── ai-service                # AI-related services
├── docs                       # Documentation
└── README.md
```

---

## 🚀 Installation

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/SafeStride.git
cd SafeStride
```

### 2. Frontend setup
```bash
cd safestride-client
npm install
cp .env.example .env
npm run dev
```

### 3. Backend setup
```bash
cd safestride-server
npm install
cp .env.example .env
npm run dev
```

---

## 🔑 Environment Variables



**Frontend (`safestride-client/.env.example`)**
```env
VITE_API_BASE_URL=your_backend_api_url
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
VITE_FIREBASE_API_KEY=your_firebase_key
```

**Backend (`safestride-server/.env.example`)**
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
REDIS_URL=your_redis_connection_string
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_SERVER_KEY=your_firebase_server_key
```

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend REST API |
| `VITE_GOOGLE_MAPS_API_KEY` | Client-side Google Maps key |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign JWT tokens |
| `REDIS_URL` | Redis connection string |
| `GEMINI_API_KEY` | Server-only key for Google Gemini API |
| `FIREBASE_SERVER_KEY` | Server key for push notifications |

---

## ▶️ Running Locally

1. Start the backend: `npm run dev` inside `safestride-server`
2. Start the frontend: `npm run dev` inside `safestride-client`
3. Visit `http://localhost:5173`

---

## ☁️ Deployment

| Layer | Platform | Notes |
|---|---|---|
| Frontend | **Vercel** | Auto-deploys from main branch |
| Backend | **Render** | Environment variables configured in dashboard |

Secrets are configured separately per environment — nothing sensitive is committed to GitHub.

---

## 🤖 AI Safety Assistant

- Built on **Google Gemini API**, accessed only through a backend **provider abstraction layer**
- Frontend sends chat requests → backend API → AI provider → Gemini → structured response → frontend
- Supports **JSON response mode** for predictable, parseable output
- Includes **error handling** and fallback logic for AI failures
- Provides travel safety guidance, emergency advice, and general preparedness tips (non-medical)

---

## 🔒 Security

- All secrets stored in environment variables — never hardcoded
- Gemini API key is **backend-only**, never exposed to the client
- JWT-based authentication with protected routes
- Input validation on all API endpoints
- GitHub secret scanning cleanup performed; repository history is clean

---


---

## 📡 API Overview

High-level API groups (no internal endpoint details exposed here):

- **Auth** — registration, login, session/token handling
- **Journey** — create and manage journeys, route data
- **AI** — safety chat requests to the Gemini provider layer
- **Emergency** — SOS and emergency contact operations
- **Notifications** — push notification triggers

---

## 🧩 Challenges Faced

- Handling Gemini model migrations and version changes
- Managing API quota limits gracefully
- Environment configuration across local, Vercel, and Render
- Resolving CORS issues between frontend and backend
- Cleaning up secrets accidentally exposed in early commits
- Structuring a reliable JWT authentication flow
- Designing scalable route/module organization

---

## 📚 Lessons Learned

- Importance of abstracting third-party AI providers for flexibility
- Value of environment-based configuration from day one
- Practical experience with secret scanning and Git hygiene
- Real-world deployment coordination across two platforms
- Building resilient error handling around external APIs

---

## 🔮 Future Improvements

> The following are **planned**, not yet implemented:

- 🎙️ Voice Assistant
- 📡 Live Journey Tracking
- 📴 Offline Support
- 🧠 AI Memory / Conversational Context
- 🔮 Predictive Safety Alerts
- 🛠️ Admin Dashboard
- 📊 Analytics
- 🔔 Advanced Notification Enhancements
- 🧪 Testing Suite & CI/CD Pipeline

---

## 👥 Contributors

- **Prakhar Raj** — Full Stack Developer & Project Owner

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 🙏 Acknowledgements

- [Google Gemini API](https://ai.google.dev/) for AI capabilities
- [Google Maps Platform](https://developers.google.com/maps) for location & routing
- [Firebase](https://firebase.google.com/) for notification infrastructure
- [Vercel](https://vercel.com/) & [Render](https://render.com/) for hosting

<div align="center">

**Built with ❤️ to make solo travel safer.**

</div>
