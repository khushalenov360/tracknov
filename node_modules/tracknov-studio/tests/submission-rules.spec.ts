import { expect, test } from "@playwright/test";
import { getApprovedSubmissionCredits, isSubmissionExportReady } from "../lib/exports";

test("submission export requires all mandatory credits complete", async () => {
  const workspace: any = {
    credits: [
      { is_mandatory: true, status: "complete", documents: [] },
      { is_mandatory: true, status: "in_progress", documents: [] },
      { is_mandatory: false, status: "complete", documents: [] },
    ],
  };

  expect(isSubmissionExportReady(workspace)).toBe(false);
  workspace.credits[1].status = "complete";
  expect(isSubmissionExportReady(workspace)).toBe(true);
});

test("submission export includes approved documents only", async () => {
  const workspace: any = {
    credits: [
      {
        id: "c1",
        credit_code: "EDA C1",
        documents: [
          { id: "d1", status: "approved", file_name: "a.pdf", doc_category: "Narrative" },
          { id: "d2", status: "uploaded", file_name: "b.pdf", doc_category: "Drawing" },
        ],
      },
      {
        id: "c2",
        credit_code: "EDA C2",
        documents: [{ id: "d3", status: "rejected", file_name: "c.pdf", doc_category: "Narrative" }],
      },
    ],
  };

  const selected = getApprovedSubmissionCredits(workspace);
  expect(selected).toHaveLength(1);
  expect(selected[0].credit_code).toBe("EDA C1");
  expect(selected[0].documents).toHaveLength(1);
  expect(selected[0].documents[0].file_name).toBe("a.pdf");
});
