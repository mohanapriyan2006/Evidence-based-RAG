from __future__ import annotations

import re
from pathlib import Path

from pydantic import BaseModel


class Clause(BaseModel):
    id: str
    part: str
    section: str
    text: str
    effective_date: str | None = None
    amendment: str | None = None
    applies_to_clause: str | None = None


_PART_RE = re.compile(r"^# Part (\d+) — (.+)$")
_SECTION_RE = re.compile(r"^## (\d+\.\d+) (.+)$")
_CLAUSE_RE = re.compile(r"^\*\*(\d+(?:\.\d+)+)(?:\s+([^*]+))?\*\*\s*(.*)$")


def _find_default_manual() -> Path:
    current = Path(__file__).resolve()
    for parent in current.parents:
        candidate = parent / "data" / "policy-manual.md"
        if candidate.exists():
            return candidate
        candidate2 = parent / "grounded-answer" / "data" / "policy-manual.md"
        if candidate2.exists():
            return candidate2
    return current.parents[3] / "data" / "policy-manual.md"


def _find_default_amendment() -> Path:
    current = Path(__file__).resolve()
    for parent in current.parents:
        candidate = parent / "data" / "Amendment No. 2026-01.md"
        if candidate.exists():
            return candidate
        candidate2 = parent / "grounded-answer" / "data" / "Amendment No. 2026-01.md"
        if candidate2.exists():
            return candidate2
        candidate3 = parent / "PackageByCompany" / "Amendment No. 2026-01.md"
        if candidate3.exists():
            return candidate3
    return current.parents[3] / "PackageByCompany" / "Amendment No. 2026-01.md"


DEFAULT_MANUAL = _find_default_manual()
DEFAULT_AMENDMENT = _find_default_amendment()


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
                effective_date="2025-12-31",
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


def parse_amendment(path: Path = DEFAULT_AMENDMENT) -> list[Clause]:
    if not path.exists():
        return []

    clauses: list[Clause] = []
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()

    current_section = ""
    clause_id = ""
    clause_lines: list[str] = []
    applies_to = ""

    def flush():
        nonlocal clause_id, clause_lines, applies_to
        if not clause_id:
            return
        c_text = "\n".join(clause_lines).strip()
        clauses.append(
            Clause(
                id=f"§{clause_id} (Amendment No. 2026-01)",
                part="Amendment No. 2026-01",
                section=current_section,
                text=c_text,
                effective_date="2026-03-01",
                amendment="Amendment No. 2026-01",
                applies_to_clause=applies_to or None,
            )
        )
        clause_id = ""
        clause_lines = []
        applies_to = ""

    for line in lines:
        line_str = line.strip()
        if line_str.startswith("## "):
            flush()
            current_section = line_str[3:].strip()
            continue

        if line_str.startswith("**") and ("**" in line_str[2:]):
            flush()
            # e.g. **1.1** In §6.4.1(a)... or **10.5.3A** A sanction...
            match = re.match(r"^\*\*([0-9A-Za-z.]+)\*\*\s*(.*)$", line_str)
            if match:
                clause_id = match.group(1)
                rest = match.group(2)
                clause_lines = [rest]
                # Check for target clause reference like §6.4.1 or §4.3.2
                target_match = re.search(r"§([0-9]+\.[0-9]+(?:\.[0-9]+)?(?:\([a-z]\))?)", rest)
                if target_match:
                    applies_to = f"§{target_match.group(1)}"
                continue

        if clause_id:
            if line_str == "---" or line_str.startswith("*End of"):
                flush()
            else:
                clause_lines.append(line_str)

    flush()
    return clauses


def parse_all_clauses(
    manual_path: Path = DEFAULT_MANUAL,
    amendment_path: Path = DEFAULT_AMENDMENT,
) -> list[Clause]:
    manual_clauses = parse_policy_manual(manual_path)
    amendment_clauses = parse_amendment(amendment_path)
    return manual_clauses + amendment_clauses

