from transformers import BlipProcessor, BlipForConditionalGeneration

# Trigger download of model weights and tokenizer
BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
