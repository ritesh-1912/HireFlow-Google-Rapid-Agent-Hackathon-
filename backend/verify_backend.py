import os
import sys

# Add current folder to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    print("Testing imports...")
    import models
    from services.pdf_parser import extract_text_from_pdf
    from services.embeddings import get_embedding
    from services.gemini import structure_resume, rank_candidates
    from services.mongodb import insert_resume_doc, get_candidates
    print("Success: All modules imported successfully!")
except Exception as e:
    print(f"Error during import testing: {e}")
    sys.exit(1)

print("\nAll backend services ready to run.")
