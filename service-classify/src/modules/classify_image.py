from transformers import BlipProcessor, BlipForConditionalGeneration
from PIL import Image
import io
from typing import List
import torch


processor = BlipProcessor.from_pretrained(
    "Salesforce/blip-image-captioning-base", use_fast=True
)
model = BlipForConditionalGeneration.from_pretrained(
    "Salesforce/blip-image-captioning-base"
)
model = torch.compile(model)
model.eval()


def buffer_to_resized_pil(image_data: bytes, max_size: int = 384) -> Image.Image:
    image = Image.open(io.BytesIO(image_data)).convert("RGB")
    image.thumbnail(
        (max_size, max_size), Image.Resampling.LANCZOS
    )  # Preserve aspect ratio
    return image


def classify_image(image_data: bytes) -> List[str]:
    image = buffer_to_resized_pil(image_data)
    inputs = processor(image, return_tensors="pt")
    with torch.no_grad():
        output = model.generate(**inputs, max_new_tokens=20)
    return processor.decode(output[0], skip_special_tokens=True)
