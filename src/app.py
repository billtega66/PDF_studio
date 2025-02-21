from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
import uvicorn
import tempfile, os
import base64
import chromadb
import ollama
from chromadb.utils.embedding_functions.ollama_embedding_function import (
    OllamaEmbeddingFunction,
)
from fastapi.middleware.cors import CORSMiddleware
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import CrossEncoder


app = FastAPI()
# ✅ Enable CORS to allow frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (change this to frontend URL if needed)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods
    allow_headers=["*"],  # Allows all headers
)
system_prompt = """
You are an AI assistant tasked with providing detailed answers based solely on the given context. Your goal is to analyze the information provided and formulate a comprehensive, well-structured response to the question.

context will be passed as "Context:"
user question will be passed as "Question:"

To answer the question:
1. Thoroughly analyze the context, identifying key information relevant to the question.
2. Organize your thoughts and plan your response to ensure a logical flow of information.
3. Formulate a detailed answer that directly addresses the question, using only the information provided in the context.
4. Ensure your answer is comprehensive, covering all relevant aspects found in the context.
5. If the context doesn't contain sufficient information to fully answer the question, state this clearly in your response.

Format your response as follows:
1. Use clear, concise language.
2. Organize your answer into paragraphs for readability.
3. Use bullet points or numbered lists where appropriate to break down complex information.
4. If relevant, include any headings or subheadings to structure your response.
5. Ensure proper grammar, punctuation, and spelling throughout your answer.

Important: Base your entire response solely on the information provided in the context. Do not include any external knowledge or assumptions not present in the given text.
"""
def process_document(file_bytes: bytes) -> list[Document]:
    """Processes an uploaded PDF file, extracts text, and splits it into smaller chunks."""
    
    # ✅ Use mkstemp() to avoid permission errors
    temp_fd, temp_path = tempfile.mkstemp(suffix=".pdf")
    
    try:
        # ✅ Write bytes to the temporary file
        with os.fdopen(temp_fd, "wb") as temp_file:
            temp_file.write(file_bytes)

        # ✅ Load and extract text using PyMuPDFLoader
        loader = PyMuPDFLoader(temp_path)
        docs = loader.load()

    finally:
        # ✅ Delete the temporary file after processing to avoid permission errors
        os.unlink(temp_path)

    # ✅ Split text into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100,
        separators=["\n\n", "\n", ".", "?", "!", " ", ""],
    )
    return text_splitter.split_documents(docs)

def get_vector_collection() -> chromadb.Collection:
    """Gets or creates a ChromaDB collection for vector storage.
    """
    ollama_ef = OllamaEmbeddingFunction(
        url="http://localhost:11434/api/embeddings",
        model_name="nomic-embed-text:latest",
    )

    chroma_client = chromadb.PersistentClient(path="./demo-rag-chroma")
    return chroma_client.get_or_create_collection(
        name="rag_app",
        embedding_function=ollama_ef,
        metadata={"hnsw:space": "cosine"},
    )


def add_to_vector_collection(all_splits: list[Document], file_name: str):
    """Adds document splits to a vector collection for semantic search.
    """
    collection = get_vector_collection()
    documents, metadatas, ids = [], [], []

    for idx, split in enumerate(all_splits):
        documents.append(split.page_content)
        metadatas.append(split.metadata)
        ids.append(f"{file_name}_{idx}")

    collection.upsert(
        documents=documents,
        metadatas=metadatas,
        ids=ids,
    )
    return {"message":"Data added to the vector store!"}


def query_collection(prompt: str, n_results: int = 10):
    """Queries the vector collection with a given prompt to retrieve relevant documents.
    """
    collection = get_vector_collection()
    results = collection.query(query_texts=[prompt], n_results=n_results)
    return results


def call_llm(context: str, prompt: str):
    """Calls the language model with context and prompt to generate a response.
    """
    response = ollama.chat(
        model="phi4",
        stream=True,
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": f"Context: {context}, Question: {prompt}",
            },
        ],
    )
    for chunk in response:
        if chunk["done"] is False:
            yield chunk["message"]["content"]
        else:
            break


def re_rank_cross_encoders(prompt:str, documents: list[str]) -> tuple[str, list[int]]:
    """Re-ranks documents using a cross-encoder model for more accurate relevance scoring.
    """
    relevant_text = ""
    relevant_text_ids = []

    encoder_model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    ranks = encoder_model.rank(prompt, documents, top_k=3)
    for rank in ranks:
        relevant_text += documents[rank["corpus_id"]]
        relevant_text_ids.append(rank["corpus_id"])

    return relevant_text, relevant_text_ids


@app.post("/process")
async def process_pdf(file: UploadFile = File(...)):
    """Handles PDF uploads, processes the document, and indexes it."""
    
    if file.content_type != "application/pdf":
        return JSONResponse(status_code=400, content={"error": "Invalid file type"})
    
    contents = await file.read()  # ✅ Read the file as bytes
    splits = process_document(contents)  # ✅ Process PDF

    file_name = file.filename.replace("-", "_").replace(" ", "_").replace(".", "_")

    # ✅ Index the document in the vector database
    result = add_to_vector_collection(splits, file_name)

    return result  # ✅ Return success message


@app.post("/ask")
async def ask_question(prompt: str = Form(...)):
    results = query_collection(prompt)

    # ✅ Ensure documents exist before processing
    if not results["documents"]:
        return {"response": "No relevant documents found.", "retrieved_documents": [], "relevant_ids": []}

    context = results["documents"][0]  # Extract retrieved documents

    # ✅ Fix: Pass both `prompt` and `context` to re_rank_cross_encoders()
    relevant_text, relevant_text_ids = re_rank_cross_encoders(prompt, context)

    response_chunks = []
    for chunk in call_llm(context=relevant_text, prompt=prompt):
        response_chunks.append(chunk)

    response_text = "".join(response_chunks)
    return {
        "response": response_text,
        "retrieved_documents": results,
        "relevant_ids": relevant_text_ids,
    }

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)
