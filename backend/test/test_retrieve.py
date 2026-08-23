import unittest

from app.rag.ingest import Clause, DEFAULT_MANUAL, parse_policy_manual
from app.rag.retrieve import retrieve, TOP_K


class RetrieveTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.clauses = parse_policy_manual(DEFAULT_MANUAL)

    def test_direct_question_returns_relevant_clauses(self):
        results = retrieve("Who is eligible for the program?", self.clauses)
        self.assertGreater(len(results), 0)
        ids = [r.id for r in results]
        self.assertIn("§2.1.1", ids)

    def test_paraphrased_question_finds_relevant(self):
        results = retrieve("What are the basic conditions to qualify?", self.clauses)
        self.assertGreater(len(results), 0)
        ids = [r.id for r in results]
        self.assertIn("§2.1.2", ids)

    def test_multi_clause_question(self):
        results = retrieve("How is income counted and what is disregarded?", self.clauses)
        self.assertGreater(len(results), 0)
        ids = [r.id for r in results]
        self.assertTrue(any(i.startswith("§6.2") for i in ids) or any(i.startswith("§6.4") for i in ids))

    def test_unrelated_question_returns_few_or_empty(self):
        results = retrieve("How do I bake a chocolate cake?", self.clauses)
        self.assertLessEqual(len(results), 2)

    def test_empty_question_returns_empty(self):
        self.assertEqual(retrieve("", self.clauses), [])
        self.assertEqual(retrieve("   ", self.clauses), [])

    def test_top_k_limit(self):
        results = retrieve("eligibility income resources", self.clauses, top_k=3)
        self.assertLessEqual(len(results), 3)

    def test_results_ordered_by_score(self):
        results = retrieve("What are the income thresholds?", self.clauses)
        scores = [r.score for r in results]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_clause_ids_and_text_unchanged(self):
        results = retrieve("What is a household?", self.clauses)
        for r in results:
            original = next(c for c in self.clauses if c.id == r.id)
            self.assertEqual(r.text, original.text)
            self.assertEqual(r.id, original.id)
            self.assertEqual(r.part, original.part)
            self.assertEqual(r.section, original.section)


if __name__ == "__main__":
    unittest.main()
