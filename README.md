# NeuralHub — AI Marketplace

A full-stack AI marketplace with user authentication.

## Project Structure

```
neuralhub/
├── backend/          ← Node.js + Express + MongoDB API
│   ├── models/
│   │   └── User.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   └── auth.js
│   ├── server.js
│   ├── .env.example
│   └── package.json
└── frontend/
    └── index.html    ← Upload this to GitHub Pages
```

---

## 🚀 Backend Setup (Run locally or on a server)

### 1. Install MongoDB
- Download from https://www.mongodb.com/try/download/community
- Or use MongoDB Atlas (free cloud): https://www.mongodb.com/atlas

### 2. Install dependencies
```bash
cd backend
npm install
```

### 3. Create your .env file
```bash
cp .env.example .env
```
Edit `.env`:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/neuralhub
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=7d
```

### 4. Start the server
```bash
node server.js
```
You should see:
```
✅ MongoDB connected
🚀 Server running on http://localhost:5000
```

---

## 🌐 Frontend Setup (GitHub Pages)

### 1. Upload to GitHub
1. Create a new GitHub repo (e.g. `neuralhub`)
2. Upload `frontend/index.html` — rename it `index.html` in the repo root
3. Go to **Settings → Pages → Source → main branch**
4. Your site is live at `https://yourusername.github.io/neuralhub`

### 2. Point frontend to your backend
In `index.html`, find this line:
```js
const API_BASE = 'http://localhost:5000/api';
```
Change it to your deployed backend URL:
```js
const API_BASE = 'https://your-backend.railway.app/api';
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/signup` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| GET | `/api/auth/me` | Get current user | ✅ Yes |
| PATCH | `/api/auth/update-profile` | Update name/bio | ✅ Yes |
| PATCH | `/api/auth/change-password` | Change password | ✅ Yes |
| DELETE | `/api/auth/delete-account` | Delete account | ✅ Yes |
| GET | `/api/health` | Health check | No |

### Example: Sign up
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","password":"secret123"}'
```

### Example: Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com","password":"secret123"}'
```

---

## ☁️ Deploy Backend (Free Options)

### Railway (Recommended — free tier)
1. Push backend folder to GitHub
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Add environment variables in Railway dashboard
4. Railway gives you a public URL automatically

### Render
1. Go to https://render.com → New Web Service
2. Connect your GitHub repo
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add environment variables

---

## 🔮 Next Steps
- [ ] Add tool listings to MongoDB
- [ ] Add tool search/filter from database  
- [ ] Add user dashboard
- [ ] Add Stripe payments for Pro plan
- [ ] Add tool reviews and ratings
