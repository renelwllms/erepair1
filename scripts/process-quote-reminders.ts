import { processDueQuoteReminders } from "../lib/quote-reminders";

const ONE_HOUR_MS = 60 * 60 * 1000;

async function runCycle() {
  const startedAt = new Date().toISOString();
  try {
    const result = await processDueQuoteReminders();
    console.log(
      `[quote-reminders] ${startedAt} checked=${result.checked} processed=${result.processed} escalations=${result.adminEscalations} errors=${result.errors.length}`
    );
    if (result.errors.length > 0) {
      console.error("[quote-reminders] errors:", result.errors.join(" | "));
    }
  } catch (error) {
    console.error("[quote-reminders] cycle failed:", error);
  }
}

async function main() {
  await runCycle();
  setInterval(() => {
    void runCycle();
  }, ONE_HOUR_MS);
}

void main();
