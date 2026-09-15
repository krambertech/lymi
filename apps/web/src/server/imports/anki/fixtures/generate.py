"""Builds the Anki fixture collection with Anki's own library and exports it in every container.

Run from this directory: uv run --python 3.12 --with anki==26.9 python generate.py
"""

import json
import os
import struct
import tempfile
import zlib

from anki.collection import Collection, ExportAnkiPackageOptions

HERE = os.path.dirname(os.path.abspath(__file__))
# 2026-01-01 04:00 UTC, the collection's first day.
CREATED = 1767240000
DAY = 86400


def png(width, height, rgb):
    raw = b"".join(b"\x00" + bytes(rgb) * width for _ in range(height))

    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")


def build(path):
    col = Collection(path)
    col.db.execute("update col set crt = ?", CREATED)
    media = col.media.dir()
    with open(os.path.join(media, "gatto.png"), "wb") as f:
        f.write(png(32, 24, (200, 120, 40)))
    with open(os.path.join(media, "cane.png"), "wb") as f:
        f.write(png(24, 24, (40, 120, 200)))
    with open(os.path.join(media, "gatto.mp3"), "wb") as f:
        f.write(b"ID3" + bytes(64))

    def deck(name, description=""):
        did = col.decks.id(name)
        if description:
            d = col.decks.get(did)
            d["desc"] = description
            col.decks.save(d)
        return did

    lesson = deck("Italian::Lesson 1", "Words from the <b>first</b> lesson")
    japanese = deck("Japanese")
    cloze_deck = deck("Italian::Grammar")
    deck("Empty deck")

    def add(model, deck_id, fields, tags=()):
        note = col.new_note(col.models.by_name(model))
        for key, value in fields.items():
            note[key] = value
        note.tags = list(tags)
        col.add_note(note, deck_id)
        return note

    gatto = add(
        "Basic",
        lesson,
        {"Front": "il gatto", "Back": 'the cat<br><img src="gatto.png"> [sound:gatto.mp3]'},
        ["animals", "lesson::one", "marked"],
    )
    cane = add(
        "Basic",
        lesson,
        {"Front": "<b>il cane</b>", "Back": '<div>the dog</div><img src="cane.png"><img src="gatto.png">'},
        ["animals", "leech"],
    )
    suspended = add("Basic", lesson, {"Front": "la casa", "Back": "the house"})
    long_meaning = add(
        "Basic",
        lesson,
        {"Front": "sbrigarsi", "Back": "to hurry up; " + "to get a move on, " * 70},
    )
    reversed_note = add(
        "Basic (and reversed card)", lesson, {"Front": "grazie", "Back": "thank you"}, ["phrases"]
    )
    state_only = add("Basic", lesson, {"Front": "ciao", "Back": "hello &amp; goodbye"})
    add(
        "Cloze",
        cloze_deck,
        {"Text": "Io {{c1::sono}} stanco e tu {{c2::sei::essere}} felice.", "Back Extra": "essere, present tense"},
    )

    reading = col.models.new("Japanese (reading)")
    for name in ["Expression", "Reading", "Meaning"]:
        col.models.add_field(reading, col.models.new_field(name))
    template = col.models.new_template("Recognition")
    template["qfmt"] = "{{Expression}}"
    template["afmt"] = "{{FrontSide}}<hr id=answer>{{Reading}}<br>{{Meaning}}"
    col.models.add_template(reading, template)
    col.models.add(reading)
    add("Japanese (reading)", japanese, {"Expression": "猫", "Reading": "ねこ", "Meaning": "cat"}, ["animals"])
    add("Basic", japanese, {"Front": "漢字[かんじ]", "Back": "Chinese characters"})

    col.sched.suspend_cards([suspended.cards()[0].id])

    seq = [0]

    def history(card, entries, s, d, due_day, ivl):
        """Give a card a review log, FSRS memory and a review due date, as Anki stores them."""
        for at, ease, kind, last_ivl, new_ivl in entries:
            # Revlog ids are millisecond timestamps and must be unique across cards.
            seq[0] += 1
            col.db.execute(
                "insert into revlog (id, cid, usn, ease, ivl, lastIvl, factor, time, type) values (?,?,?,?,?,?,?,?,?)",
                at * 1000 + seq[0],
                card.id,
                -1,
                ease,
                new_ivl,
                last_ivl,
                2500,
                6000,
                kind,
            )
        col.db.execute(
            "update cards set type = 2, queue = 2, due = ?, ivl = ?, reps = ?, lapses = ?, data = ? where id = ?",
            due_day,
            ivl,
            len(entries),
            sum(1 for e in entries if e[1] == 1 and e[2] == 1),
            json.dumps({"s": s, "d": d, "dr": 0.9, "lrt": entries[-1][0] if entries else CREATED + (due_day - ivl) * DAY}),
            card.id,
        )

    t = CREATED + 10 * DAY + 3600 * 15
    history(
        gatto.cards()[0],
        [
            (t, 3, 0, 0, -600),
            (t + 700, 3, 0, -600, 1),
            (t + DAY, 3, 1, 1, 3),
            (t + 4 * DAY, 1, 1, 3, -600),
            (t + 4 * DAY + 800, 3, 2, -600, 2),
            (t + 6 * DAY, 4, 1, 2, 9),
        ],
        s=9.4,
        d=5.2,
        due_day=25,
        ivl=9,
    )
    front, back = reversed_note.cards()
    history(front, [(t, 3, 0, 0, 1), (t + DAY, 3, 1, 1, 4)], s=4.1, d=4.9, due_day=15, ivl=4)
    history(back, [(t + 2 * DAY, 2, 0, 0, 1), (t + 3 * DAY, 3, 1, 1, 3)], s=3.0, d=6.1, due_day=16, ivl=3)
    # Manual rescheduling rows are not grades and never replay.
    history(cane.cards()[0], [(t, 3, 0, 0, 2), (t + DAY, 0, 4, 2, 5)], s=2.2, d=5.0, due_day=16, ivl=5)
    history(state_only.cards()[0], [], s=30.0, d=3.5, due_day=60, ivl=30)
    return col


def export(col, name, **options):
    out = os.path.join(HERE, name)
    col.export_anki_package(
        out_path=out,
        options=ExportAnkiPackageOptions(with_scheduling=True, with_deck_configs=False, with_media=True, **options),
        limit=None,
    )


def main():
    with tempfile.TemporaryDirectory() as tmp:
        col = build(os.path.join(tmp, "collection.anki2"))
        export(col, "current.apkg", legacy=False)
        export(col, "legacy.apkg", legacy=True)
        col.export_collection_package(os.path.join(HERE, "current.colpkg"), include_media=True, legacy=False)
        col.close()
        col = Collection(os.path.join(tmp, "collection.anki2"))
        col.export_collection_package(os.path.join(HERE, "legacy.colpkg"), include_media=True, legacy=True)
        col.close()


main()
