"""Write fonts/onest-cyrillic-wght-normal.woff2: Onest's Cyrillic file with a stress anchor on every Russian and Ukrainian vowel.

Onest anchors U+0301 over е, и, э, ю, я and ї but not а, о, у, ы, і, є, А, О or Є, so a browser draws за́мок's
acute beside the а. Each Cyrillic letter that shares its Latin twin's outline takes that twin's anchor, and
the rest take their own centre at the height of the Latin letter they look most like. iOS places the mark without an anchor, so the phone keeps Onest as
published. Run from the repository root after `pip install fonttools brotli`, whenever
@fontsource-variable/onest changes:

    python3 packages/design/scripts/onest-stress.py
"""

import glob
import os
import sys

from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import otTables

MARK = "acutecomb"
# Cyrillic letters drawn as their Latin twins, so the twin's anchor fits exactly.
TWINS = {"uni0430": "a", "uni043E": "o", "uni0410": "A", "uni041E": "O"}
# Cyrillic letters with a shape of their own: centred over their outline, at the height of the Latin letter named.
CENTRED = {
    "uni0443": "y",
    "uni044B": "y",
    "uni0456": "i",
    "uni0454": "e",
    "uni0404": "E",
}


def acute_lookup(font):
    """The mark-to-base subtable that places the acute."""
    for lookup in font["GPOS"].table.LookupList.Lookup:
        for sub in lookup.SubTable:
            table = sub.ExtSubTable if lookup.LookupType == 9 else sub
            if hasattr(table, "BaseCoverage") and MARK in table.MarkCoverage.glyphs:
                return table
    sys.exit(f"No mark-to-base lookup places {MARK}")


def anchors(table):
    """Each base glyph's anchor for the acute's class, as (x, y) at the default instance."""
    klass = table.MarkArray.MarkRecord[table.MarkCoverage.glyphs.index(MARK)].Class
    out = {}
    for glyph, record in zip(table.BaseCoverage.glyphs, table.BaseArray.BaseRecord):
        anchor = record.BaseAnchor[klass]
        if anchor is not None:
            out[glyph] = (anchor.XCoordinate, anchor.YCoordinate)
    return klass, out


def centre(font, glyph):
    outline = font["glyf"][glyph]
    outline.recalcBounds(font["glyf"])
    return round((outline.xMin + outline.xMax) / 2)


def main():
    root = glob.glob("node_modules/.pnpm/@fontsource-variable+onest@*/node_modules/@fontsource-variable/onest/files")
    if len(root) != 1:
        sys.exit("Run from the repository root after pnpm install, with one version of @fontsource-variable/onest")
    latin = TTFont(os.path.join(root[0], "onest-latin-wght-normal.woff2"))
    _, twins = anchors(acute_lookup(latin))
    cyrillic = TTFont(os.path.join(root[0], "onest-cyrillic-wght-normal.woff2"))
    table = acute_lookup(cyrillic)
    klass, existing = anchors(table)

    added = {}
    for glyph, twin in TWINS.items():
        added[glyph] = twins[twin]
    for glyph, height in CENTRED.items():
        added[glyph] = (centre(cyrillic, glyph), twins[height][1])
    for glyph in added:
        if glyph in existing:
            sys.exit(f"{glyph} already has an anchor; this script is no longer needed for it")

    records = dict(zip(table.BaseCoverage.glyphs, table.BaseArray.BaseRecord))
    for glyph, (x, y) in added.items():
        anchor = otTables.Anchor()
        anchor.Format = 1
        anchor.XCoordinate, anchor.YCoordinate = x, y
        record = otTables.BaseRecord()
        record.BaseAnchor = [anchor if i == klass else None for i in range(table.ClassCount)]
        records[glyph] = record
    glyphs = sorted(records, key=cyrillic.getGlyphID)
    table.BaseCoverage.glyphs = glyphs
    table.BaseArray.BaseRecord = [records[glyph] for glyph in glyphs]
    table.BaseArray.BaseCount = len(glyphs)

    out = os.path.join(os.path.dirname(__file__), "..", "fonts", "onest-cyrillic-wght-normal.woff2")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    cyrillic.flavor = "woff2"
    cyrillic.save(out)
    print(f"Wrote {os.path.relpath(out)} with anchors on {', '.join(sorted(added))}")


main()
