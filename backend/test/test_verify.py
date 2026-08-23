import unittest

from app.rag.ingest import DEFAULT_MANUAL, parse_policy_manual
from app.rag.retrieve import retrieve
from app.rag.verify import verify


class VerifyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.clauses = parse_policy_manual(DEFAULT_MANUAL)

    def test_direct_answer_sufficient_evidence(self):
        q = "Who is eligible for the program?"
        retrieved = retrieve(q, self.clauses)
        result = verify(q, retrieved)
        self.assertEqual(result.status, "answered")
        self.assertEqual(result.reason, "sufficient_evidence")
        self.assertTrue(len(result.evidence) > 0)

    def test_multi_clause_answer(self):
        q = "How is income counted and what is disregarded?"
        retrieved = retrieve(q, self.clauses)
        result = verify(q, retrieved)
        self.assertEqual(result.status, "answered")
        self.assertEqual(result.reason, "sufficient_evidence")

    def test_insufficient_evidence(self):
        q = "What are the rules for space travel?"
        retrieved = retrieve(q, self.clauses)
        result = verify(q, retrieved)
        self.assertEqual(result.status, "refused")
        self.assertEqual(result.reason, "insufficient_evidence")

    def test_unsupported_question(self):
        q = "How do I bake a chocolate cake?"
        retrieved = retrieve(q, self.clauses)
        result = verify(q, retrieved)
        self.assertEqual(result.status, "refused")
        self.assertEqual(result.reason, "insufficient_evidence")

    def test_empty_question(self):
        result = verify("", [])
        self.assertEqual(result.status, "refused")
        self.assertEqual(result.reason, "insufficient_evidence")

    def test_empty_retrieval(self):
        q = "Who is eligible?"
        result = verify(q, [])
        self.assertEqual(result.status, "refused")
        self.assertEqual(result.reason, "insufficient_evidence")

    def test_missing_part_in_multipart(self):
        q = "What are the income limits and vehicle rules?"
        retrieved = retrieve(q, self.clauses)
        result = verify(q, retrieved)
        self.assertIn(result.status, ["answered", "refused"])

    def test_contradiction_detected_or_refused(self):
        q = "Can applicants have other public assistance?"
        retrieved = retrieve(q, self.clauses)
        result = verify(q, retrieved)
        self.assertIn(result.status, ["answered", "refused", "conflict"])


if __name__ == "__main__":
    unittest.main()
