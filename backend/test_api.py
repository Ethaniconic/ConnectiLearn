"""Test script to check AIMLAPI models"""
import requests

api_key = "8923cb9b3ce7472ba57ffe3e7269f329"
base_url = "https://api.aimlapi.com/v1"

# Test different models
models_to_test = [
    "mistralai/Mistral-7B-Instruct-v0.1",
    "mistralai/Mistral-7B-Instruct-v0.2",
    "openchat/openchat-3.5-0106",
    "HuggingFaceH4/zephyr-7b-beta",
    "gpt-3.5-turbo",
]

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

print("Testing AIMLAPI models...\n")

for model in models_to_test:
    print(f"Testing: {model}")
    data = {
        "model": model,
        "messages": [{"role": "user", "content": "Hello"}],
        "max_tokens": 10
    }
    
    try:
        response = requests.post(
            f"{base_url}/chat/completions",
            headers=headers,
            json=data,
            timeout=10
        )
        
        if response.status_code == 200:
            print(f"  ✅ SUCCESS! Model works!\n")
            break
        else:
            print(f"  ❌ Error {response.status_code}: {response.json().get('message', 'Unknown error')}\n")
    except Exception as e:
        print(f"  ❌ Exception: {str(e)}\n")
