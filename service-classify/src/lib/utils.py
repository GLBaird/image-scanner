def parse_int(value: str, fallback: int) -> int:
    try:
        return int(value)
    except (ValueError, TypeError):
        return fallback


def decode_header(value):
    if isinstance(value, bytes):
        return value.decode("utf-8")
    if value is not None:
        return str(value)
    return None
