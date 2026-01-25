import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions - eRepair",
  description: "eRepair terms and conditions for repair services, inspections, sales, and related services.",
};

export default function TermsAndConditionsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900">eRepair – Terms &amp; Conditions</h1>
      <p className="mt-2 text-sm text-gray-600">Last updated: January 23, 2026</p>

      <p className="mt-6 text-gray-700">
        These Terms &amp; Conditions apply to all repair services, inspections, sales, and related services
        provided by eRepair.
      </p>

      <div className="mt-8 space-y-6 text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">1. Inspection &amp; Assessment Fee</h2>
          <p className="mt-2">
            An inspection fee may apply if the customer chooses not to proceed with a repair after diagnosis.
            This fee is non-refundable and covers technician time spent inspecting, disassembling, diagnosing,
            and assessing the device.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">2. Customer Data &amp; Privacy</h2>
          <p className="mt-2">
            Customers are responsible for backing up all data prior to repair. eRepair is not liable for any
            loss of data that may occur during the repair process.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">3. Warranty on Repairs</h2>
          <p className="mt-2">
            eRepair provides a 3-month return-to-base warranty on repairs and parts supplied by us, excluding:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Liquid damage</li>
            <li>Physical damage</li>
            <li>Accidental damage</li>
            <li>Glass or screen replacement jobs</li>
          </ul>
          <p className="mt-2">
            Warranty claims may require inspection of the device and can take up to 7 business days to assess.
          </p>
          <p className="mt-2">
            The warranty is void if:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>The device has been opened by a third party</li>
            <li>Further physical or liquid damage occurs during the warranty period</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">4. Liquid Damage Repairs</h2>
          <p className="mt-2">
            eRepair may attempt repairs on devices affected by liquid damage; however:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>No warranty is provided on liquid damage repairs</li>
            <li>Further faults may develop due to corrosion or internal damage beyond initial repair</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">5. Courier &amp; Transport</h2>
          <p className="mt-2">
            Where courier services are used:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Courier liability for loss or damage is subject to the courier company’s own terms, conditions, and claim limits</li>
            <li>eRepair is not responsible for damage caused during transit but may assist customers with lodging claims where applicable</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">6. Parts &amp; Repair Timeframes</h2>
          <p className="mt-2">
            Repair and delivery timeframes may vary depending on:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Parts availability</li>
            <li>Supplier lead times</li>
            <li>Nature of the fault</li>
          </ul>
          <p className="mt-2">
            Estimated timeframes are provided in good faith but are not guaranteed.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">7. Uncollected Devices</h2>
          <p className="mt-2">
            Devices must be collected within 4 weeks of repair completion or notification.
          </p>
          <p className="mt-2">
            Devices not collected within this period, after reasonable attempts to contact the customer, may be disposed of.
            No replacement or compensation will be offered for uncollected devices.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">8. Device Inspection on Collection</h2>
          <p className="mt-2">
            Customers are responsible for checking their device at the time of collection. Warranty applies only to parts
            replaced or repairs performed by eRepair.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">9. Consumer Guarantees Act (NZ)</h2>
          <p className="mt-2">
            Nothing in these Terms &amp; Conditions limits or excludes any rights the customer may have under the New Zealand
            Consumer Guarantees Act 1993.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">10. Acceptance of Terms</h2>
          <p className="mt-2">
            By approving a quote, authorising a repair, or engaging eRepair’s services, the customer agrees to these
            Terms &amp; Conditions.
          </p>
        </section>
      </div>
    </div>
  );
}
