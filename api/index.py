"""
Vercel serverless handler for ConnectiLearn API
"""
from mangum import Mangum
from backend.app.main import app

# Mangum handler for AWS Lambda/Vercel
handler = Mangum(app, lifespan="off")
