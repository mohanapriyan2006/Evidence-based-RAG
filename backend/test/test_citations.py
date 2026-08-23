import unittest

from app.rag.citations import Citation, build_citations
from app.rag.ingest import Clause
from app.rag.retrieve import ScoredClause
from app.rag.verify import VerificationResult


class CitationTests(unittest.TestCase):
    def test_build_citations(self):
        clauses = [
            ScoredClause(id="§1.1.1", part="Part 1", section="1.1 Scope", text="Households...", score=0.9),
            ScoredClause(id="§2.1.1", part="Part 2", section="2.1 Eligibility", text="Eligible...", score=0.8),
        ]
        citations = build_citations(clauses)
        self.assertEqual(len(citations), 2)
        self.assertEqual(citations[0].id, "§1.1.1")
        self.assertEqual(citations[0].part, "Part 1")
        self.assertEqual(citations[0].section, "1.1 Scope")
        self.assertEqual(citations[0].text, "Households...")

    def test_citation_model(self):
        c = Citation(id="§3.1.1", part="Part 3", section="3.1 Income", text="Income...")
        self.assertEqual(c.id, "§3.1.1")


if __name__ == "__main__":
    unittest.main()
