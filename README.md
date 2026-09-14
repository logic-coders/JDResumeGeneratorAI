# JD Resume Generator AI

> **Generate high‑impact, job‑specific resumes instantly using LLMs**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Java](https://img.shields.io/badge/Java-17-blue)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.3-brightgreen)](https://spring.io/projects/spring-boot)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [Using the App — Slash Commands](#using-the-app--slash-commands)
- [Configuration Details](#configuration-details)
- [Contributing](#contributing)
- [FAQ](#faq)
- [License](#license)

---

## Overview

**JD Resume Generator AI** is a full‑stack, AI‑powered service that transforms a generic "master" resume into a polished, job‑specific document in seconds.

Paste a job‑posting URL → the backend scrapes the JD → an LLM extracts required/preferred skills → your master resume is rewritten to match → a ready‑to‑submit **PDF + JSON** is generated.

Built with:
| Layer | Technology |
|-------|-----------|
| Backend API | Spring Boot 3 · Java 17 · WebFlux |
| AI / LLM | OpenAI / Anthropic (configurable) |
| PDF Generation | Apache PDFBox 3 |
| Web Scraping | Jsoup |
| Frontend | React + Vite |
| Dev Utilities | Lombok · Jackson |

---

## Features

| # | Feature |
|---|---------|
| 🧭 | **Guided onboarding** – `/init` walks you through setting up your profile step‑by‑step |
| 📄 | **Job‑specific resume generation** – one command (`/resume <url>`) runs the full 4‑step AI pipeline |
| 🔍 | **Resume analysis** – `/analyze <url>` scores your master resume against a live JD |
| ✍️ | **Continuous improvement** – `/improve` lets the LLM refine the master resume |
| 📊 | **Workflow status** – `/status` shows where you are in any multi‑step flow |
| 💬 | **In‑app help** – type `/help` to see every available command |
| 🚫 | **Full flow control** – `/cancel`, `/skip`, `/back` at any point |

---

## Architecture

```
JDResumeGeneratorAI/
├── backend/          # Spring Boot REST API
│   └── src/main/java/com/resumeagent/
│       ├── controller/   # HTTP endpoints
│       ├── service/      # Business logic & LLM calls
│       └── config/       # CORS, application config
├── frontend/         # React + Vite UI (chat‑style interface)
├── ai-service/       # LLM provider abstraction layer
├── storage/          # Generated PDFs & JSON artefacts
├── Generated Resumes/# Example outputs (for demo/testing)
└── start-all.sh      # One‑command launcher
```

Request flow:

```
Browser  →  Frontend (Vite)  →  Backend API (Spring Boot)  →  AI Service  →  LLM (OpenAI/Anthropic)
                                          ↓
                                   storage/ (PDF + JSON)
```

---

## Prerequisites

Make sure the following are installed and available on your `PATH`:

| Tool | Minimum version | Check command |
|------|----------------|---------------|
| Java (OpenJDK) | 17 | `java -version` |
| Maven | 3.8+ | `mvn -version` |
| Node.js | 18.x | `node -v` |
| npm | 9.x | `npm -v` |
| Git | any | `git --version` |
| LLM API key | — | OpenAI or Anthropic |

---

## Installation & Setup

### 1 — Clone the repository

```bash
git clone https://github.com/logic-coders/JDResumeGeneratorAI.git
cd JDResumeGeneratorAI
```

### 2 — Configure your API key

Create a `.env` file (or `application.properties`) inside `backend/src/main/resources/`:

```properties
# backend/src/main/resources/application.properties
openai.api.key=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# OR for Anthropic:
# anthropic.api.key=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx

server.port=8080
storage.path=./storage
```

> **Never commit your API key.** Add `.env` and any `*secret*` files to `.gitignore`.

### 3 — Install backend dependencies

```bash
cd backend
mvn clean install
```

### 4 — Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 5 — Install AI service dependencies (if applicable)

```bash
cd ../ai-service
npm install
```

---

## Running the Application

From the **project root**, run:

```bash
chmod +x start-all.sh   # first time only
./start-all.sh
```

This starts:
- **Backend** → `http://localhost:8080`
- **Frontend** → `http://localhost:5173`

Open `http://localhost:5173` in your browser. You'll see a chat‑style interface — type `/` to see all available commands.

---

## Using the App — Slash Commands

Type any command in the chat input box and press **Enter**.

| Command | What it does | Example |
|---------|-------------|---------|
| `/init` | Start or resume the first‑time onboarding wizard | `/init` |
| `/profile` | View or update your stored profile (name, contact info, etc.) | `/profile` |
| `/resume <url>` | Generate a tailored resume for the given job posting | `/resume https://company.com/jobs/123` |
| `/analyze <url>` | Score & compare your master resume against a job description | `/analyze https://company.com/jobs/123` |
| `/improve` | Ask the LLM to rewrite or extend your master resume | `/improve` |
| `/status` | Show the current state of any in‑progress workflow | `/status` |
| `/help` | List all available slash commands | `/help` |
| `/cancel` | Abort the current multi‑step operation | `/cancel` |
| `/skip` | Skip an optional step in a workflow | `/skip` |
| `/back` | Go back one step to change an earlier answer | `/back` |

### Typical first‑time flow

```
/init          ← set up your profile & upload master resume
/resume <url>  ← generate your first tailored resume
/analyze <url> ← check how well it matches the JD
/improve       ← let the AI strengthen weak sections
```

---

## Configuration Details

| Property | Default | Description |
|----------|---------|-------------|
| `server.port` | `8080` | Backend HTTP port |
| `openai.api.key` | — | Your OpenAI key |
| `anthropic.api.key` | — | Your Anthropic key (alternative) |
| `storage.path` | `./storage` | Where PDFs and JSON files are saved |

**Frontend proxy** – `frontend/vite.config.js` proxies `/api/**` to `http://localhost:8080` so no CORS issues in development.

---

## Contributing

1. Fork the repository and create a feature branch:
   ```bash
   git checkout -b feature/my-feature
   ```
2. Make your changes, keeping backend and frontend code separated.
3. Run tests:
   ```bash
   # Backend
   cd backend && mvn test

   # Frontend
   cd frontend && npm run test
   ```
4. Open a Pull Request against `main` with a clear description of your changes.

Please follow the existing code style (Lombok for Java, ESLint + Prettier for React).

---

## FAQ

**Q: Do I need a paid LLM API plan?**  
A: No. Free‑tier quotas from OpenAI or Anthropic are sufficient for generating a few resumes per day.

**Q: Can I use this purely via API (no UI)?**  
A: Yes — all features are exposed as REST endpoints on `http://localhost:8080/api`. Run the backend only with `mvn spring-boot:run` inside the `backend/` folder.

**Q: Where are my generated resumes saved?**  
A: In the `storage/` directory at the project root, organized by company name and job ID. The UI also provides a direct download link after each generation.

**Q: Can I bring my own resume template?**  
A: Custom templates are on the roadmap. For now the PDF layout is defined in the backend service layer.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

**Happy resume building! 🚀**
