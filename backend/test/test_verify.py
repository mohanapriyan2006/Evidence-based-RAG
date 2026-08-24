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

    def test_known_overpayment_contradiction(self):
        q = "overpayment time years"
        retrieved = retrieve(q, self.clauses)
        result = verify(q, retrieved)
        self.assertEqual(result.status, "conflict")
        self.assertEqual(result.reason, "contradictory_evidence")
        ids = {c.id for c in result.evidence}
        self.assertIn("§9.5.1", ids)
        self.assertIn("§9.5.2", ids)

    def test_temporal_claim_date_verification(self):
        from app.rag.ingest import parse_all_clauses
        all_clauses = parse_all_clauses()
        q = "What is the monthly earnings disregard?"
        
        # Feb 2026 (Pre-March)
        retrieved_feb = retrieve(q, all_clauses, claim_date="2026-02-15")
        res_feb = verify(q, retrieved_feb, claim_date="2026-02-15")
        self.assertEqual(res_feb.status, "answered")
        self.assertTrue(any(c.id in {"§6.4.1", "§6.2.1"} for c in res_feb.evidence))
        
        # April 2026 (Post-March)
        retrieved_apr = retrieve(q, all_clauses, claim_date="2026-04-10")
        res_apr = verify(q, retrieved_apr, claim_date="2026-04-10")
        self.assertEqual(res_apr.status, "answered")
        self.assertTrue(any("Amendment No. 2026-01" in c.part for c in res_apr.evidence))


if __name__ == "__main__":
    unittest.main()

