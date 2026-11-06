// Cutting run logic.
// Lifted from HydraCoreSystems/gm-commerce, lib/nursery/propagation.ts.
//
// QUANTITY INVARIANT (unchanged from the original): if the grower asks for 10
// cuttings, this produces exactly 10 records, each with its own -C## id.
// Quantities are never pooled.
//
// Adaptation: the original read from a donor plant row in a database. Here the
// source is any plant entry that carries an id and its two label lines, so the
// type is narrowed to just those fields. The returned record keeps the same
// fields as the original so the lifted assertions run unchanged.

export interface PropagationSource {
  donor_id: string;
  display_name: string;
  botanical_line1?: string | null;
  botanical_line2?: string | null;
}

export interface CuttingRecord {
  propagation_id: string; // e.g. 'HY-RIC01-C08'
  donor_id: string;
  legacy_id?: string | null;
  full_display_name?: string | null;
  label_line1?: string | null;
  label_line2?: string | null;
  date_taken?: string | null;
  sold: boolean;
  print_label: boolean;
  archived_at?: string | null;
  label_last_printed_at?: string | null;
}

export interface CreatePropagationBatchParams {
  donor: PropagationSource;
  startSeq: number;
  outputCount: number;
  dateTaken?: string;
}

export function generatePropagationRecords(params: CreatePropagationBatchParams): CuttingRecord[] {
  const { donor, startSeq, outputCount, dateTaken } = params;

  if (outputCount < 1) {
    throw new Error("outputCount must be at least 1");
  }

  const effectiveDate = dateTaken || new Date().toISOString().slice(0, 10);

  return Array.from({ length: outputCount }, (_, idx) => {
    const seq = startSeq + idx;
    const seqStr = String(seq).padStart(2, "0");
    const propagationId = `${donor.donor_id}-C${seqStr}`;

    return {
      propagation_id: propagationId,
      donor_id: donor.donor_id,
      full_display_name: donor.display_name,
      label_line1: donor.botanical_line1 ?? null,
      label_line2: donor.botanical_line2 ?? null,
      date_taken: effectiveDate,
      sold: false,
      print_label: true, // Queued for physical sticker sheet printing
      archived_at: null,
      label_last_printed_at: null,
    };
  });
}

/**
 * The short mark printed on a cutting label, in the style of C08.
 * Takes the full id ('HY-RIC01-C08') and returns the sequence part ('C08').
 */
export function sequenceMark(propagationId: string): string {
  const m = /-?(C\d+)$/.exec(propagationId);
  return m ? m[1] : propagationId;
}
