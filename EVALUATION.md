# Evaluation Results

Total: 10 | Passed: 10 | Failed: 0

## 1. direct
- Question: Who is eligible for the Household Support Program?
- Expected: answered ['§2.1.1']
- Actual: answered ['§2.1.1']
- Reason: sufficient_evidence
- Verdict: PASS

## 2. direct
- Question: How is countable income defined?
- Expected: answered ['§1.4.7']
- Actual: answered ['§1.4.7', '§6.1.1']
- Reason: sufficient_evidence
- Verdict: PASS

## 3. multi-clause
- Question: How is income counted and what is disregarded?
- Expected: answered ['§6.2.1', '§6.4.1']
- Actual: answered ['§6.2.1', '§6.4.1']
- Reason: sufficient_evidence
- Verdict: PASS

## 4. multi-clause
- Question: What are the time limits for making and determining an application?
- Expected: answered ['§8.3.1', '§8.3.2']
- Actual: answered ['§8.3.1', '§8.3.3']
- Reason: sufficient_evidence
- Verdict: PASS

## 5. paraphrased
- Question: What basic conditions must a person meet to qualify for assistance?
- Expected: answered ['§2.1.1']
- Actual: answered ['§2.1.1']
- Reason: sufficient_evidence
- Verdict: PASS

## 6. unanswerable
- Question: What is the department's phone number?
- Expected: refused []
- Actual: refused []
- Reason: insufficient_evidence
- Verdict: PASS

## 7. evidence-gap
- Question: Can a full-time student receive the award?
- Expected: refused []
- Actual: refused []
- Reason: insufficient_evidence
- Verdict: PASS

## 8. contradiction
- Question: overpayment time years
- Expected: conflict ['§9.5.1', '§9.5.2']
- Actual: conflict ['§9.5.1', '§9.5.2']
- Reason: contradictory_evidence
- Verdict: PASS

## 9. edge-case
- Question: Can an overpayment be recovered after six years?
- Expected: conflict ['§9.5.1', '§9.5.2']
- Actual: conflict ['§9.5.1', '§9.5.2']
- Reason: contradictory_evidence
- Verdict: PASS

## 10. ambiguous
- Question: Tell me about the program.
- Expected: refused []
- Actual: refused []
- Reason: insufficient_evidence
- Verdict: PASS
