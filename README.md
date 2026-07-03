# Project Setup

## Requirements
- Node.js v26.4.0
- Python 3.14.6

## 1. Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

## 2. Running the Server

```bash
cd server
python -m venv venv
venv/Scripts/activate
pip install -r requirements.txt
py server.py
```

> **Note:** The `venv` folder is not included in this repository (it's excluded via `.gitignore`), so after cloning from GitHub you will need to create the virtual environment and install the dependencies yourself using the steps above.

### Updating requirements.txt

If you install a new package (e.g. `pip install flask-cors`), update `requirements.txt` so everyone else gets it too:

```bash
pip freeze > requirements.txt
```