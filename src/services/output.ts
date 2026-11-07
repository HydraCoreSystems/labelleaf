import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { pdfDataUri } from "../pdf/base64";

/** Opens the system print dialog with the exact size PDF. */
export async function printPdf(bytes: Uint8Array): Promise<void> {
  await Print.printAsync({ uri: pdfDataUri(bytes) });
}

/** Saves the queue as a CSV file and opens the share sheet. */
export async function shareCsv(csv: string, dialogTitle: string): Promise<void> {
  const file = new File(Paths.cache, "labelleaf-labels.csv");
  file.create({ overwrite: true });
  await file.write(csv);
  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
    dialogTitle,
  });
}
