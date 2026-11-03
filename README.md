# Attirelle Aura

A React + Vite frontend with a FastAPI backend that uses Google's Gemini API to provide outfit compatibility feedback from an uploaded top and bottom.

## Project structure

```text
attirelle-aura/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── public/images/
│   ├── src/
│   ├── package.json
│   └── .env.example
├── .gitignore
└── README.md
```

## Run locally (Windows PowerShell)

### 1. Backend

Open a terminal:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Open `backend/.env` and replace `replace_with_your_key` with your own Gemini API key. Never share this file or commit it to GitHub.

Start the API:

```powershell
python -m uvicorn main:app --reload --port 8000
```

Check `http://127.0.0.1:8000/health`.

### 2. Frontend

Open a second terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`).

## Performance notes

- The backend checks uploads and downsizes them to a maximum 1400 × 1400 pixels before sending them to Gemini. This reduces upload and vision-processing payload size while retaining useful garment detail.
- The prompt requests a concise seven-part report and caps generated output tokens to reduce unnecessary response time.
- The API prints image-preparation and Gemini timing to the backend terminal. Compare those timings to identify the bottleneck.
- A request timeout is configured with `GEMINI_TIMEOUT_SECONDS` (default 90).
- The previous automatic retry loop was removed so a temporary provider error does not silently add multiple long waits. Users receive a clear retry message instead.
- Actual response time still depends on Google's model availability, account limits, network conditions and image complexity. The chosen model name must be available to your Google AI Studio project; change `GEMINI_MODEL` in the backend environment if needed.

## Deploying

This project is prepared for separate frontend and backend hosting. It is not deployed yet.

### Backend (for example, Render)

- Create a Web Service from the repository.
- Set the root directory to `backend`.
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Add environment variables in the hosting dashboard: `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_TIMEOUT_SECONDS`, and `CORS_ORIGINS`.
- Set `CORS_ORIGINS` to the exact public frontend origin, such as `https://your-site.vercel.app` (no trailing slash).

### Frontend (for example, Vercel)

- Import the repository and set the root directory to `frontend`.
- Build command: `npm run build`
- Output directory: `dist`
- Add `VITE_API_BASE_URL` with the deployed backend base URL, e.g. `https://your-api.onrender.com` (no trailing slash).
- Redeploy after setting the environment variable.

Do not put the Gemini API key in any `VITE_` variable: Vite variables are exposed to the browser.

## Important limitations / next work

- The current product returns a text styling consultation. It does not yet generate a mannequin preview or connect to live shopping inventory.
- The sample trending-look scores are illustrative design content, not AI-generated evaluations.
- Before sharing publicly, test uploads and API limits, set a sensible provider quota, review privacy/retention requirements, and add abuse protection/rate limiting to the backend.
- Free hosting tiers may sleep when idle and can have usage limits. Public availability and cold-start speed depend on the selected host plan.
