"""Builds synthetic Noji `.ofc` exports in the shape the open-source Noji-to-Anki converter reads.

`export.ofc` is the current form: `deck_export_data` (zstd JSON) beside a stored `attachments.zip`.
`legacy.ofc` is the older form: `deck_data.json` beside a deflated `attachments.zip`.
The zstd frame is written with raw blocks, so no compressor is needed.

Run from this directory: python3 generate.py
"""

import io
import json
import os
import struct
import zipfile
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
# 2026-01-01 04:00 UTC; every date counts from here.
CREATED = 1767240000000
DAY = 86400000
MINUTE = 60000


def iso(ms):
    from datetime import datetime, timezone

    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def png(width, height, rgb):
    raw = b"".join(b"\x00" + bytes(rgb) * width for _ in range(height))

    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")


def zstd_raw(data):
    """A single-segment zstd frame of raw blocks, declaring its content size."""
    out = b"\x28\xb5\x2f\xfd" + bytes([0xA0]) + struct.pack("<I", len(data))
    step = 128 * 1024
    blocks = [data[i : i + step] for i in range(0, len(data), step)] or [b""]
    for i, block in enumerate(blocks):
        last = 1 if i == len(blocks) - 1 else 0
        out += struct.pack("<I", last | (len(block) << 3))[:3] + block
    return out


def attachment(side, name):
    return {
        "field_name": side,
        "attachment": {"media_file": {"url": f"https://cdn.example.com/noji/media/{name}"}},
    }


def graduated(due_days, interval_days, frozen=False):
    return {
        "learning_state": "graduated",
        "next_review_at": iso(CREATED + due_days * DAY),
        "interval": interval_days * 24 * 60,
        "ease_factor": 250,
        "learning_steps_index": None,
        "frozen": frozen,
    }


decks = [
    {
        "id": 101,
        "name": "Spanish",
        "ancestry": "/",
        "settings": [{"steps_in_minutes": "1 10"}],
        "notes": [
            {
                "id": 9001,
                "fields": {"front_side": "el gato", "back_side": "the cat"},
                "note_attachments": [attachment("back_side", "gato.png")],
                # Known: reviewed ten days before it is due again.
                "progresses": [graduated(30, 10)],
            },
            {
                "id": 9002,
                "fields": {"front_side": "<b>el perro</b>", "back_side": "the dog<br>a pet"},
                "note_attachments": [],
                # Still in its learning steps, so it starts new.
                "progresses": [
                    {
                        "learning_state": "learning",
                        "next_review_at": iso(CREATED + 10 * MINUTE),
                        "interval": 10,
                        "ease_factor": None,
                        "learning_steps_index": 1,
                        "frozen": False,
                    }
                ],
            },
            {
                "id": 9003,
                "fields": {"front_side": "la casa", "back_side": "the house"},
                "note_attachments": [],
                "progresses": [{"learning_state": "new", "next_review_at": None, "frozen": False}],
            },
            {
                "id": 9004,
                "fields": {"front_side": "el libro", "back_side": "the book"},
                "note_attachments": [],
                "progresses": [graduated(40, 20, frozen=True)],
            },
            {
                "id": 9005,
                "fields": {"front_side": "Tengo un {{c1::gato}} y un {{c2::perro::animal}}.", "back_side": "pets"},
                "note_attachments": [],
                "progresses": [graduated(15, 5)],
            },
            {
                # Image occlusion: pictures and no text.
                "id": 9006,
                "fields": {"front_side": "", "back_side": ""},
                "note_attachments": [attachment("front_side", "mapa.png")],
                "progresses": [],
            },
            {
                # Forgotten after a 12-day interval, relearning: it keeps its interval.
                "id": 9007,
                "fields": {"front_side": "el agua", "back_side": "the water"},
                "note_attachments": [attachment("front_side", "missing.png")],
                "progresses": [
                    {
                        "learning_state": "learning",
                        "next_review_at": iso(CREATED + MINUTE),
                        "interval": 12 * 24 * 60,
                        "ease_factor": 230,
                        "learning_steps_index": None,
                        "frozen": False,
                    }
                ],
            },
        ],
    },
    {
        "id": 102,
        "name": " Verbs ",
        "ancestry": "/101/",
        "settings": [{"steps_in_minutes": "1 10"}],
        "notes": [
            {
                "id": 9101,
                "fields": {"front_side": "hablar", "back_side": "to speak"},
                "note_attachments": [attachment("front_side", "hablar.png")],
            },
        ],
    },
    {"id": 103, "name": "Empty", "ancestry": "/", "notes": []},
]

media = {"gato.png": png(32, 24, (200, 120, 40)), "hablar.png": png(24, 24, (40, 120, 200)), "mapa.png": png(24, 24, (0, 0, 0))}


def entry(name, method):
    """A zip entry with a fixed date, so the fixtures are the same on every run."""
    info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
    info.compress_type = method
    return info


def attachments_zip(method):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as z:
        for name, data in media.items():
            z.writestr(entry(f"attachments/{name}", method), data)
    return buffer.getvalue()


def write(name, data_name, data, method):
    # The current form stores attachments.zip, so it is read in place; the legacy form deflates it.
    with zipfile.ZipFile(os.path.join(HERE, name), "w") as z:
        z.writestr(entry(data_name, zipfile.ZIP_DEFLATED), data)
        z.writestr(entry("attachments.zip", method), attachments_zip(method))
        z.writestr(entry("__MACOSX/._deck_data.json", zipfile.ZIP_DEFLATED), b"junk")


payload = json.dumps(decks, ensure_ascii=False).encode()
write("export.ofc", "deck_export_data", zstd_raw(payload), zipfile.ZIP_STORED)
write("legacy.ofc", "deck_data.json", payload, zipfile.ZIP_DEFLATED)
