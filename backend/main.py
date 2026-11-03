import asyncio
import io
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from PIL import Image, UnidentifiedImageError

load_dotenv(Path(__file__).with_name('.env'))

APP_TITLE = 'Attirelle Aura AI Backend'
MODEL_NAME = os.getenv('GEMINI_MODEL', 'gemini-3.8-flash')
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_IMAGE_DIMENSION = 1400
GEMINI_TIMEOUT_SECONDS = int(os.getenv('GEMINI_TIMEOUT_SECONDS', '90'))

app = FastAPI(title=APP_TITLE, version='1.0.0')

origins = [item.strip() for item in os.getenv(
    'CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173'
).split(',') if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=['GET', 'POST'],
    allow_headers=['*'],
)

PROMPT = '''You are the personal fashion stylist for Attirelle Aura.
Image 1 is the uploaded top. Image 2 is the uploaded bottom.
Evaluate only what is visible. Be honest, constructive, friendly and specific.
Return a concise, polished consultation using these exact sections:

1. Compatibility Score
Give one score from 0 to 100 on its own line as: SCORE: 78/100

2. Colour Compatibility
Describe the palette and why the colours work together or conflict.

3. Overall Style Coordination & Silhouette
Discuss style, proportions, fit and visual balance. Do not invent garment details.

4. What Works Well
Give 2-3 concise positive observations.

5. Shoes & Accessories
Suggest practical shoes, jewellery and bag options.

6. Practical Improvements
Give useful changes if needed. If the pairing already works, say so.

7. Final Verdict
Choose exactly one: Excellent Match, Good Match, or Needs Styling, then explain briefly.
Use short paragraphs and simple bullet points. Avoid decorative symbols, markdown tables,
repeated separators, excessive wording and claims about fabric or fit that cannot be seen.'''


def prepare_image(raw: bytes) -> tuple[bytes, str]:
    """Validate and downscale an image before sending it to the vision model."""
    try:
        with Image.open(io.BytesIO(raw)) as image:
            image = image.convert('RGB')
            image.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.Resampling.LANCZOS)
            output = io.BytesIO()
            image.save(output, format='JPEG', quality=84, optimize=True)
            return output.getvalue(), 'image/jpeg'
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(status_code=400, detail='One of the uploaded files is not a valid image.')


@app.get('/')
async def home():
    return {'message': 'Welcome to Attirelle Aura!', 'status': 'Backend is running'}


@app.get('/health')
async def health_check():
    return {'status': 'healthy', 'model': MODEL_NAME}


@app.post('/analyze-outfit')
async def analyze_outfit(top: UploadFile = File(...), bottom: UploadFile = File(...)):
    started = time.perf_counter()
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail='Gemini API key is not configured on the server.')

    allowed_types = {'image/jpeg', 'image/png', 'image/webp'}
    if top.content_type not in allowed_types or bottom.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail='Please upload JPG, PNG, or WebP images.')

    top_raw = await top.read(MAX_UPLOAD_BYTES + 1)
    bottom_raw = await bottom.read(MAX_UPLOAD_BYTES + 1)
    if not top_raw or not bottom_raw:
        raise HTTPException(status_code=400, detail='Please upload both clothing images.')
    if len(top_raw) > MAX_UPLOAD_BYTES or len(bottom_raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail='Each image must be 5 MB or smaller.')

    top_bytes, top_mime = prepare_image(top_raw)
    bottom_bytes, bottom_mime = prepare_image(bottom_raw)
    print(
        f'[Timing] Image preparation: {time.perf_counter() - started:.2f}s; '
        f'images {len(top_raw)//1024}KB + {len(bottom_raw)//1024}KB -> '
        f'{len(top_bytes)//1024}KB + {len(bottom_bytes)//1024}KB'
    )

    try:
        client = genai.Client(api_key=api_key)
        gemini_started = time.perf_counter()
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=MODEL_NAME,
                contents=[
                    PROMPT,
                    types.Part.from_bytes(data=top_bytes, mime_type=top_mime),
                    types.Part.from_bytes(data=bottom_bytes, mime_type=bottom_mime),
                ],
                config=types.GenerateContentConfig(
                    temperature=0.4,
                    max_output_tokens=1100,
                ),
            ),
            timeout=GEMINI_TIMEOUT_SECONDS,
        )
        print(f'[Timing] Gemini response: {time.perf_counter() - gemini_started:.2f}s')

        if not response or not response.text:
            raise HTTPException(status_code=502, detail='The AI returned an empty analysis. Please try again.')

        print(f'[Timing] Total endpoint time: {time.perf_counter() - started:.2f}s')
        return {'message': 'Outfit analysis completed!', 'analysis': response.text}

    except asyncio.TimeoutError:
        print(f'[Timing] Gemini timed out after {GEMINI_TIMEOUT_SECONDS}s')
        raise HTTPException(status_code=504, detail='The styling analysis took too long. Please try again.')
    except HTTPException:
        raise
    except Exception as exc:
        print(f'Gemini outfit analysis error: {exc!r}')
        raise HTTPException(
            status_code=502,
            detail='AI analysis is temporarily unavailable. Please try again in a moment.',
        )
