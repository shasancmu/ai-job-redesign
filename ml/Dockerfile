# Inference service for sciscore, for Cloud Run (or any container host).
# Built by Cloud Build from source — no local Docker needed:
#   gcloud run deploy sciscore --source ml ...
#
# SciBERT is baked into the image at build time so cold starts don't download it.
# Listens on $PORT (Cloud Run injects 8080).
FROM python:3.11-slim

WORKDIR /app
ENV PIP_NO_CACHE_DIR=1 \
    HF_HOME=/app/.hf \
    TRANSFORMERS_VERBOSITY=error \
    TOKENIZERS_PARALLELISM=false

# CPU-only torch first (keeps the image small — no CUDA libs), then the rest.
COPY requirements.txt .
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu \
 && pip install -r requirements.txt

COPY sciscore ./sciscore
COPY tasks ./tasks
# Your trained model(s), baked into the image:
COPY models ./models

# Pre-download SciBERT into the image so the first request is fast.
RUN python -c "from transformers import AutoModel, AutoTokenizer; \
AutoTokenizer.from_pretrained('allenai/scibert_scivocab_uncased'); \
AutoModel.from_pretrained('allenai/scibert_scivocab_uncased')"

ENV SCISCORE_MODEL_DIR=/app/models
EXPOSE 8080
CMD ["sh", "-c", "python -m sciscore.cli serve --models-dir /app/models --host 0.0.0.0 --port ${PORT:-8080}"]
