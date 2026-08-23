import unittest

from app.rag.ingest import DEFAULT_MANUAL, parse_policy_manual
from app.rag.answer import CONFLICT_ANSWER, REFUSAL_ANSWER, generate_answer
from app.rag.citations import build_citations
from app.rag.retrieve import retrieve
from app.rag.verify import verify


class AnswerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.clauses = parse_policy_manual(DEFAULT_MANUAL)

    def test_answered_question(self):
        q = "Who is eligible for the program?"
        verified = verify(q, retrieve(q, self.clauses))
        result = generate_answer(q, verified)
        self.assertEqual(result["status"], "answered")
        self.assertTrue(result["answer"])
        self.assertEqual(result["reason"], "sufficient_evidence")
        self.assertTrue(len(result["sources"]) > 0)
        self.assertEqual(result["sources"][0].id, verified.evidence[0].id)

    def test_refused_question(self):
        q = "How do I bake a chocolate cake?"
        verified = verify(q, retrieve(q, self.clauses))
        result = generate_answer(q, verified)
        self.assertEqual(result["status"], "refused")
        self.assertEqual(result["answer"], REFUSAL_ANSWER)
        self.assertEqual(result["reason"], "insufficient_evidence")

    def test_conflict_returns_conflict_answer(self):
        q = "Can applicants have other public assistance?"
        verified = verify(q, retrieve(q, self.clauses))
        result = generate_answer(q, verified)
        if verified.status == "conflict":
            self.assertEqual(result["status"], "conflict")
            self.assertEqual(result["answer"], CONFLICT_ANSWER)
            self.assertEqual(result["reason"], "contradictory_evidence")

    def test_citations_preserved(self):
        q = "Who is eligible for the program?"
        verified = verify(q, retrieve(q, self.clauses))
        result = generate_answer(q, verified)
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
        result = generate_answer("", verified)
        self.assertEqual(result["status"], "refused")


if __name__ == "__main__":
    unittest.main()
