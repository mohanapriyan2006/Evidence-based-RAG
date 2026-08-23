# DECISIONS

## Why FastAPI

I selected FastAPI because it is simple to build REST APIs with Python and
works well for this RAG-based application. It also keeps the backend easy
to test and modify.

## Why Clause-Level Retrieval

The policy manual is the main source of truth. So instead of passing the
full document to the model, I decided to retrieve relevant policy clauses.
This also makes citations more clear and reliable.

## Why Verification Is Separate

Retrieving a similar clause does not always mean that the question can be
answered. So I kept verification as a separate step before generating
the answer.

```text
Question → Retrieve → Verify → Answer / Refuse / Conflict
```

## Why Refusal

If the policy does not contain enough evidence, the system should not guess.
It should clearly refuse and provide the supported referral information.

## Why Contradiction Handling

If two relevant policy clauses conflict, the system should not randomly
select one. It should show the conflicting clauses and ask for human review.

## Why Simple Frontend

The frontend is kept small because the main value of this solution is the
grounded backend behaviour. I added the UI only after the core RAG flow
was working.

## What I Avoided

I did not use unnecessary multi-agent systems, complex frameworks,
training pipelines, or extra databases. The goal was to keep the project
simple, understandable and reliable.

## Current Limitation

The system is designed specifically for the supplied policy manual. It is
not intended to answer questions from external documents or general
knowledge.

