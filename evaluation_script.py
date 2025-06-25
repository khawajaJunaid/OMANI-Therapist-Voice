import requests
import json
from typing import Dict, List

class ResponseEvaluator:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
    
    def test_scenario(self, transcript: str, expected_intent: str, expected_emotion: str):
        """Test a specific scenario and return both responses"""
        response = requests.post(f"{self.base_url}/chat", data={
            "transcript": transcript,
            "intent": expected_intent,
            "emotion": expected_emotion,
            "history": "[]"
        })
        return response.json()
    
    def compare_responses(self, gpt_response: str, claude_response: str) -> Dict:
        """Compare two responses on various metrics"""
        return {
            "length_comparison": {
                "gpt": len(gpt_response),
                "claude": len(claude_response),
                "difference": abs(len(gpt_response) - len(claude_response))
            },
            "arabic_content": {
                "gpt": sum(1 for char in gpt_response if '\u0600' <= char <= '\u06FF'),
                "claude": sum(1 for char in claude_response if '\u0600' <= char <= '\u06FF')
            },
            "therapeutic_keywords": {
                "gpt": self.count_therapeutic_keywords(gpt_response),
                "claude": self.count_therapeutic_keywords(claude_response)
            }
        }
    
    def count_therapeutic_keywords(self, text: str) -> int:
        keywords = ["دعم", "مساعدة", "فهم", "أمان", "راحة", "علاج", "شفاء"]
        return sum(1 for keyword in keywords if keyword in text)

# Usage
evaluator = ResponseEvaluator()
test_cases = [
    ("أشعر بالقلق الشديد", "anxiety_consultation", "anxious"),
    ("أفكر في الانتحار", "crisis_intervention", "crisis"),
    ("مشاكل مع العائلة", "family_counseling", "neutral")
]

for transcript, intent, emotion in test_cases:
    result = evaluator.test_scenario(transcript, intent, emotion)
    comparison = evaluator.compare_responses(
        result["gpt4o_response"], 
        result["claude_opus_response"]
    )
    print(f"Test: {transcript}")
    print(f"Comparison: {comparison}")
    print("---") 