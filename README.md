# StadiumSurgeSync 🏟️⚡

**StadiumSurgeSync** is a high-performance, interactive full-stack coordination dashboard designed for the FIFA World Cup 2026 matchday operations. It bridges the gap between stadium fans, local concession vendors, and fantasy football managers through real-time crowd dynamics, adaptive mock-database forecasting, and Gemini AI-powered reasoning.

The application serves as a comprehensive simulation of high-volume stadium intelligence, managing in-memory telemetry, aggregate vendor sales, and instant multi-agent feedback response loops.

---

## 🌟 Core Features

### 1. 🚻 Fan Live-Line Navigator & Coordinator
- **Real-Time Coordinate Feeds:** Guides fans to the closest points of interest (beer stands, food concessionaires, restrooms, medical gates) with precise real-time wait times and crowding status.
- **Dynamic Inquiries:** Formulates complex spatial queries through natural language, resolving nearest outlets with the shortest current queues.
- **Souvenir Match Alerts:** Dynamically detects proximity to star player jersey booths (e.g., Vinicius Jr., Kylian Mbappé) and coordinates souvenir drops.

### 2. 🌮 Vendor Pulse & Predictive Concession Engines
- **Halftime Preparedness:** Provides real-time supply suggestions (such as prep lists for tacos, snack bowls, and draft cups) before stadium peak hours.
- **Smart Quota Suggestions:** Models user query volume and ambient crowding trends to suggest concrete prepping quotients to prevent queue backups.
- **Real-Time Critical Surge Alerts:** Multi-agent background triggers automatically flag high-occupancy hotspots (density $\ge 80\%$) and push critical supply indicators straight to active vendors.

### 3. ⚽ Fantasy Manager Team Analytics
- **Live Match Player Tracker:** Integrates historical and active player lineups (e.g., France vs. Brazil) to evaluate live momentum ratings.
- **Captain Recommendation Engine:** Dynamically calculates premium player scores, offering direct data-informed suggestions (such as Mbappé with a 94 rating or Vinicius Jr. at 92) in plain text paragraphs.

### 4. 🔗 Dual-Tier AI Intelligence Loop
- **Primary Model Layer:** Leverages the modern `@google/genai` TypeScript SDK to translate user intents into mock MongoDB find queries or aggregation pipelines.
- **Robust Local Heuristic Fallback:** Features automated rate-limiting guards and state protection. If Gemini API quotas are exhausted (HTTP 429), the application seamlessly transitions to real-time custom heuristics to guarantee zero-downtime stadium operations.

---

## 🏗️ Architecture & Tech Stack

```
                     ┌──────────────────────────────────────┐
                     │          Vite (React + TS)           │
                     │  - Custom Interactive UX Panels      │
                     │  - Mock DB Inspector & Admin Portal  │
                     └──────────────────┬───────────────────┘
                                        │ (Fetch HTTPS)
                                        ▼
                     ┌──────────────────────────────────────┐
                     │        Express server (NodeJS)       │
                     │  - API Endpoints (/api/query)        │
                     │  - In-Memory MongoDB Engine          │
                     └──────────────────┬───────────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼ (Primary)                                   ▼ (Quota Fallback)
  ┌─────────────────────────────┐               ┌─────────────────────────────┐
  │  @google/genai Model SDK    │               │  Local Query Heuristics     │
  │  - JSON Schema Parsing      │               │  - Substring Pattern Match  │
  │  - Synthesis Generation     │               │  - Static Response Engines  │
  └─────────────────────────────┘               └─────────────────────────────┘
```

- **Frontend:** React, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion (`motion`).
- **Backend:** Node.js, Express, tsx, Esbuild.
- **AI Integration:** Google Gemini API via official `@google/genai` SDK.
- **Data Layer:** An interactive in-memory MongoDB mock database containing:
  - `live_events`: Active location telemetry, crowd indexes, and stand waiting minutes.
  - `vendors`: Vendor names, coordinates, category tags, stock metadata, and live alerts.
  - `pos_sales`: Historic and matchday Point-of-Sale logs capturing quantities, items (e.g. Jerseys, Hot Dogs), and match sections.
  - `game_context`: Live game scores, temperature readings, and active squad formations.

---

## 📂 Project Directory Structure

```filepath
.
├── .env.example             # Configuration example file for API credentials
├── .gitignore               # Root level ignore matching build directories and local environments
├── .github/                 # GitHub CI Workflow configuration directories
│   └── workflows/
│       └── ci.yml           # Continuous automated build and TypeScript type-checker
├── LICENSE                  # Open-source MIT Licensing details
├── README.md                # Project documentation and developer's showcase manual
├── CONTRIBUTING.md          # Open-source contribution guidelines
├── index.html               # Main entry HTML stage
├── package.json             # Manifest declaring metadata and dependencies
├── server.ts                # Main Express full-stack API server & simulation pipeline
├── tsconfig.json            # Configuration options for TypeScript compilation
├── vite.config.ts           # Bundler options for building React static layers
├── assets/                  # Public visual logo icons and aesthetic assets
└── src/
    ├── App.tsx              # Primary Interactive Dashboard and Live Console Hub
    ├── main.tsx             # DOM mount bootstrap target
    ├── index.css            # Styled Tailwind utility entries
    ├── seedData.ts          # Initial in-memory database stadium collections seed state
    └── types.ts             # Declared MongoDB find/aggregate layouts and response specifications
```

---

## 🚀 Quick Start Guide

Prerequisites: Ensure you have Node.js installed on your development machine.

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/stadium-surge-sync.git
cd stadium-surge-sync
npm install
```

### 2. Define Environment Config
Create a `.env` file in the root directory and append your official Gemini API Key:
```env
GEMINI_API_KEY="your_google_gemini_api_key_here"
```

### 3. Launch Development Server
```bash
npm run dev
```
The server will boot up and report:
`[StadiumSurgeSync] In-Memory Cluster ready. Port 3000 online.`
Open **`http://localhost:3000`** in your browser to inspect or test your queries!

### 4. Build and Compile Applet for Production
To bundle the frontend using Vite and compile the Express server into a standalone module using Esbuild, execute:
```bash
npm run build
```
Run the compiled build artifact using:
```bash
npm run start
```

---

## 🛠️ Testing Mock Database Queries

The app provides a direct, responsive terminal prompt. Use these natural language examples to trigger specific tool calls across sections:

| Role Context | Question Prompt Example | Collection targeted | Pipeline stage |
| :--- | :--- | :--- | :--- |
| **📣 Fan** | *"I am in Section East, need a beer fast"* | `vendors` / `live_events` | `$match` (section) & `$sort` |
| **🍔 Fan** | *"Is there a restroom close with wait times under 5 minutes?"* | `live_events` | `$match` (washrooms) & `$lte` |
| **📈 Vendor** | *"Get live crowd averages and prepare demand forecast for East vendors"* | `pos_sales` / `live_events` | `$group` with `$avg` |
| **⚽ Fantasy** | *"What is my current stock level and merchandise suggestions?"*| `pos_sales` | `$group` with `$sum` |

---

## 🤝 Contributing Guidelines

We welcome open-source contributions to **StadiumSurgeSync**! Whether you are fixing typos, improving UI aesthetics, expanding simulated MongoDB operators, or creating new coordinate telemetry data trackers:
1. Review the detailed [CONTRIBUTING.md](./CONTRIBUTING.md) guide.
2. Fork this repository and create a descriptive branch like `feature/add-spatial-queries`.
3. Assure your code builds successfully with strict type checks: `npm run lint`.
4. Commit your changes and submit a Pull Request.

---

## 📄 License
This project is licensed under the [MIT License](./LICENSE) - see the file for precise permission terms.
