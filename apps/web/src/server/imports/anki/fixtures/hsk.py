"""Builds a small Anki package shaped like the HSK decks Chinese learners bring, with invented content.

In the HSK deck: a type with both scripts, marked pinyin in Chinese Support Redux's tone-colour
spans beside a numbered pinyin field and a sentence; one with tone numbers and a sentence; and
Chinese Support Redux's own type with its coloured hanzi and ruby. A TOCFL deck learns traditional
characters, and an Italian deck's "Trad." is a translation, not a script.

Run from this directory: uv run --python 3.12 --with anki==26.9 python hsk.py (needs ffmpeg)
"""

import os
import subprocess
import tempfile

from anki.collection import Collection, ExportAnkiPackageOptions

HERE = os.path.dirname(os.path.abspath(__file__))
CREATED = 1767240000

TYPES = {
    "HSK Vocabulary": [
        "Simplified",
        "Traditional",
        "Pinyin",
        "Pinyin.1",
        "Meaning",
        "Part of Speech",
        "Audio",
        "SentenceSimplified",
        "SentenceTraditional",
        "SentencePinyin",
        "SentenceMeaning",
        "SentenceAudio",
    ],
    "HSK 3.0": [
        "Hanzi",
        "Pinyin",
        "Meaning",
        "SentenceHanzi",
        "SentencePinyin",
        "SentenceMeaning",
        "AudioHanzi",
        "AudioSentence",
    ],
    "Chinese (Advanced)": ["Hanzi", "English", "Pinyin", "Color", "Ruby", "Sound"],
    "TOCFL": ["Traditional", "Pinyin", "Meaning", "SentenceTraditional", "SentenceSimplified"],
    "Lessico": ["Parola", "Trad."],
}


def toned(*syllables, gap=""):
    """Pinyin as Chinese Support Redux colours it: one span a syllable, its class the tone."""
    return gap.join(f'<span class="tone{tone}">{text}</span>' for text, tone in syllables)


def clip(media, name, frequency):
    subprocess.run(
        [
            "ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi",
            "-i", f"sine=frequency={frequency}:duration=0.4",
            "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", os.path.join(media, name),
        ],
        check=True,
    )


def main():
    with tempfile.TemporaryDirectory() as tmp:
        col = Collection(os.path.join(tmp, "collection.anki2"))
        col.db.execute("update col set crt = ?", CREATED)
        media = col.media.dir()
        for i, name in enumerate(
            ["hsk_yinhang.mp3", "hsk_yinhang_s.mp3", "hsk_yidianr.mp3", "hsk_xuexi.mp3",
             "hsk_dongxi.mp3", "hsk_dongxi_s.mp3", "hsk_nihao.mp3", "hsk_hen.mp3"]
        ):
            clip(media, name, 300 + 60 * i)

        for name, fields in TYPES.items():
            model = col.models.new(name)
            for field in fields:
                col.models.add_field(model, col.models.new_field(field))
            template = col.models.new_template("Recognition")
            template["qfmt"] = "{{" + fields[0] + "}}"
            template["afmt"] = "{{FrontSide}}<hr id=answer>{{" + fields[1] + "}}"
            col.models.add_template(model, template)
            col.models.add(model)
        hsk = col.decks.id("HSK::HSK 1")

        def add(type_name, fields, deck=hsk):
            note = col.new_note(col.models.by_name(type_name))
            for key, value in fields.items():
                note[key] = value
            col.add_note(note, deck)

        add(
            "HSK Vocabulary",
            {
                "Simplified": "银行",
                "Traditional": "銀行",
                "Pinyin": toned(("yín", 2), ("háng", 2)),
                "Pinyin.1": "yin2hang2",
                "Meaning": "bank",
                "Part of Speech": "noun",
                "Audio": "[sound:hsk_yinhang.mp3]",
                "SentenceSimplified": "我去银行。",
                "SentenceTraditional": "我去銀行。",
                "SentencePinyin": toned(("Wǒ", 3), ("qù", 4), gap=" ") + " " + toned(("yín", 2), ("háng", 2)) + ".",
                "SentenceMeaning": "I am going to the bank.",
                "SentenceAudio": "[sound:hsk_yinhang_s.mp3]",
            },
        )
        add(
            "HSK Vocabulary",
            {
                "Simplified": "一点儿",
                "Traditional": "一點兒",
                "Pinyin": "<div>" + toned(("yì", 4), ("diǎnr", 3)) + "</div>",
                "Pinyin.1": "yi4 dian3r",
                "Meaning": "a little",
                "Audio": "[sound:hsk_yidianr.mp3]",
                "SentenceSimplified": "我会说一点儿中文。",
                "SentenceTraditional": "我會說一點兒中文。",
                "SentencePinyin": "Wǒ huì shuō yìdiǎnr Zhōngwén.",
                "SentenceMeaning": "I speak a little Chinese.",
            },
        )
        add(
            "HSK Vocabulary",
            {
                "Simplified": "学习",
                "Traditional": "學習",
                "Pinyin": toned(("xué", 2), ("xí", 2)),
                "Pinyin.1": "xue2xi2",
                "Meaning": "to study",
                "Audio": "[sound:hsk_xuexi.mp3]",
                # The digit has no syllable of its own, so the pinyin stays a notes line.
                "SentenceSimplified": "他每天学习3个小时。",
                "SentenceTraditional": "他每天學習3個小時。",
                "SentencePinyin": "Tā měitiān xuéxí sān gè xiǎoshí.",
                "SentenceMeaning": "He studies for three hours a day.",
            },
        )
        add(
            "HSK Vocabulary",
            {
                # Written alike in both scripts, so neither traditional field adds a line.
                "Simplified": "很",
                "Traditional": "很",
                "Pinyin": toned(("hěn", 3)),
                "Pinyin.1": "hen3",
                "Meaning": "very",
                "Audio": "[sound:hsk_hen.mp3]",
                "SentenceSimplified": "我很好。",
                "SentenceTraditional": "我很好。",
                "SentencePinyin": "Wo3 hen3 hao3.",
                "SentenceMeaning": "I am very well.",
            },
        )
        add(
            "HSK Vocabulary",
            {
                # Two readings, one a line: neither is a two-syllable word over one character.
                "Simplified": "行",
                "Traditional": "行",
                "Pinyin": toned(("xíng", 2)) + "<br>" + toned(("háng", 2)),
                "Pinyin.1": "xing2<br>hang2",
                "Meaning": "to go; a row",
            },
        )
        add(
            "HSK 3.0",
            {
                "Hanzi": "东西",
                "Pinyin": "dong1 xi5",
                "Meaning": "thing; stuff",
                "SentenceHanzi": "这个东西很好。",
                "SentencePinyin": "Zhège dōngxi hěn hǎo.",
                "SentenceMeaning": "This thing is good.",
                "AudioHanzi": "[sound:hsk_dongxi.mp3]",
                "AudioSentence": "[sound:hsk_dongxi_s.mp3]",
            },
        )
        add(
            "Chinese (Advanced)",
            {
                "Hanzi": "你好",
                "English": "hello",
                "Pinyin": toned(("nǐ", 3), ("hǎo", 3), gap=" "),
                "Color": toned(("你", 3), ("好", 3)),
                "Ruby": "<ruby>你<rt>nǐ</rt></ruby><ruby>好<rt>hǎo</rt></ruby>",
                "Sound": "[sound:hsk_nihao.mp3]",
            },
        )
        add(
            "TOCFL",
            {
                "Traditional": "學習",
                "Pinyin": "xuéxí",
                "Meaning": "to study",
                "SentenceTraditional": "我學習中文。",
                "SentenceSimplified": "我学习中文。",
            },
            deck=col.decks.id("TOCFL"),
        )
        add("Lessico", {"Parola": "il cane", "Trad.": "the dog"}, deck=col.decks.id("Italiano"))

        col.export_anki_package(
            out_path=os.path.join(HERE, "hsk.apkg"),
            options=ExportAnkiPackageOptions(
                with_scheduling=False, with_deck_configs=False, with_media=True, legacy=False
            ),
            limit=None,
        )
        col.close()


main()
