import os
import re
from typing import List, Dict, Any
from pypdf import PdfReader
from docx import Document

class DocumentService:
    @staticmethod
    def extract_text(file_path: str, mime_type: str) -> str:
        text = ""
        ext = os.path.splitext(file_path)[1].lower()

        try:
            if ext == ".pdf" or "pdf" in mime_type:
                reader = PdfReader(file_path)
                pages_text = []
                for i, page in enumerate(reader.pages):
                    page_content = page.extract_text()
                    if page_content:
                        pages_text.append(f"--- Page {i+1} ---\n{page_content}")
                text = "\n\n".join(pages_text)

            elif ext == ".docx" or "wordprocessingml" in mime_type:
                doc = Document(file_path)
                paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
                for table in doc.tables:
                    for row in table.rows:
                        row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                        if row_text:
                            paragraphs.append(row_text)
                text = "\n".join(paragraphs)

            elif ext in [".txt", ".csv", ".json", ".md", ".py", ".js", ".html"]:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    text = f.read()

            elif ext in [".jpg", ".jpeg", ".png", ".webp", ".svg"]:
                text = f"[Image Document: {os.path.basename(file_path)}. Visual inspection metadata: Image size {os.path.getsize(file_path)} bytes.]"

            else:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    text = f.read()

        except Exception as e:
            text = f"Error extracting text from document: {str(e)}"

        return text.strip()

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 600, overlap: int = 100) -> List[str]:
        if not text:
            return []
        
        words = text.split()
        if len(words) <= chunk_size:
            return [text]

        chunks = []
        i = 0
        while i < len(words):
            chunk = " ".join(words[i:i + chunk_size])
            chunks.append(chunk)
            i += (chunk_size - overlap)
        return chunks

    @staticmethod
    def search_relevant_chunks(query: str, chunks: List[str], top_k: int = 3) -> List[str]:
        if not chunks:
            return []
        
        # Simple BM25/keyword similarity scoring
        query_words = set(re.findall(r"\w+", query.lower()))
        if not query_words:
            return chunks[:top_k]

        scored_chunks = []
        for chunk in chunks:
            chunk_lower = chunk.lower()
            score = 0
            for word in query_words:
                if len(word) > 2:
                    matches = len(re.findall(r"\b" + re.escape(word) + r"\b", chunk_lower))
                    score += matches * 2
                    if word in chunk_lower:
                        score += 1
            scored_chunks.append((score, chunk))

        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        return [c for score, c in scored_chunks[:top_k] if score > 0] or chunks[:top_k]

doc_service = DocumentService()
