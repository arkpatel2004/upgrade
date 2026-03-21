import os
import uvicorn
import pandas as pd
import chromadb
import asyncio
import requests
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# --- 1. The Watcher Class ---
class CSVWatcher(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path.endswith("data.csv"):
            print("\n[\u2714] Detected change in data.csv! Triggering ingest sequence...")
            try:
                requests.post("http://127.0.0.1:8000/api/ingest")
            except Exception as e:
                print(f"[-] Server not ready yet: {e}")

# --- 2. Lifespan Manager ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Run the watcher in a separate thread
    observer = Observer()
    observer.schedule(CSVWatcher(), path=".", recursive=False)
    observer.start()
    print("Background CSV Watcher started...")
    
    yield  # The application runs here
    
    # Shutdown: Clean up the thread
    observer.stop()
    observer.join()
    print("Background CSV Watcher stopped.")

# --- 3. App Initialization ---
app = FastAPI(lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Clients
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
# Using 2.5 flash as verified working with user API Key Quotas
gemini_model = genai.GenerativeModel('gemini-2.5-flash')

# Vector Database
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection_name = "support_emails"
collection = chroma_client.get_or_create_collection(name=collection_name)

class QueryRequest(BaseModel):
    message: str

def get_embedding(text: str) -> list[float]:
    """Get the Gemini embedding for a given text documents."""
    try:
        # Using 001 because it's the only one allowed on user's API Key
        result = genai.embed_content(model="models/gemini-embedding-001", content=text)
        return result['embedding']
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return []

def get_query_embedding(text: str):
     """Get the specific embedding needed for a query search."""
     try:
          result = genai.embed_content(model="models/gemini-embedding-001", content=text)
          return result['embedding']
     except Exception as e:
          print(f"Error generating query embedding: {e}")
          return str(e)

@app.post("/api/ingest")
async def ingest_csv():
    try:
        print("Starting ingestion process...")
        if not os.path.exists("data.csv"):
            raise HTTPException(status_code=404, detail="data.csv not found")

        # --- NEW CODE: WIPE THE DATABASE CLEAN FIRST ---
        print("Wiping database collection clean to prevent ghost data...")
        global collection
        try:
            chroma_client.delete_collection(name=collection_name)
            collection = chroma_client.get_or_create_collection(name=collection_name)
            print("Database is now empty and ready for fresh data.")
        except Exception as e:
            print(f"Failed to delete collection, it might be empty already: {e}")
        # -----------------------------------------------

        df = pd.read_csv("data.csv")
        
        documents = []
        metadatas = []
        ids = []
        embeddings = []
        
        for index, row in df.iterrows():
            print(f"Processing row {index + 1}/{len(df)}...")
            content = f"Customer Query: {row['customer_message']}\nOur Standard Response: {row['company_response']}"
            embedding = get_embedding(content)
            
            if not embedding:
                print(f"Warning: skipped embedding for row {index}")
                continue
                
            documents.append(content)
            metadatas.append({"company_response": row["company_response"]})
            ids.append(f"doc_{index}")
            embeddings.append(embedding)
            
            # Rate limiting logic: wait 3 seconds to stay under Google Free Tier 15 RPM
            if index < len(df) - 1:
                await asyncio.sleep(3)
                
        if documents:
            collection.upsert(
                documents=documents,
                embeddings=embeddings,
                metadatas=metadatas,
                ids=ids
            )
            print(f"Finished! Ingested {len(documents)} records.")
            return {"message": f"Successfully ingested {len(documents)} records using Gemini."}
        else:
            return {"message": "No documents were processed successfully."}
            
    except Exception as e:
        print(f"Ingest Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stages")
def get_stages():
    """Returns a list of predefined fixed stage messages from stages.csv."""
    try:
        if not os.path.exists("stages.csv"):
            return []
        df = pd.read_csv("stages.csv")
        return df.to_dict(orient="records")
    except Exception as e:
        print(f"Error reading stages.csv: {e}")
        return []

@app.post("/api/chat")
async def chat(request: QueryRequest):
    """Retrieve relevant context and generate a response using Gemini."""
    try:
        query_embedding_or_error = get_query_embedding(request.message)
        
        if isinstance(query_embedding_or_error, str):
             raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {query_embedding_or_error}")
        
        query_embedding = query_embedding_or_error

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=3
        )
        
        context_texts = []
        if results and results['metadatas'] and results['metadatas'][0]:
            for metadata in results['metadatas'][0]:
                context_texts.append(metadata['company_response'])
                
        context = "\n\n---\n\n".join(context_texts)
        
        prompt = f"""
        You are an expert customer support engineer.
        A customer has sent: "{request.message}"

        Here is how we successfully solved similar issues in the past:
        {context}

        Based on the past examples, please generate a response with two distinct sections:
        1. **Technical Message**: A polite message to the customer explaining the solution.
        2. **Code Review**: A specific snippet or advice on what code they need to fix.

        Keep the tone professional and consistent with our past data.
        """
        response = gemini_model.generate_content(prompt)
        
        return {
            "response": response.text,
            "retrieved_context_count": len(context_texts)
        }
        
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "RAG Support API is running via app.py"}

if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
