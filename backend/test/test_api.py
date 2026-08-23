import unittest
from fastapi.testclient import TestClient
from app.main import app


class APITests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_get_source_found(self):
        response = self.client.get("/sources/§1.1.1")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], "§1.1.1")
        self.assertIn("Purpose", data["section"])

    def test_get_source_found_without_symbol(self):
        response = self.client.get("/sources/1.1.1")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], "§1.1.1")

    def test_get_source_not_found(self):
        response = self.client.get("/sources/§99.99.99")
        self.assertEqual(response.status_code, 404)

    def test_ask_empty_question(self):
        response = self.client.post("/ask", json={"question": "   "})
        self.assertEqual(response.status_code, 400)

    def test_ask_valid_question(self):
        response = self.client.post("/ask", json={"question": "Who is eligible for the Household Support Program?"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn(data["status"], ["answered", "refused", "conflict"])
        self.assertIn("sources", data)


if __name__ == "__main__":
    unittest.main()
