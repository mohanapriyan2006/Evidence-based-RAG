from __future__ import annotations

import re
from pathlib import Path

from pydantic import BaseModel


class Clause(BaseModel):
    id: str
    part: str
    section: str
    text: str


_PART_RE = re.compile(r"^# Part (\d+) — (.+)$")
_SECTION_RE = re.compile(r"^## (\d+\.\d+) (.+)$")
_CLAUSE_RE = re.compile(r"^\*\*(\d+(?:\.\d+)+)(?:\s+([^*]+))?\*\*\s*(.*)$")

DEFAULT_MANUAL = (
    Path(__file__).resolve().parents[4]
    / "PackageByCompany"
    / "1"
    / "Data pack"
    / "policy-manual.md"
)


def _clean(lines: list[str]) -> str:
    return "\n".join(lines).replace("**", "").strip()


def parse_policy_manual(path: Path) -> list[Clause]:
    if not path.exists():
        return []

    clauses: list[Clause] = []
    part = ""
    section = ""
    clause_id = ""
    lines: list[str] = []

    def flush() -> None:
        nonlocal clause_id
        if not clause_id:
            return
        clauses.append(
            Clause(
                id=f"§{clause_id}",
                part=part,
                section=section,
                text=_clean(lines),
            )
        )
        clause_id = ""

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.rstrip()

        if line == "---":
            flush()
            continue

        part_match = _PART_RE.match(line)
        if part_match:
            flush()
            part = f"Part {part_match.group(1)} — {part_match.group(2)}"
            section = ""
            continue

        section_match = _SECTION_RE.match(line)
        if section_match:
            flush()
            section = f"{section_match.group(1)} {section_match.group(2)}"
            continue

        clause_match = _CLAUSE_RE.match(line)
        if clause_match:
            flush()
            clause_id = clause_match.group(1)
            title = clause_match.group(2)
            rest = clause_match.group(3)
            if title:
                lines = [f"{title.strip()} {rest.strip()}"]
            else:
                lines = [rest.strip()]
            continue

        if clause_id:
            lines.append(line)

    flush()

    return clauses


if __name__ == "__main__":
    clauses = parse_policy_manual(DEFAULT_MANUAL)
    print(f"Total clauses: {len(clauses)}")
    print()
    for clause in clauses:
        preview = clause.text[:200]
        if len(clause.text) > 200:
            preview = f"{preview}..."
        print(f"{clause.id}\n{preview}\n")
