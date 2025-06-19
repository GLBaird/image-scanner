from pathlib import Path
from modules.detect_faces import detect_faces
import face_recognition
import numpy as np

FIXTURE_DIR = Path(__file__).parent / "fixtures"


def parse_hash_vector(hash_str: str) -> np.ndarray:
    return np.array([float(x) for x in hash_str.split(",")], dtype=np.float64)


def test_detect_faces_on_jpg_and_png():
    jpg_path = FIXTURE_DIR / "faces.jpg"
    png_path = FIXTURE_DIR / "faces.png"

    jpg_faces = detect_faces(jpg_path.read_bytes())
    png_faces = detect_faces(png_path.read_bytes())

    assert len(jpg_faces) == 8, "faces.jpg should have 8 faces"
    assert len(png_faces) == 8, "faces.png should have 8 faces"

    for f1, f2 in zip(jpg_faces, png_faces):
        # Compare face locations
        assert (f1.coord_x, f1.coord_y, f1.width, f1.height) == (
            f2.coord_x,
            f2.coord_y,
            f2.width,
            f2.height,
        )

        # Compare encodings using face_recognition
        encoding1 = parse_hash_vector(f1.hash)
        encoding2 = parse_hash_vector(f2.hash)
        matches = face_recognition.compare_faces([encoding1], encoding2, tolerance=0.6)
        assert matches[0], "Face encodings should match between PNG and JPG"
