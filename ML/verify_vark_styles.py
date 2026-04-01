import subprocess
import sys

def test_prediction(answers):
    cmd = [sys.executable, 'ML/predict.py']
    for i, val in enumerate(answers):
        cmd.extend([f'--q{i+1}', str(val)])
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout.strip()

# Test patterns (Favorable to specific styles)
# 1-5: R, 6-10: A, 11-15: K, 16-20: V
tests = {
    "ReadWrite": [5, 5, 5, 5, 5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    "Auditory": [1, 1, 1, 1, 1, 5, 5, 5, 5, 5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    "Kinesthetic": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 5, 5, 5, 5, 5, 1, 1, 1, 1, 1],
    "Visual": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 5, 5, 5, 5, 5]
}

print("--- Verifying High-Accuracy Model Predictions ---")
for expected, answers in tests.items():
    predicted = test_prediction(answers)
    status = "✅ PASS" if predicted == expected else f"❌ FAIL (Got: {predicted})"
    print(f"Expect: {expected} -> Predicted: {predicted} | {status}")
