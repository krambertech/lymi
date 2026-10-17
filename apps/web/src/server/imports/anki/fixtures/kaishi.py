"""Builds a small Kaishi 1.5k-shaped Anki package: term and sentence audio, pitch accent and a translation.

Run from this directory: uv run --python 3.12 --with anki==26.9 python kaishi.py (needs ffmpeg)
"""

import os
import subprocess
import tempfile

from anki.collection import Collection, ExportAnkiPackageOptions

HERE = os.path.dirname(os.path.abspath(__file__))
CREATED = 1767240000

FIELDS = [
    "Word",
    "Word Reading",
    "Word Meaning",
    "Word Furigana",
    "Word Audio",
    "Sentence",
    "Sentence Meaning",
    "Sentence Furigana",
    "Sentence Audio",
    "Notes",
    "Pitch Accent",
    "Pitch Accent Notes",
    "Frequency",
    "Picture",
]


def mora(kana, line):
    """One mora as Yomitan writes pitch accent for Anki: the kana, then an empty span drawing its line."""
    drawn = ""
    if line != "low":
        drop = "border-right-width:0.1em;border-right-style:solid;" if line == "drop" else ""
        drawn = (
            '<span style="border-color:currentColor;display:block;position:absolute;top:0.1em;left:0;'
            f'right:0;height:0;border-top-width:0.1em;border-top-style:solid;{drop}"></span>'
        )
    return (
        '<span style="display:inline-block;position:relative;">'
        f'<span style="display:inline;">{kana}</span>{drawn}</span>'
    )


def pitch(*morae):
    return '<ol><li><span style="display:inline;">' + "".join(mora(k, l) for k, l in morae) + "</span></li></ol>"


def clip(media, name, frequency, codec):
    subprocess.run(
        [
            "ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi",
            "-i", f"sine=frequency={frequency}:duration=0.4",
            "-ac", "1", "-ar", "24000", "-c:a", codec, os.path.join(media, name),
        ],
        check=True,
    )


def main():
    with tempfile.TemporaryDirectory() as tmp:
        col = Collection(os.path.join(tmp, "collection.anki2"))
        col.db.execute("update col set crt = ?", CREATED)
        media = col.media.dir()
        clip(media, "kaishi_hashi.mp3", 440, "libmp3lame")
        clip(media, "kaishi_sakura.mp3", 660, "libmp3lame")
        clip(media, "kaishi_hashi_sentence.mp3", 330, "libmp3lame")
        clip(media, "kaishi_sakura_sentence.mp3", 300, "libmp3lame")
        # Ogg Opus plays in browsers but not on the phone, so the import leaves it out.
        clip(media, "kaishi_neko.ogg", 550, "libopus")

        model = col.models.new("Kaishi 1.5k")
        for name in FIELDS:
            col.models.add_field(model, col.models.new_field(name))
        template = col.models.new_template("Recognition")
        template["qfmt"] = "{{Word}}"
        template["afmt"] = "{{FrontSide}}<hr id=answer>{{Word Furigana}}<br>{{Word Meaning}}{{Word Audio}}"
        col.models.add_template(model, template)
        col.models.add(model)
        deck = col.decks.id("Kaishi 1.5k")

        def add(fields):
            note = col.new_note(col.models.by_name("Kaishi 1.5k"))
            for key, value in fields.items():
                note[key] = value
            col.add_note(note, deck)

        add(
            {
                "Word": "箸",
                "Word Reading": "はし",
                "Word Meaning": "chopsticks",
                "Word Furigana": "箸[はし]",
                "Word Audio": "[sound:kaishi_hashi.mp3]",
                "Sentence": "箸で食べます。",
                "Sentence Meaning": "I eat<br>with chopsticks.",
                "Sentence Furigana": "箸[はし]で 食[た]べます。",
                "Sentence Audio": "[sound:kaishi_hashi_sentence.mp3]",
                "Notes": "Counted with 膳",
                "Pitch Accent": pitch(("は", "drop"), ("し", "low")),
                "Frequency": "1234",
            }
        )
        add(
            {
                "Word": "桜",
                "Word Reading": "さくら",
                "Word Meaning": "cherry blossom",
                "Word Furigana": "桜[さくら]",
                "Word Audio": "[sound:kaishi_sakura.mp3]",
                "Sentence": "桜が咲きました。",
                "Sentence Meaning": "The cherry blossoms bloomed.",
                "Sentence Audio": "[sound:kaishi_sakura_sentence.mp3]",
                "Pitch Accent": pitch(("さ", "low"), ("く", "high"), ("ら", "high")),
                "Frequency": "2345",
            }
        )
        add(
            {
                "Word": "猫",
                "Word Reading": "ねこ",
                "Word Meaning": "cat",
                "Word Audio": "[sound:kaishi_neko.ogg]",
                # A graph alone cannot be read as text.
                "Pitch Accent": '<svg viewBox="0 0 50 20"><path d="M5 5 L25 15"/></svg>',
                "Frequency": "345",
            }
        )

        col.export_anki_package(
            out_path=os.path.join(HERE, "kaishi.apkg"),
            options=ExportAnkiPackageOptions(
                with_scheduling=False, with_deck_configs=False, with_media=True, legacy=False
            ),
            limit=None,
        )
        col.close()


main()
