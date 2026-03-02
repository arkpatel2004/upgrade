import os
import uvicorn
import pandas as pd
import chromadb
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in prodaction
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Clients
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
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
    """Read data.csv, create Gemini embeddings, and store them in ChromaDB.
    You only need to run this ONCE when you update your data.csv!
    """
    try:
        if not os.path.exists("data.csv"):
            raise HTTPException(status_code=404, detail="data.csv not found")
        
        df = pd.read_csv("data.csv")
        
        documents = []
        metadatas = []
        ids = []
        embeddings = []
        
        for index, row in df.iterrows():
            content = f"Customer Query: {row['customer_message']}\nOur Standard Response: {row['company_response']}"
            embedding = get_embedding(content)
            
            if not embedding:
                print(f"Warning: skipped embedding for row {index}")
                continue
                
            documents.append(content)
            metadatas.append({"company_response": row["company_response"]})
            ids.append(f"doc_{index}")
            embeddings.append(embedding)
            
        if documents:
            collection.upsert(
                documents=documents,
                embeddings=embeddings,
                metadatas=metadatas,
                ids=ids
            )
            return {"message": f"Successfully ingested {len(documents)} records using Gemini."}
        else:
            return {"message": "No documents were processed successfully."}
            
    except Exception as e:
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
        # 1. Get embedding for the incoming customer message
        query_embedding_or_error = get_query_embedding(request.message)
        
        if isinstance(query_embedding_or_error, str):
             raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {query_embedding_or_error}")
        
        query_embedding = query_embedding_or_error

        # 2. Search ChromaDB for the most relevant past emails (top 3)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=3
        )
        
        # 3. Extract the context (past company responses)
        context_texts = []
        if results and results['metadatas'] and results['metadatas'][0]:
            for metadata in results['metadatas'][0]:
                context_texts.append(metadata['company_response'])
                
        context = "\n\n---\n\n".join(context_texts)
        
        # Construct the prompt for Gemini LLM
        prompt = f"""
You are an expert customer support engineer for our company. 
A customer has just sent the following message:

Customer Support Request: "{request.message}"

Below are examples of how we have successfully replied to similar cases in the past:
{context}

Draft a professional, clear, and helpful reply to the customer's request. 
Adopt the tone, formatting, and standard operating procedures shown in our past replies.
Do not invent capabilities or policies that are not present in the past replies.
If the request requires troubleshooting steps from the examples, provide them clearly.
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

# Start the server programmatically when running `python app.py`
if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
