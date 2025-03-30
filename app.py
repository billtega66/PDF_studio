from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
import pdfplumber
import uvicorn
import tempfile, os
import base64
import faiss
import numpy as np
import ollama
from fastapi.middleware.cors import CORSMiddleware
# from langchain_community.document_loaders import PyMuPDFLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer, CrossEncoder
from collections import OrderedDict
from pydantic import BaseModel
from typing import Optional, List
import json
from datetime import datetime

# Define feedback data model
class FeedbackData(BaseModel):
    rating: str  # "positive" or "negative"
    comment: Optional[str] = None
    question: Optional[str] = None
    answer: Optional[str] = None
    timestamp: Optional[str] = None

# Store feedback data
feedback_store = []

app = FastAPI()

# ✅ Enable CORS to allow frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load embedding and reranking models
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
cross_encoder = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

# ✅ FAISS index for fast vector search
index = faiss.IndexFlatL2(384)  # Dimension 384 for MiniLM embeddings
document_store = []  # Cache to store documents

# ✅ Cache for frequently accessed documents
cache = OrderedDict()
CACHE_SIZE = 100

def add_to_cache(key, value):
    if key in cache:
        cache.move_to_end(key)
    elif len(cache) >= CACHE_SIZE:
        cache.popitem(last=False)  # Remove least recently used item
    cache[key] = value

def process_document(file_bytes: bytes) -> list[Document]:
    """Processes an uploaded PDF file, extracts text, and splits it into smaller chunks."""
    temp_fd, temp_path = tempfile.mkstemp(suffix=".pdf")
    try:
        with os.fdopen(temp_fd, "wb") as temp_file:
            temp_file.write(file_bytes)
        
        with pdfplumber.open(temp_path) as pdf:
            text = "\n".join([page.extract_text() or "" for page in pdf.pages])

    finally:
        os.unlink(temp_path)
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500, chunk_overlap=100, separators=["\n\n", "\n", ".", "?", "!", " ", ""]
    )
    # Create a Document object from the text
    doc = Document(page_content=text)
    return text_splitter.split_documents([doc])

def add_to_vector_store(all_splits: list[Document]):
    """Adds document splits to the FAISS index for fast retrieval."""
    global document_store, index
    texts = [split.page_content for split in all_splits]
    embeddings = embedding_model.encode(texts)
    
    index.add(np.array(embeddings, dtype=np.float32))
    document_store.extend(texts)
    return {"message": "Data added to the FAISS vector store!"}

def query_expansion(prompt: str) -> str:
    """Expands queries dynamically using synonyms or related terms."""
    # Simple expansion example (can use NLP models for more advanced expansion)
    expansions = {"AI": "artificial intelligence", "NLP": "natural language processing"}
    words = prompt.split()
    expanded_query = " ".join([expansions.get(word, word) for word in words])
    return expanded_query

def query_vector_store(prompt: str, n_results: int = 10):
    """Queries FAISS vector store and returns relevant documents."""
    global index, document_store
    
    # Check if we have any documents in the store
    if not document_store:
        return []
        
    expanded_query = query_expansion(prompt)
    query_embedding = embedding_model.encode([expanded_query])
    
    # Ensure n_results doesn't exceed the number of documents
    n_results = min(n_results, len(document_store))
    
    D, I = index.search(np.array(query_embedding, dtype=np.float32), n_results)
    
    # Filter out invalid indices and get corresponding documents
    results = []
    for idx in I[0]:
        if 0 <= idx < len(document_store):
            results.append(document_store[idx])
    
    return results

def call_llm(context: str, prompt: str):
    """Calls the language model with context and prompt to generate a response."""
    response = ollama.chat(
        model="gemma3:12b",
        stream=True,
        messages=[
            {"role": "system", "content": "Strictly answer based on context."},
            {"role": "user", "content": f"Context: {context}, Question: {prompt}"},
        ],
    )
    for chunk in response:
        if chunk["done"] is False:
            yield chunk["message"]["content"]
        else:
            break

def re_rank_cross_encoders(prompt: str, documents: list[str]) -> tuple[str, list[int]]:
    """Re-ranks documents using a cross-encoder model."""
    scores = cross_encoder.predict([(prompt, doc) for doc in documents])
    ranked_results = sorted(zip(documents, scores), key=lambda x: x[1], reverse=True)
    relevant_text = " ".join([doc[0] for doc in ranked_results[:3]])
    return relevant_text, [i for i, _ in enumerate(ranked_results[:3])]

@app.post("/process")
async def process_pdf(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        return JSONResponse(status_code=400, content={"error": "Invalid file type"})
    
    contents = await file.read()
    splits = process_document(contents)
    result = add_to_vector_store(splits)
    return result

@app.post("/ask")
async def ask_question(prompt: str = Form(...)):
    cache_key = f"ask:{prompt}"
    if cache_key in cache:
        return cache[cache_key]
    
    results = query_vector_store(prompt)
    if not results:
        return {"response": "No relevant documents found.", "retrieved_documents": [], "relevant_ids": []}
    
    relevant_text, relevant_text_ids = re_rank_cross_encoders(prompt, results)
    response_chunks = []
    for chunk in call_llm(context=relevant_text, prompt=prompt):
        response_chunks.append(chunk)
    
    response_text = "".join(response_chunks)
    final_response = {
        "response": response_text,
        "retrieved_documents": results,
        "relevant_ids": relevant_text_ids,
    }
    add_to_cache(cache_key, final_response)
    return final_response

@app.post("/feedback")
async def submit_feedback(feedback: FeedbackData):
    """Store feedback for RLHF training."""
    try:
        # Add timestamp if not provided
        if not feedback.timestamp:
            feedback.timestamp = datetime.now().isoformat()
        
        # Store feedback
        feedback_store.append(feedback.model_dump())
        
        # Save feedback to file for persistence
        with open("feedback_data.json", "a") as f:
            json.dump(feedback.model_dump(), f)
            f.write("\n")
        
        return {"message": "Feedback received successfully"}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to store feedback: {str(e)}"}
        )

@app.get("/feedback")
async def get_feedback():
    """Retrieve stored feedback data."""
    return feedback_store

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)
