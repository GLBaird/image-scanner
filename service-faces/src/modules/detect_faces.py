from pydantic import BaseModel, ConfigDict, Field
from typing import List
import numpy as np
import cv2
import warnings

# Suppress warning from face_recognition_models
warnings.filterwarnings(
    "ignore", category=UserWarning, module=r".*face_recognition_models.*"
)

import face_recognition  # noqa: E402


class FaceData(BaseModel):
    hash: str
    coord_x: int = Field(alias="coordX")
    coord_y: int = Field(alias="coordY")
    width: int
    height: int

    model_config = ConfigDict(populate_by_name=True)


def detect_faces(image_data: bytes) -> List[FaceData]:
    faces: List[FaceData] = []

    nparr = np.frombuffer(image_data, np.uint8)
    image_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)

    locations = face_recognition.face_locations(image_rgb)
    hashes = face_recognition.face_encodings(image_rgb, known_face_locations=locations)

    for loc, encoding in zip(locations, hashes):
        top, right, bottom, left = loc
        width = right - left
        height = bottom - top

        face = FaceData(
            hash=",".join(f"{x:.8f}" for x in encoding),
            coord_x=left,
            coord_y=top,
            width=width,
            height=height,
        )
        faces.append(face)

    return faces
