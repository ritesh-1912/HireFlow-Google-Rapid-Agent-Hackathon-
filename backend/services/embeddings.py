import os
from dotenv import load_dotenv
import vertexai
from vertexai.language_models import TextEmbeddingModel

# Load environment variables
load_dotenv()

# Initialize Vertex AI
project = os.environ.get("GOOGLE_CLOUD_PROJECT")
location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")

if project:
    vertexai.init(project=project, location=location)
else:
    print("Warning: GOOGLE_CLOUD_PROJECT is not set. Vertex AI initialization skipped.")

def get_embedding(text: str) -> list[float]:
    """
    Calls the Vertex AI text-embedding-004 model to embed a string.
    Returns a 768-dimensional vector as a list of floats.
    """
    try:
        model = TextEmbeddingModel.from_pretrained("text-embedding-004")
        embeddings = model.get_embeddings([text])
        return embeddings[0].values
    except Exception as e:
        print(f"Error generating embedding: {e}")
        # Return a zero vector of dimension 768 as a fallback
        return [0.0] * 768

def embed_text(text: str) -> list[float]:
    """
    Calls the Vertex AI text-embedding-004 model. Alias for get_embedding.
    """
    return get_embedding(text)
