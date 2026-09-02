/**
 * TallyKai — Neon PostgreSQL Database Seed & Synchronization Script
 * Seeds normalized canonical transactions, reconciliation results, and AI investigations.
 */

import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/db/prisma";
import { upsertOrders, upsertSettlements, saveReconciliationRun, logAuditEvent } from "../src/lib/db/repository";
import { CanonicalTransaction } from "../src/lib/normalization/types";
import { ReconciliationDatasetResult } from "../src/lib/reconciliation/types";

async function main() {
  console.log("==================================================");
  console.log("TallyKai — Seeding Data into Neon PostgreSQL");
  console.log("==================================================");

  const dataDir = path.join(process.cwd(), "data", "generated");
  const canonicalPath = path.join(dataDir, "canonical-transactions.json");
  const reconPath = path.join(dataDir, "reconciliation-results.json");
  const summaryPath = path.join(dataDir, "reconciliation-summary.json");

  if (!fs.existsSync(canonicalPath)) {
    console.error("❌ Canonical transactions file not found. Run 'npm run normalize:data' first.");
    process.exit(1);
  }

  const canonical: CanonicalTransaction[] = JSON.parse(fs.readFileSync(canonicalPath, "utf-8"));
  const orders = canonical.filter((c) => c.source === "ORDER_LEDGER");
  const settlements = canonical.filter((c) => c.source === "SETTLEMENT");

  console.log(`\n📦 Found ${orders.length} orders and ${settlements.length} settlements in generated dataset.`);

  // 1. Seed Orders in batches of 100
  console.log("⏳ Upserting orders into PostgreSQL...");
  const BATCH_SIZE = 100;
  for (let i = 0; i < orders.length; i += BATCH_SIZE) {
    const batch = orders.slice(i, i + BATCH_SIZE);
    await upsertOrders(batch);
    process.stdout.write(`\r   Orders: ${Math.min(i + BATCH_SIZE, orders.length)} / ${orders.length}`);
  }
  console.log("\n✓ Orders synchronized successfully.");

  // 2. Seed Settlements in batches of 100
  console.log("⏳ Upserting settlements into PostgreSQL...");
  for (let i = 0; i < settlements.length; i += BATCH_SIZE) {
    const batch = settlements.slice(i, i + BATCH_SIZE);
    await upsertSettlements(batch);
    process.stdout.write(`\r   Settlements: ${Math.min(i + BATCH_SIZE, settlements.length)} / ${settlements.length}`);
  }
  console.log("\n✓ Settlements synchronized successfully.");

  // 3. Seed Reconciliation Results if available
  if (fs.existsSync(reconPath) && fs.existsSync(summaryPath)) {
    console.log("⏳ Syncing reconciliation results & AI investigations...");
    const reconResults = JSON.parse(fs.readFileSync(reconPath, "utf-8"));
    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf-8"));

    const datasetResult: ReconciliationDatasetResult = {
      orderResults: reconResults.orderResults || reconResults,
      orphanResults: reconResults.orphanResults || [],
      summary,
    };

    const runInfo = await saveReconciliationRun(datasetResult, "RUN-INITIAL-SEED");
    console.log(`✓ Reconciliation run saved: ${runInfo.savedOrders} results, ${runInfo.savedAIInvestigations} AI investigations.`);
  }

  // 4. Log Seed Audit Event
  await logAuditEvent({
    action: "DATABASE_SEEDED",
    entityType: "DATASET",
    details: `Initial database seed: ${orders.length} orders, ${settlements.length} settlements synchronized to Neon PostgreSQL.`,
    metadata: {
      ordersCount: orders.length,
      settlementsCount: settlements.length,
      timestamp: new Date().toISOString(),
    },
  });

  console.log("\n==================================================");
  console.log("✅ Neon PostgreSQL synchronization completed successfully!");
  console.log("==================================================\n");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed with error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
