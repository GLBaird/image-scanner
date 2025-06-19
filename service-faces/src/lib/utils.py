def parse_int(value: str, fallback: int) -> int:
    try:
        return int(value)
    except (ValueError, TypeError):
        return fallback
