
# 🌱 Crop Recommendation AI

An AI-powered platform that leverages **IoT sensor data**, **environmental factors**, and **machine learning models** to recommend the most suitable crops for agricultural zones.  
Built during the **Reboot the Earth Hackathon**, the project aims to support **investors, exporters, and zonal agricultural administrators** with data-driven decisions for sustainable farming and climate adaptation.  

---

## 🚀 Features

- 📡 **IoT Integration** – Collects soil moisture, pH, nitrogen, phosphorus, potassium, humidity, and temperature data.  
- 🤖 **AI Recommendation Model** – Suggests suitable crops based on soil and environmental datasets.  
- 🖥 **Modern Web Application** – Role-based dashboards for:
  - **Central Admins** – Manage zones, admins, and technicians.  
  - **Zone Admins** – View IoT data, generate/regenerate recommendations, manage farmers.  
  - **Investors/Exporters** – Access validated recommendations for investment decisions.  
- 💬 **Chatbot Support** – Interactive Q&A with AI to understand recommendations.  
- 🌍 **Language-Aware SMS** – Recommendations delivered in farmers’ preferred languages (if extended).  

---

## 🗂 Project Structure

```bash
crop-recommendation-ai/
│
├── ai_model/      # Machine learning models for soil classification & crop recommendation
├── backend/       # Flask backend APIs, database (PostgreSQL) integration
├── frontend/      # Next.js + Tailwind + shadcn/ui dashboard with role-based views
└── README.md      # Project documentation
````

---

## ⚡️ Tech Stack

* **Frontend:** Next.js, TailwindCSS, shadcn/ui
* **Backend:** Flask (Python), REST APIs
* **Database:** PostgreSQL
* **Integration:** Mock APIs for IoT + OpenWeather data

---

## 🤖 AI Model

The AI model at the core of this project is built on **Random Forest Classifier**, trained using agricultural datasets to provide accurate crop recommendations.  

- **Dataset**: Includes soil parameters (N, P, K), temperature, humidity, pH, and rainfall.  
- **Model**: Random Forest was chosen for its robustness, ability to handle non-linear relationships, and high accuracy in classification tasks.  
- **Output**: Predicts the most suitable crop for given soil and environmental conditions. 

## 🔧 Getting Started

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/thisAbdU/crop-recommendation-ai.git
cd crop-recommendation-ai
```

### 2️⃣ Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at `http://localhost:3000`.

### 3️⃣ Backend Setup

```bash
cd backend
pip install -r requirements.txt
flask run
```

The backend will run at `http://localhost:5000`.

### 4️⃣ AI Model

Inside `ai_model/`, the backend exposes endpoints for crop recommendation and chat:

- `POST /predict` → Get crop recommendation from soil & weather data  
- `POST /chat`    → Ask crop or soil-related questions


## 🌐 Role-Based Dashboards

* **Central Admin**

  * Manage zones, assign admins/technicians, view recommendations across all zones.

* **Zone Admin**

  * Manage farmers, view IoT data, generate/regenerate AI recommendations, export CSVs.

* **Investor/Exporter**

  * Access validated, zone-level recommendations to support business decisions.

---

## 📊 Example Workflow

1. IoT sensors + weather API → Store soil/environmental data in database.
2. Zone Admin selects a time range → Sends data to AI model.
3. AI recommends the most suitable crops → Results stored & displayed.
4. Admin validates/edits recommendations → Shared with investors/exporters.

---

## 🧑‍🤝‍🧑 Contributors

* **thisAbdU**
* **AnwarAndargie**
* **abmoh4219**

Special thanks to **Reboot The Earth Hackathon** organizers (Salesforce, FAO, UN partners) for the opportunity to innovate for climate resilience. 🌍

---

## 📜 License

MIT License – feel free to use and improve this project.

```
