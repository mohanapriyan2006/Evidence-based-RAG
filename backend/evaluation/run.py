import json
from pathlib import Path

from app.rag.ingest import parse_all_clauses
from app.rag.answer import generate_answer
from app.rag.retrieve import retrieve
from app.rag.verify import verify

QUESTIONS_PATH = Path(__file__).with_name("questions.json")
RESULTS_PATH = Path(__file__).with_name("results.md")
ROOT_EVAL_PATH = Path(__file__).parents[2] / "EVALUATION.md"


def _matches(item, result):
    if result["status"] != item["expected"]:
        return False
    if not item["expected_sources"]:
        return True
    actual_ids = {s.id for s in result.get("sources", [])}
    expected_ids = set(item["expected_sources"])
    if result["status"] == "conflict":
        return expected_ids <= actual_ids
    return bool(expected_ids & actual_ids)


def _run_item(clauses, item):
    claim_date = item.get("claim_date")
    retrieved = retrieve(item["question"], clauses, claim_date=claim_date)
    verified = verify(item["question"], retrieved, claim_date=claim_date)
    answer = generate_answer(item["question"], verified, clauses, claim_date=claim_date)
    actual_sources = [s.id for s in answer.get("sources", [])]
    result = {
        "status": answer["status"],
        "reason": answer["reason"],
        "answer": answer["answer"],
        "sources": actual_sources,
    }
    ok = _matches(item, answer)
    return result, "PASS" if ok else "FAIL"


def main():
    clauses = parse_all_clauses()
    with open(QUESTIONS_PATH, encoding="utf-8") as f:
        questions = json.load(f)

    lines = ["# Evaluation Results", ""]
    passed = 0
    failed = 0
    for item in questions:
        result, status = _run_item(clauses, item)
        if status == "PASS":
            passed += 1
        else:
            failed += 1
        lines.append(f"## {item['id']}. {item['type']}")
        lines.append(f"- Question: {item['question']}")
        if item.get("claim_date"):
            lines.append(f"- Claim Date: {item['claim_date']}")
        lines.append(f"- Expected: {item['expected']} {item['expected_sources']}")
        lines.append(f"- Actual: {result['status']} {result['sources']}")
        lines.append(f"- Reason: {result['reason']}")
        lines.append(f"- Verdict: {status}")
        lines.append("")

    summary = f"Total: {len(questions)} | Passed: {passed} | Failed: {failed}"
    lines.insert(2, summary)
    lines.insert(3, "")
    output_content = "\n".join(lines)
    RESULTS_PATH.write_text(output_content, encoding="utf-8")
    if ROOT_EVAL_PATH.parent.exists():
        ROOT_EVAL_PATH.write_text(output_content, encoding="utf-8")
    print(summary)



if __name__ == "__main__":
    main()
