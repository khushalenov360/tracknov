import { expect, test } from "@playwright/test";
import JSZip from "jszip";
import { buildSubmissionZip, buildSubmissionZipEntryPath, sanitizePathSegment } from "../lib/exports";

test("sanitizePathSegment keeps export names filesystem-safe", async () => {
  expect(sanitizePathSegment("EDA C1 - Optimise Circulation Spaces")).toBe("EDA_C1_-_Optimise_Circulation_Spaces");
  expect(sanitizePathSegment("  /Invalid::Name??  ")).toBe("Invalid_Name");
});

test("submission zip entry path uses normalized credit/category/file naming", async () => {
  const entry = buildSubmissionZipEntryPath({
    creditCode: "EDA C1",
    docCategory: "Calculation & Tables",
    fileName: "KFC-BHAVARKUA, INDORE-AREA CHART (CIVIL INTERIOR)-12.10.2023.pdf",
  });

  expect(entry).toBe(
    "EDA_C1/Calculation_Tables/KFC-BHAVARKUA_INDORE-AREA_CHART_CIVIL_INTERIOR_-12.10.2023.pdf",
  );
});

test("submission zip includes approved docs only with structured folders", async () => {
  const workspace: any = {
    credits: [
      {
        id: "c1",
        credit_code: "EDA C1",
        documents: [
          {
            id: "d1",
            status: "approved",
            file_name: "approved file.pdf",
            doc_category: "Narrative",
            file_path: "demo/approved file.pdf",
          },
          {
            id: "d2",
            status: "uploaded",
            file_name: "pending.pdf",
            doc_category: "Drawing",
            file_path: "demo/pending.pdf",
          },
        ],
      },
    ],
  };

  const zippedBuffer = await buildSubmissionZip(workspace);
  const zip = await JSZip.loadAsync(zippedBuffer);
  const entries = Object.keys(zip.files);
  const fileEntries = entries.filter((entry) => !entry.endsWith("/"));

  expect(entries.some((name) => name.includes("pending"))).toBe(false);
  expect(fileEntries).toEqual(["DESIGN/EDA_C1/Narrative/approved_file.pdf"]);
});
