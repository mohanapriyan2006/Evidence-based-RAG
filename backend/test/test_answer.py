import unittest

from app.rag.ingest import DEFAULT_MANUAL, parse_policy_manual
from app.rag.answer import CONFLICT_ANSWER, REFUSAL_INSUFFICIENT, REFUSAL_NONE, generate_answer
from app.rag.citations import build_citations
from app.rag.retrieve import ScoredClause, retrieve
from app.rag.verify import VerificationResult, verify


class AnswerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.clauses = parse_policy_manual(DEFAULT_MANUAL)

    def test_answered_question(self):
        q = "Who is eligible for the program?"
        verified = verify(q, retrieve(q, self.clauses))
        result = generate_answer(q, verified, self.clauses)
        self.assertEqual(result["status"], "answered")
        self.assertTrue(result["answer"])
        self.assertEqual(result["reason"], "sufficient_evidence")
        self.assertTrue(len(result["sources"]) > 0)
        self.assertEqual(result["sources"][0].id, verified.evidence[0].id)

    def test_refused_question(self):
        q = "How do I bake a chocolate cake?"
        verified = verify(q, retrieve(q, self.clauses))
        result = generate_answer(q, verified, self.clauses)
        self.assertEqual(result["status"], "refused")
        self.assertEqual(result["answer"], REFUSAL_NONE)
        self.assertEqual(result["reason"], "insufficient_evidence")

    def test_relevant_but_insufficient_refusal(self):
        clause = ScoredClause(
            id="§1.1.1",
            part="Part 1",
            section="1.1 Scope",
            text="The program supports eligible households.",
            score=0.5,
        )
        verified = VerificationResult(
            status="refused",
            reason="insufficient_evidence",
            evidence=[clause],
        )
        result = generate_answer("What documents are required?", verified, self.clauses)
        self.assertEqual(result["status"], "refused")
        self.assertEqual(result["answer"], REFUSAL_INSUFFICIENT)
        self.assertEqual(result["reason"], "insufficient_evidence")

    def test_conflict_returns_conflict_answer(self):
        q = "Can applicants have other public assistance?"
        verified = verify(q, retrieve(q, self.clauses))
        result = generate_answer(q, verified, self.clauses)
        if verified.status == "conflict":
            self.assertEqual(result["status"], "conflict")
            self.assertEqual(result["reason"], "contradictory_evidence")
            self.assertIn("Human review is required", result["answer"])

    def test_known_contradiction_answer(self):
        q = "overpayment time years"
        verified = verify(q, retrieve(q, self.clauses))
        result = generate_answer(q, verified, self.clauses)
        self.assertEqual(result["status"], "conflict")
        self.assertIn("§9.5.1", result["answer"])
        self.assertIn("§9.5.2", result["answer"])
        ids = {s.id for s in result["sources"]}
        self.assertIn("§9.5.1", ids)
        self.assertIn("§9.5.2", ids)

    def test_conflict_does_not_answer(self):
        q = "overpayment time years"
        verified = verify(q, retrieve(q, self.clauses))
        result = generate_answer(q, verified, self.clauses)
        self.assertNotEqual(result["status"], "answered")
        self.assertNotIn("Based on", result["answer"])

    def test_citations_preserved(self):
        q = "Who is eligible for the program?"
        verified = verify(q, retrieve(q, self.clauses))
        result = generate_answer(q, verified, self.clauses)
        if verified.status == "answered":
            self.assertEqual(
                result["sources"][0].text,
                verified.evidence[0].text,
            )
            self.assertEqual(
                result["sources"][0].section,
                verified.evidence[0].section,
            )

    def test_empty_evidence_refusal(self):
        verified = verify("", [])
        result = generate_answer("", verified, self.clauses)
        self.assertEqual(result["status"], "refused")
        self.assertEqual(result["answer"], REFUSAL_NONE)

    def test_no_relevant_evidence_refusal(self):
        q = "What is the capital of France?"
        verified = verify(q, retrieve(q, self.clauses))
        result = generate_answer(q, verified, self.clauses)
        self.assertEqual(result["status"], "refused")
        if not verified.evidence:
            self.assertEqual(result["answer"], REFUSAL_NONE)

    def test_refusal_does_not_answer(self):
        q = "How do I bake a chocolate cake?"
        verified = verify(q, retrieve(q, self.clauses))
        result = generate_answer(q, verified, self.clauses)
        self.assertNotEqual(result["status"], "answered")
        self.assertNotIn("Based on", result["answer"])


if __name__ == "__main__":
    unittest.main()
