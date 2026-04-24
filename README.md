# 🛡️ Hack Malenadu '26: AI-Driven Threat Detection & Simulation Engine

> **Built for the Hack Malenadu '26 Cybersecurity Track.**

A real-time, multi-layer threat detection engine that monitors Network, Endpoint, and Application layers to identify, correlate, and automatically generate mitigation playbooks for advanced cyber attacks.

## 🌟 Key Features We Built

1. **Multi-Signal Ingestion Pipeline**: Normalizes high-throughput logs from Network, Endpoint, and Application sources into a Unified Event Schema via Python `asyncio` streams.
2. **True AI Detection Engine**: Uses an `scikit-learn` **Isolation Forest** Machine Learning algorithm that dynamically trains a mathematical baseline of your traffic, and flags statistical anomalies (e.g., massive traffic spikes, odd IP clustering) without relying purely on deterministic rules!
3. **Cross-Layer Correlation Engine**: Analyzes alerts generated across isolated log layers. It automatically matches entity IDs (like IP, Hostname) to escalate confidence scores and group isolated events into high-severity **Incident Chains**.
4. **Explainable AI (XAI)**: Translates raw data into plain-English summaries mapping natively to MITRE ATT&CK IDs (T1041, T1110) outlining *what* happened, *why* it was flagged, and checks false-positive indicators.
5. **Dynamic Playbooks**: Automatically generates context-aware, actionable incident containment and investigation checklists.
6. **Live Threat Simulator**: Run attack simulations on command (Data Exfiltration, Lateral Movement) directly from the UI, continuously injecting malicious payloads to validate the detection engine.
7. **Premium SOC UI**: A responsive Light/Dark glassmorphism React interface featuring:
   - Live Anomaly Timeline processing real-time stats
   - Interactive Threat Radar Geometry
   - Dynamic MITRE ATT&CK block heat-mapping

## 🏗️ Architecture Stack

- **Backend:** Python 3.13, FastAPI, Uvicorn, scikit-learn, pandas
- **Frontend:** React 18, Vite, React Router DOM
- **UI Design:** Vanilla CSS (Enterprise Light Theme by default), Lucide React, Recharts
- **Live State:** Fully Async native WebSockets payload streaming

## 🚀 How to Run the Project Locally

### 1. Start the Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
# Dependencies are unpinned for perfect Python 3.13 wheel compatibility
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```
*The FastAPI server will run on `http://localhost:8000`*

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```
*The Vite React server will run on `http://localhost:5173`*

## 📺 How to Use the Demo

1. Open `http://localhost:5173` in your browser.
2. The **Dashboard** will show normal, benign simulation traffic flowing through the engine. You will see the metrics counting up cleanly.
3. Keep an eye on the **Threat Radar** and the **Event Timeline**.
4. Navigate to **Simulation** from the sidebar.
5. Click **Start Scenario** for any of the attack scenarios (e.g., Data Exfiltration).
6. Head back to the **Dashboard** — you will immediately see a massive spike in the Anomaly chart as the Machine Learning engine dynamically triggers alerts alongside the hard-coded endpoint rules!
7. Check **Incidents & Alerts** to see the newly assembled correlated attack chain covering both the Network and Endpoint layers correctly. You will also see the **MITRE ATT&CK Heat Map** update instantly.
8. Open **Playbooks** to see the generated mitigation steps to contain the detected breach.

---
*Developed by Team Dominators.*
