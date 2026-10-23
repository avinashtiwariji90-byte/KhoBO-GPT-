import re
from typing import Optional, Dict, Any

class LeadExtractor:
    @staticmethod
    def extract_lead_from_conversation(user_message: str, history_context: str = "") -> Optional[Dict[str, Any]]:
        full_text = f"{history_context}\n{user_message}"

        # 1. Contact detection: email or phone
        email_pattern = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
        phone_pattern = r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+?\d{10,14}"
        
        emails = re.findall(email_pattern, full_text)
        phones = re.findall(phone_pattern, full_text)
        
        has_contact = bool(emails or phones)
        if not has_contact:
            return None

        contact_info = []
        if emails:
            contact_info.append(emails[0])
        if phones:
            contact_info.append(phones[0])
        contact_str = " | ".join(contact_info)

        # 2. Name detection
        name = "Prospective Client"
        name_match = re.search(r"(?:my name is|i am|i'm|this is|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)", full_text, re.IGNORECASE)
        if name_match:
            name = name_match.group(1).strip()
        elif emails:
            # fallback name from email username
            clean_user = emails[0].split('@')[0].replace('.', ' ').title()
            if len(clean_user) > 2:
                name = clean_user

        # 3. Budget detection
        budget_match = re.search(r"(?:\$|€|£|INR|Rs\.?|USD)?\s?\d+(?:,\d+)*(?:\s?(?:k|thousand|million|lakh|crore))?(?:\s?-\s?(?:\$|€|£|INR|Rs\.?)?\s?\d+(?:,\d+)*(?:\s?(?:k|thousand|million|lakh|crore))?)?", full_text, re.IGNORECASE)
        budget = "Flexible / Discussion"
        budget_keywords = re.search(r"(?:budget(?:\s+is)?(?:\s+around)?\s*[:=-]?\s*)([^.\n,]+)", full_text, re.IGNORECASE)
        if budget_keywords:
            budget = budget_keywords.group(1).strip()
        elif budget_match and any(symbol in full_text for symbol in ["$", "€", "budget", "k", "USD", "INR"]):
            budget = budget_match.group(0).strip()

        # 4. Location detection
        location = "Global / Remote"
        loc_match = re.search(r"(?:in|from|located in|based in)\s+([A-Z][a-zA-Z\s]{2,25}(?:,\s*[A-Z]{2,})?)", full_text)
        if loc_match:
            location = loc_match.group(1).strip()

        # 5. Requirement
        requirement = user_message.strip()
        if len(requirement) > 300:
            requirement = requirement[:300] + "..."

        return {
            "name": name,
            "contact": contact_str,
            "requirement": requirement or "General AI Assistant Inquiry",
            "budget": budget,
            "location": location,
            "source": "AI Lead Assistant",
            "status": "New"
        }

lead_extractor = LeadExtractor()
