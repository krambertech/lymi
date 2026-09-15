"""Builds the Mochi fixture export in the verbose Transit JSON a real `.mochi` export uses.

The shape follows a real 6 MB export read on 15 September 2026: decks nest by `parent-id`, cards
sit in their deck's `~#list`, tags are a `~#set`, review dates are `~t` with milliseconds, and
Mochi's generated speech and AI text sit in `component-cache`.

Run from this directory: python3 generate.py
"""

import json
import os
import struct
import zipfile
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
# 2026-01-01 04:00 UTC, the day the first card was reviewed.
CREATED = 1767240000000
DAY = 86400000


def png(width, height, rgb):
    raw = b"".join(b"\x00" + bytes(rgb) * width for _ in range(height))

    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")


def kw(name):
    return "~:" + name


def keys(value):
    """A map with every key written as a Transit keyword."""
    if isinstance(value, dict):
        return {(k if k.startswith("~") or " " in k else kw(k)): keys(v) for k, v in value.items()}
    if isinstance(value, list):
        return [keys(v) for v in value]
    return value


def tagged(tag, items):
    return {"~#" + tag: items}


def at(days):
    return "~t%d" % (CREATED + days * DAY)


def review(day, due, remembered, interval=None):
    entry = {"date": at(day), "due": at(due), "remembered?": remembered, "duration": 4}
    if interval is not None:
        entry["interval"] = interval
    return entry


def card(id, deck, content, tags=(), reviews=(), **extra):
    value = {
        "id": kw(id),
        "deck-id": kw(deck),
        "content": content,
        "name": content.split("\n")[0],
        "pos": "M",
        "tags": tagged("set", list(tags)),
        "references": tagged("set", []),
        "cloze/indexes": tagged("set", []),
        "reviews": list(reviews),
        "new?": not reviews,
        "created-at": {"~#dt": CREATED},
    }
    value.update(extra)
    return value


def fields(**values):
    return {kw(id): {"id": kw(id), "value": value} for id, value in values.items()}


templates = [
    {
        "id": kw("VocabTpl1"),
        "name": "Vocab",
        "content": "# << Word >>\n<< ^doMuteAudio >> << Audio >> <</ doMuteAudio >>\n---\n<< Meaning >>\n<< Reading >>",
        "pos": "F",
        "fields": {
            kw("name"): {"id": kw("name"), "name": "Meaning", "pos": "m"},
            kw("WordFld01"): {"id": kw("WordFld01"), "name": "Word", "pos": "a"},
            kw("ReadFld01"): {"id": kw("ReadFld01"), "name": "Reading", "pos": "g"},
            kw("AudioFld1"): {"id": kw("AudioFld1"), "name": "Audio", "pos": "x", "type": kw("speech"), "source": kw("WordFld01")},
            kw("MuteFld01"): {"id": kw("MuteFld01"), "name": "doMuteAudio", "pos": "y", "type": kw("boolean")},
            kw("AiFld0001"): {"id": kw("AiFld0001"), "name": "Explain", "pos": "z", "type": kw("ai")},
        },
    },
    {
        "id": kw("ReverseTp"),
        "name": "From English",
        "content": "<< Translation >>\n---\n<< Japanese >>",
        "pos": "Q",
        "fields": {
            kw("name"): {"id": kw("name"), "name": "Translation", "pos": "a"},
            kw("JapanFld1"): {"id": kw("JapanFld1"), "name": "Japanese", "pos": "b"},
        },
    },
]

cache = {
    "speech": {'猫 {:lang "ja-JP"}': {"attachment": "neko-voice.mp3"}},
    "ai": {"Explain 猫 {:ai-task \"custom\"}": {"text": "Generated text Lymi leaves out", "date": "2026-01-01", "attachment": None}},
}

lesson = [
    card(
        "GattoCard",
        "Lesson001",
        "il gatto\n---\nthe **cat**\n\n![](@media/gatto.png)",
        tags=["animals", "lesson one"],
        reviews=[
            review(0, 0, True),
            review(0, 1, False, 1),
            review(1, 3, True, 2.01),
            review(3, 9, True, 6.2),
        ],
    ),
    card(
        "CiaoCard1",
        "Lesson001",
        "*ciao*\n---\nhello & goodbye",
        reviews=[review(0, 0, True), review(0, 2, True, 2)],
        **{
            "review-reverse?": True,
            "reverse-reviews": [review(1, 1, True), review(1, 4, True, 3)],
        },
    ),
    card("CasaCard1", "Lesson001", "la casa", **{"archived?": True}),
    card("CaneCard1", "Lesson001", "il cane\n---\nthe dog\n\n![](@media/cane.mp3)"),
    card("GoneCard1", "Lesson001", "cancellato\n---\ndeleted", **{"trashed?": {"~#dt": CREATED + DAY}}),
    card("ToggleCd1", "Lesson001", "presto\n---\nsoon", reviews=[review(2, 4, True)], **{"reverse-reviews": [review(2, 3, False)]}),
]
verbs = [
    card("EssereCd1", "Verbs0001", "# essere\n---\nto be\n---\nsono, sei, è", reviews=[review(4, 6, False)]),
]
japanese = [
    card(
        "NekoCard1",
        "Japanese1",
        "",
        reviews=[review(0, 0, True), review(0, 2, True, 2)],
        fields=fields(WordFld01="猫 ![](@media/neko.png)", ReadFld01="ねこ", **{"name": "cat"}, MuteFld01=False),
        **{"template-id": kw("VocabTpl1"), "component-cache": cache},
    ),
    card(
        "InuCard01",
        "Japanese1",
        "",
        tags=["animals", "N5"],
        fields=fields(WordFld01="犬", ReadFld01="いぬ", **{"name": "dog ![](@media/inu.png)"}),
        **{"template-id": kw("VocabTpl1")},
    ),
    # Mochi's furigana in the word, with no reading field filled.
    card(
        "OmoideCd1",
        "Japanese1",
        "",
        fields=fields(WordFld01="思(おも)い出(で)", **{"name": "memory"}),
        **{"template-id": kw("VocabTpl1")},
    ),
    card(
        "MizuCard1",
        "Japanese1",
        "",
        fields=fields(JapanFld1="水", **{"name": "water"}),
        **{"template-id": kw("ReverseTp")},
    ),
]
trashed = [card("OldCard01", "OldDeck01", "vecchio\n---\nold")]

decks = [
    {"id": kw("Italian01"), "name": "Italian", "sort": 0, "cards": tagged("list", [])},
    {"id": kw("Lesson001"), "name": "Lesson 1", "parent-id": kw("Italian01"), "sort": 1, "cards": tagged("list", lesson)},
    {"id": kw("Verbs0001"), "name": "Verbs", "parent-id": kw("Lesson001"), "sort": 2, "cards": tagged("list", verbs)},
    {"id": kw("Japanese1"), "name": "Japanese", "sort": 3, "template-id": kw("VocabTpl1"), "cards": tagged("list", japanese)},
    {"id": kw("OldDeck01"), "name": "Old", "sort": 4, "trashed?": {"~#dt": CREATED}, "cards": tagged("list", trashed)},
]

# A card in the top-level list, with no id, as the format reference allows.
loose = [
    {
        "deck-id": kw("Lesson001"),
        "content": "grazie\n---\nthank you",
        "tags": tagged("set", []),
        "reviews": [],
    }
]

data = {
    "~:version": 2,
    "~:templates": tagged("list", keys(templates)),
    "~:decks": keys(decks),
    "~:cards": keys(loose),
}


def write(name):
    path = os.path.join(HERE, name)
    entries = [
        ("data.json", json.dumps(data, ensure_ascii=False).encode()),
        ("gatto.png", png(32, 24, (200, 120, 40))),
        # One attachment in a folder, since exports have been described with both layouts.
        ("attachments/neko.png", png(24, 24, (40, 120, 200))),
        ("cane.mp3", b"ID3" + bytes(64)),
    ]
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
        for entry, content in entries:
            zf.writestr(zipfile.ZipInfo(entry, date_time=(2026, 1, 1, 4, 0, 0)), content, zipfile.ZIP_DEFLATED)
    print(path)


write("export.mochi")
