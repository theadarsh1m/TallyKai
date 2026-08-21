# Tallykai

> **AI Finance Controller for Multi-Source Financial Reconciliation**

Tallykai is an intelligent, automated financial reconciliation platform designed to normalize internal order ledgers against external bank settlement statements, apply deterministic and fuzzy matching rules, and deploy an autonomous AI agent to investigate ambiguous transaction discrepancies.

---

## 📌 Project Overview

In high-volume e-commerce and fintech operations, reconciling internal order ledgers against payment gateway settlements and bank payouts is critical yet labor-intensive. Discrepancies arise due to Gateway MDR fee deductions, timing cut-off mismatches, refund adjustments, and missing settlement references (UTRs).

**Tallykai** automates this entire reconciliation pipeline:
1. **Normalizes** multi-source heterogeneous financial feeds.
2. **Executes deterministic matching** for exact payment pairs.
3. **Applies fuzzy rule-based scoring** for timing and fee variations.
4. **Deploys an autonomous AI Exception Agent** to investigate ambiguous cases and draft root-cause audit logs.
5. **Calculates precision metrics** (Match Rate, Reconciled Amount, Discrepancy Total).
6. **Maintains an immutable audit trail**.

---

## 🚀 Phase 1 Status: Synthetic Data Engine Active

> [!NOTE]
> **Phase 1 Completed**: The **Synthetic Data & Ingestion Engine** is fully implemented and tested!
> 
> You can generate reproducible financial datasets with configurable order counts, PRNG seed controls, realistic noise injection, and ground-truth evaluation mappings.

---

## 📊 Phase 1 — Synthetic Data Engine

### Why Synthetic Data?
Real transaction ledgers contain sensitive PII and proprietary commercial details. Tallykai includes a standalone, deterministic synthetic dataset generator to simulate complex real-world financial reconciliation anomalies with zero security or privacy risk.

### Data Sources Generated
- **Source A — Internal Order Ledger**: E-commerce payment orders containing `order_id`, `customer_id`, realistic INR amounts (e.g. ₹499, ₹1299, ₹2499, ₹4999), payment methods (`UPI`, `Card`, `Net Banking`, `Wallet`), ISO timestamps, and reference keys (`WEB-7F92K`).
- **Source B — Settlement Records**: Payment gateway payout entries containing `settlement_id`, `settlement_reference`, `order_id`, `settlement_amount`, `fee` (MDR), `tax` (GST), `settlement_timestamp`, and status (`SETTLED`).
- **Ground Truth Evaluation Records**: A hidden, unexposed mapping recording the true status (`MATCHABLE` vs `EXCEPTION`), expected settlement IDs, expected net amounts, and scenario root causes. 
  > [!WARNING]
  > **Ground Truth Privacy Rule**: The ground-truth dataset is stored exclusively for objective engine evaluation (calculating precision, recall, and exception accuracy). It is **NEVER** exposed to the reconciliation UI in later phases.

### Reconciliation Scenarios Included
The dataset generator injects 11 distinct real-world financial noise patterns (~75% explainable/clean matches and ~25% exception edge cases):

1. **`EXACT_MATCH`**: 1:1 direct correspondence with exact amount match.
2. **`FEE_ADJUSTED`**: Settlement net of Payment Gateway MDR processing fee (1.5%–2.5%).
3. **`TAX_ADJUSTED`**: Settlement net of MDR fee plus 18% GST tax deduction.
4. **`DATE_DRIFT`**: Settlement delayed by T+1, T+2, or T+3 business days.
5. **`ROUNDING_DIFFERENCE`**: Small legitimate variance (±1–2 INR) due to rounding.
6. **`AMOUNT_MISMATCH`**: Discrepancy where settled amount genuinely differs from expected net payout.
7. **`MISSING_SETTLEMENT`**: Order is marked paid internally but missing from settlement records.
8. **`ORPHAN_SETTLEMENT`**: Settlement payout exists without any matching internal order ledger entry.
9. **`DUPLICATE_SETTLEMENT`**: Order erroneously paid out multiple times across settlement batches.
10. **`PARTIAL_SETTLEMENT`**: Order settled across multiple partial payout transactions.
11. **`MERGED_SETTLEMENT`**: Multiple orders batched under a single settlement reference.

### How to Generate Data
Generate default dataset (500 orders, seed 42):
```bash
npm run generate:data
```

Generate custom count and deterministic seed:
```bash
npx tsx scripts/generate-data.ts --count=1000 --seed=100
```

Run generator verification test suite:
```bash
npm run test:data
```

### Example Dataset Statistics (500 Orders, Seed 42)
```text
Orders:      500
Settlements: 503
GroundTruth: 522

Scenario distribution:
EXACT_MATCH              180
FEE_ADJUSTED             104
TAX_ADJUSTED              45
DATE_DRIFT                32
AMOUNT_MISMATCH           31
MISSING_SETTLEMENT        27
ORPHAN_SETTLEMENT         22
DUPLICATE_SETTLEMENT      12
PARTIAL_SETTLEMENT        17
MERGED_SETTLEMENT         36
ROUNDING_DIFFERENCE       16
```

Generated datasets are stored in `data/generated/`:
- `data/generated/orders.json`
- `data/generated/settlements.json`
- `data/generated/ground-truth.json`
- `data/generated/summary.json`

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (v16+, App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Data Generator**: Custom Seeded PRNG Engine (Mulberry32)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (v4 with CSS variables)
- **Icons**: [Lucide React](https://lucide.react.dev/)

---

## 📅 Development Phases Roadmap

| Phase | Milestone | Description | Status |
| :--- | :--- | :--- | :--- |
| **Phase 0** | **Project Foundation & UI Shell** | Clean Next.js setup, responsive financial dashboard UI, KPI cards, dummy tables, audit timeline placeholder. | 🟢 **Completed** |
| **Phase 1** | **Synthetic Data Generator** | Generate synthetic e-commerce order ledger & gateway settlement datasets with 11 noise scenarios & ground truth. | 🟢 **Completed** |
| **Phase 2** | **Data Normalization Engine** | Parse and standardize schema across heterogeneous gateway and bank settlement files. | ⏳ Planned |
| **Phase 3** | **Deterministic Rule Matching** | Implement exact-match rules (Order ID, Amount, UTR, Timestamp window). | ⏳ Planned |
| **Phase 4** | **Fuzzy & Fee Matching** | Implement heuristic matching for MDR fee deductions and settlement window offsets. | ⏳ Planned |
| **Phase 5** | **AI Exception Investigator** | Integrate LLM AI agent to analyze unexplained discrepancy cases and produce human-readable root-cause summaries. | ⏳ Planned |
| **Phase 6** | **Audit Trail & Metrics** | Real-time calculation of precision, recall, match rate %, and full audit logging. | ⏳ Planned |

---

## 🏃 Getting Started

### Prerequisites
- Node.js `v18.x` or higher
- npm `v10.x` or higher

### Installation & Local Run

1. Clone or navigate to project directory:
   ```bash
   cd tari
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Generate synthetic data:
   ```bash
   npm run generate:data
   ```

4. Launch development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚠️ Disclaimer

This project is a student buildathon submission created for the **Razorpay AI Buildathon 2026** inspired by the AI Finance Controller track challenge. It is not an official Razorpay product and does not use proprietary Razorpay brand assets or internal APIs.
