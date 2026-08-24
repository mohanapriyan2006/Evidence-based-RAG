import tempfile
import unittest
from pathlib import Path

from app.rag.ingest import Clause, DEFAULT_MANUAL, parse_policy_manual


class IngestTests(unittest.TestCase):
    def test_loads_default_manual(self):
        clauses = parse_policy_manual(DEFAULT_MANUAL)
        self.assertGreater(len(clauses), 100)
        self.assertEqual(clauses[0].id, "§1.1.1")
        self.assertEqual(clauses[0].part, "Part 1 — Scope and Definitions")
        self.assertEqual(clauses[0].section, "1.1 Purpose of the Program")

    def test_clause_ids_preserved_and_ordered(self):
        clauses = parse_policy_manual(DEFAULT_MANUAL)
        self.assertTrue(all(c.id.startswith("§") for c in clauses))
        numbers = [tuple(int(n) for n in c.id[1:].split(".")) for c in clauses]
        self.assertEqual(numbers, sorted(numbers))

    def test_clause_text_preserved(self):
        clauses = parse_policy_manual(DEFAULT_MANUAL)
        self.assertTrue(all(c.text for c in clauses))
        c111 = next(c for c in clauses if c.id == "§1.1.1")
        self.assertIn("monthly financial assistance", c111.text)
        c212 = next(c for c in clauses if c.id == "§2.1.2")
        self.assertIn("(a)", c212.text)
        self.assertIn("(f)", c212.text)

    def test_part_and_section_context(self):
        clauses = parse_policy_manual(DEFAULT_MANUAL)
        self.assertTrue(all(c.part and c.section for c in clauses))
        c141 = next(c for c in clauses if c.id == "§1.4.1")
        self.assertIn("Definitions", c141.part)
        self.assertEqual(c141.section, "1.4 Definitions")

    def test_definitions_keep_term_and_meaning(self):
        clauses = parse_policy_manual(DEFAULT_MANUAL)
        c141 = next(c for c in clauses if c.id == "§1.4.1")
        self.assertTrue(c141.text.startswith("Applicant"))
        self.assertIn("submitted", c141.text)

    def test_missing_file_returns_empty(self):
        self.assertEqual(parse_policy_manual(Path("nonexistent-file.md")), [])

    def test_empty_file_returns_empty(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "empty.md"
            p.write_text("", encoding="utf-8")
            self.assertEqual(parse_policy_manual(p), [])

    def test_parse_amendment(self):
        from app.rag.ingest import parse_amendment, parse_all_clauses
        amend_clauses = parse_amendment()
        self.assertGreater(len(amend_clauses), 0)
        all_clauses = parse_all_clauses()
        self.assertGreater(len(all_clauses), len(parse_policy_manual(DEFAULT_MANUAL)))


if __name__ == "__main__":
    unittest.main()

