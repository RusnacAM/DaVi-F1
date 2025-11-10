# Data Visualization F1 Data Analysis

This is a visualization of F1 data based on the FastF1 API.

## Get Started

This project was built with React + Vite + Typescript. Visualization with D3.js

### Prerequisites:

- Node 20+
for ex
```
nvm use 24.9.0
```

To set up the project execute the following commands:

```
git clone git@github.com:RusnacAM/DaVi-F1.git
cd DataVis_F1
```

To run the backend:
```
cd backend
fastapi dev main.py
```

To run the frontend:
```
cd frontend
npm ci
npm run dev
```

Note: in order to run this project don't forget to add a .env with VITE_API_BASE_URL={your_url}