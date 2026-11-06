import { describe, it, expect } from "vitest";
import { generatePropagationRecords, sequenceMark, type PropagationSource } from "./propagation";

// The describe block below is the Commerce Center test, assertions unchanged.
// Only the mock donor's type annotation changed, because the full donor row
// type stays behind in the Commerce Center.

describe("generatePropagationRecords", () => {
  const mockDonor: PropagationSource = {
    donor_id: "HY-RIC01",
    display_name: "Hoya 'Ricardo' (vitellina x deykeae)",
    botanical_line1: "Hoya Ricardo",
    botanical_line2: "'vitellina x deykeae'",
  };

  it("generates exactly 10 distinct records and 10 SKUs when outputCount is 10 (Invariant)", () => {
    const records = generatePropagationRecords({
      donor: mockDonor,
      startSeq: 1,
      outputCount: 10,
      dateTaken: "2026-09-12",
    });

    expect(records).toHaveLength(10);

    // Verify sequential -C## IDs
    expect(records[0].propagation_id).toBe("HY-RIC01-C01");
    expect(records[1].propagation_id).toBe("HY-RIC01-C02");
    expect(records[9].propagation_id).toBe("HY-RIC01-C10");

    // Verify all IDs are unique
    const uniqueIds = new Set(records.map((r) => r.propagation_id));
    expect(uniqueIds.size).toBe(10);

    // Verify all fields initialized properly
    for (const r of records) {
      expect(r.donor_id).toBe("HY-RIC01");
      expect(r.full_display_name).toBe(mockDonor.display_name);
      expect(r.label_line1).toBe("Hoya Ricardo");
      expect(r.label_line2).toBe("'vitellina x deykeae'");
      expect(r.sold).toBe(false);
      expect(r.print_label).toBe(true);
      expect(r.archived_at).toBeNull();
      expect(r.date_taken).toBe("2026-09-12");
    }
  });

  it("preserves starting sequence offset correctly", () => {
    const records = generatePropagationRecords({
      donor: mockDonor,
      startSeq: 8,
      outputCount: 3,
      dateTaken: "2026-09-12",
    });

    expect(records.map((r) => r.propagation_id)).toEqual([
      "HY-RIC01-C08",
      "HY-RIC01-C09",
      "HY-RIC01-C10",
    ]);
  });

  it("rejects outputCount < 1", () => {
    expect(() =>
      generatePropagationRecords({
        donor: mockDonor,
        startSeq: 1,
        outputCount: 0,
      })
    ).toThrow(/at least 1/);
  });
});

describe("sequenceMark", () => {
  it("returns the C## part for a cutting label", () => {
    expect(sequenceMark("HY-RIC01-C08")).toBe("C08");
    expect(sequenceMark("X1-C10")).toBe("C10");
    expect(sequenceMark("C03")).toBe("C03");
  });

  it("keeps three digit sequences whole", () => {
    expect(sequenceMark("A-C100")).toBe("C100");
  });
});
