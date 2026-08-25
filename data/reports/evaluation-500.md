# TallyKai — Reconciliation Benchmark & Evaluation Report

**Evaluated At:** 2026-08-25T08:59:21.900Z  
**Dataset Size:** 500 Orders / 512 Settlements  
**Deterministic Seed:** 42  

---

## 1. Executive Summary

| Metric | Value | Target | Status |
| :--- | :--- | :--- | :--- |
| **Overall Accuracy** | **91.21%** | $\ge 90.0\%$ | PASS |
| **Overall Precision** | **100%** | $\ge 95.0\%$ | PASS |
| **Overall Recall** | **89.36%** | $\ge 88.0\%$ | PASS |
| **F1 Score** | **94.38%** | $\ge 90.0\%$ | PASS |
| **Resolution Rate** | **73.83%** | Baseline | PASS |
| **Data Quality Score** | **100%** | $100.0\%$ | PASS |

---

## 2. Multi-Layer Resolution Funnel

```
Total Records Ingested (500)
       │
       ▼
Pass 1: Deterministic Engine ──▶ 369 resolved (100% precision)
       │
       ▼
Pass 2: Fuzzy Matching       ──▶ 9 resolved (100% precision)
       │
       ▼
Pass 3: AI Investigator      ──▶ 0 resolved (100% precision)
       │
       ▼
Human Review / Flagged       ──▶ 134 cases remaining
```

| Stage | Input Records | Resolved | Remaining | Conversion Rate |
| :--- | :--- | :--- | :--- | :--- |
| Pass 1: Deterministic Engine | 512 | 369 | 143 | 72.1% |
| Pass 2: Fuzzy Similarity Matching | 143 | 9 | 134 | 6.3% |
| Pass 3: AI Exception Investigator | 134 | 0 | 134 | 0% |
| Human Review / Escalations | 134 | 0 | 134 | 0% |

---

## 3. Layer-by-Layer Performance Breakdown

| Layer | Matches Declared | Precision | False Positives | Cumulative Resolved | % of Total |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DETERMINISTIC** | 369 | 100% | 0 | 369 | 72.1% |
| **FUZZY** | 9 | 100% | 0 | 378 | 1.8% |
| **AI** | 0 | 100% | 0 | 378 | 0% |
| **HUMAN_REVIEW** | 134 | 100% | 0 | 378 | 26.2% |

---

## 4. Financial Reconciliation Aggregation

- **Total Ingested Order Value:** ₹27.41 Lakhs (₹27,40,793)
- **Successfully Reconciled:** ₹20.85 Lakhs (₹20,85,322)
- **Unresolved / Exception Value:** ₹6.55 Lakhs (₹6,55,471)
- **Incorrectly Reconciled Value:** ₹0
- **Financial Reconciliation Rate:** **76.08%**

---

## 5. Exception Categorization & Root Causes

Total Unresolved Cases: **134**

| Exception Category | Cases | Share | Primary Root Cause | Sample Orders |
| :--- | :--- | :--- | :--- | :--- |
| `AMBIGUOUS_MATCH` | 63 | 47% | Multiple candidate settlements scored within the ambiguity tolerance threshold | ORD-000030, ORD-000052, ORD-000061, ORD-000074, ORD-000102 |
| `AMOUNT_MISMATCH` | 35 | 26.1% | Discrepancy between gross order price and net payout after fee tolerance | ORD-000017, ORD-000033, ORD-000051, ORD-000060, ORD-000067 |
| `DUPLICATE_SETTLEMENT` | 14 | 10.4% | Order matched against multiple distinct settlement batch transactions | ORD-000099, ORD-000115, ORD-000134, ORD-000136, ORD-000138 |
| `UNKNOWN` | 12 | 9% | Uncategorized discrepancy requiring manual finance audit | ORPHAN, ORPHAN, ORPHAN, ORPHAN, ORPHAN |
| `FUZZY_LOW_CONFIDENCE` | 6 | 4.5% | Highest fuzzy candidate score fell below the 0.85 acceptance threshold | ORD-000016, ORD-000053, ORD-000064, ORD-000156, ORD-000161 |
| `MISSING_SETTLEMENT` | 4 | 3% | Order marked paid internally but absent from gateway settlement feed | ORD-000018, ORD-000062, ORD-000176, ORD-000193 |

---

## 6. False Positive Analysis (0 Cases)

✓ **Zero False Positives Detected:** TallyKai strictly avoided declaring spurious matches on unmatchable exceptions.

---

## 7. Confidence Calibration Analysis

| Score Range | Total Cases | Correct | Incorrect | Accuracy |
| :--- | :--- | :--- | :--- | :--- |
| `0.90–1.00` | 431 | 415 | 16 | 96.3% |
| `0.80–0.89` | 0 | 0 | 0 | 100% |
| `0.70–0.79` | 0 | 0 | 0 | 100% |
| `<0.70` | 81 | 52 | 29 | 64.2% |

---

## 8. AI Agent Operational Metrics

- **Total AI Investigations:** 73
- **AI Direct Resolutions:** 0 (0%)
- **AI Human Review Escalations:** 73 (100%)
- **AI Precision:** 100%
- **AI False Positives:** 0
- **AI Invocations per 1,000 Records:** 142.6

---

## 9. Performance & Throughput

- **Total Execution Time:** 229.67 ms
- **Throughput:** 2,229.3 records/sec
- **Average Time Per Record:** 0.449 ms/rec


---
*Report generated automatically by TallyKai Evaluation Subsystem.*
