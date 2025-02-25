# PDF Studio Project

## Prerequisites
- Python 3.x
- Node.js (install via `brew install node`)
- Ollama installed on your system

## Required Python Packages
```bash
pip install fastapi uvicorn chromadb ollama langchain_community sentence_transformers python-multipart pymupdf
```

## Setup Instructions (Three Terminal Setup Required)

### Terminal 1: Python Backend
```bash
# Clone the repository
git clone https://github.com/billtega66/PDF_studio.git

# Navigate to project directory
cd PDF_studio

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # For Mac

# Install Python dependencies
pip install -r requirements.txt

# Run the backend server
python app.py
```

### Terminal 2: Ollama Service
```bash
# Check available models
ollama list

# Pull required models
ollama pull nomic-embed-text

# Start Ollama service
ollama run llama2
```

### Terminal 3: Frontend Development
```bash
# Install npm dependencies
npm install

# Start the development server
npm run dev
```

## Troubleshooting
If you encounter any issues:
1. Ensure all Python dependencies are installed
2. Verify Ollama service is running
3. Check if Node.js is properly installed (`node -v` and `npm -v`)
4. Make sure you're in the correct directory for each terminal

## Technology Stack

### Frontend
- TypeScript
- Tailwind CSS
- Vite
- React
- shadcn-ui

### Backend
- Python
- FastAPI
- Ollama (LLM)
- ChromaDB
- LangChain
- PyMuPDF
