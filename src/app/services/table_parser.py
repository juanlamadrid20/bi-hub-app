# services/table_parser.py
import re
from typing import Optional
import pandas as pd

# conservative pipe-table detection
_TABLE_RE = re.compile(
    r"^\s*\|.+?\|\s*$\n^\s*\|(?:\s*[:-]+-+\s*\|)+\s*$\n(?:^\s*\|.+?\|\s*$\n?)+",
    re.MULTILINE
)

def extract_first_table(md: str) -> tuple[Optional[pd.DataFrame], str]:
    """Return (df, text_without_table) if a clean pipe-table is found; else (None, original_text)."""
    m = _TABLE_RE.search(md or "")
    if not m:
        return None, md

    lines = [l.strip() for l in m.group(0).strip().splitlines()]
    header = [c.strip() for c in lines[0].strip("|").split("|")]
    rows = []
    for l in lines[2:]:
        if "|" not in l: 
            continue
        rows.append([c.strip() for c in l.strip("|").split("|")])
    try:
        df = pd.DataFrame(rows, columns=header)
        # remove the table block from text
        remaining = (md[:m.start()] + md[m.end():]).strip()
        return df, remaining
    except Exception:
        return None, md
