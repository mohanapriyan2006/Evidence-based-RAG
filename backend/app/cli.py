from dotenv import load_dotenv

load_dotenv()

from app.rag.ingest import parse_all_clauses
from app.rag.answer import generate_answer
from app.rag.retrieve import retrieve
from app.rag.verify import verify



def _print_sources(sources):
    if not sources:
        print("Sources: (none)")
        return
    print("Sources:")
    for source in sources:
        print(f"- {source.id}")


def _run(clauses, question):
    if not question.strip():
        print("Please enter a question.")
        return
    try:
        retrieved = retrieve(question, clauses)
        verified = verify(question, retrieved)
        result = generate_answer(question, verified, clauses)
        print(f"Status: {result['status']}")
        print(f"\nAnswer:\n{result['answer']}\n")
        _print_sources(result["sources"])
    except Exception as exc:
        print(f"Sorry, the pipeline could not process that question: {exc}")


def main():
    clauses = parse_all_clauses()
    print("Grounded policy QA CLI (Temporal & Amendment Grounded)")
    print("Type 'exit' or press Ctrl-C to quit.\n")
    while True:
        try:
            question = input("Question: ")
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye.")
            break
        if question.strip().lower() in {"exit", "quit"}:
            print("Goodbye.")
            break
        _run(clauses, question)
        print()


if __name__ == "__main__":
    main()
