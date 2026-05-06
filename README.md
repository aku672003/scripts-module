# Script Generator Platform

A full-stack script generation platform with a React frontend and a FastAPI backend. It lets users generate scripts from natural language, analyze code, archive protocols, stage deployments, and manage admin operations from a single interface.

## Features

- Chat-like interface for intuitive interaction
- Support for multiple programming languages (bash, Python, JavaScript, and more)
- Real-time script generation from natural language prompts
- Copy-to-clipboard functionality for generated scripts
- Responsive design for desktop and mobile use

## Project Structure

```text
Scripts Module/
├── backend/
│   ├── app/main.py                # FastAPI app and frontend serving
│   ├── core/constants.py          # Shared paths and configuration
│   ├── models/schemas.py          # Pydantic request/response models
│   ├── routers/script_router.py   # API routes
│   ├── services/                  # Business logic, LLM, system services
│   ├── utils/                     # Storage, security, rate limiting
│   ├── data/                      # JSON persistence
│   └── requirements.txt
├── frontend-v3/
│   ├── src/                       # React app
│   ├── dist/                      # Production build served by FastAPI
│   └── package.json
├── run.sh                         # Builds frontend and starts backend
└── README.md
```

## Setup and Installation

### Prerequisites

- Python 3.10+
- `pip`
- `npm` for frontend builds
- Web browser

### Installation Steps

1. Clone or download this repository
2. Navigate to the project directory:
   ```bash
   cd script-generator-platform
   ```
3. Make the run script executable (if not already done):
   ```bash
   chmod +x run.sh
   ```
4. Run the platform:
   ```bash
   ./run.sh
   ```
   `run.sh` will:
   - create the backend virtual environment if needed
   - install backend dependencies
   - build the React frontend when required
   - start the full-stack app
   - automatically switch to the next free port if `8000` is busy

5. Open the printed URL in your browser.

### Manual Development

Backend only:
```bash
./backend/venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Frontend dev server:
```bash
cd frontend-v3
npm install
npm run dev
```

## Usage

1. Open your web browser and go to `http://localhost:8000`
2. In the chat interface, describe the script you want to generate (e.g., "a Python script that reads a CSV file and calculates the average of a column")
3. Select the desired programming language from the dropdown
4. Press Enter or click the send button
5. The generated script will appear in the chat window
6. Click the "Copy" button to copy the script to your clipboard

## API Endpoints

### Public API

- `POST /api/v1/chat` generates a response for a user prompt.
- `POST /api/v1/analyze` analyzes code and returns structured metadata.
- `GET /api/v1/languages` lists supported languages.
- `GET /api/v1/scripts` returns archived scripts.
- `POST /api/v1/scripts` stores a script.
- `GET /api/v1/deployments` returns staged or deployed scripts.
- `POST /api/v1/stage` stages a script for deployment.

### Admin API

Admin routes require a token returned by `POST /api/v1/admin/login`.

- `POST /api/v1/config`
- `GET /api/v1/admin/activity`
- `GET /api/v1/admin/system/health`
- `POST /api/v1/admin/sandbox`
- `POST /api/v1/admin/terminal`
- `POST /api/v1/deployments/{name}/deploy`
- `DELETE /api/v1/deployments/{name}`

### Health Check

- `GET /healthz`

## Notes

- The backend uses local JSON files for persistence.
- Admin authentication is token-based in memory for the running process.
- The app can operate even if the local Ollama model is unavailable by falling back to deterministic analysis/generation behavior.
- The built frontend is served directly by FastAPI in production mode.

## Troubleshooting

- **Port already in use**: `run.sh` automatically searches for the next free port.
- **Dependencies not found**: Ensure you're in the backend directory when running `pip install`
- **Frontend not loading**: Re-run `./run.sh` or manually build with `cd frontend-v3 && npm run build`
