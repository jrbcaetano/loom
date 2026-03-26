"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";

type ShoppingListCsvRowResult = {
  rowNumber: number;
  action: "upsert" | "delete";
  itemRef: string;
  status: "success" | "error";
  error: string | null;
};

type ShoppingListCategoryCsvRowResult = {
  rowNumber: number;
  action: "upsert" | "delete";
  categoryRef: string;
  status: "success" | "error";
  error: string | null;
};

type ShoppingListCsvImportReport = {
  fileName: string;
  shoppingListId: string;
  processedRows: number;
  successCount: number;
  errorCount: number;
  results: ShoppingListCsvRowResult[];
};

type ShoppingListCategoryCsvImportReport = {
  fileName: string;
  shoppingListId: string;
  processedRows: number;
  successCount: number;
  errorCount: number;
  results: ShoppingListCategoryCsvRowResult[];
};

type CsvDataset = "items" | "categories";

type ImportReport = ShoppingListCsvImportReport | ShoppingListCategoryCsvImportReport;

type FileImportResult = {
  fileName: string;
  dataset: CsvDataset;
  status: "success" | "error";
  report: ImportReport | null;
  error: string | null;
};

type ShoppingListCsvManagerProps = {
  familyId: string;
};

function downloadBlob(content: BlobPart, fileName: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ShoppingListCsvManager({ familyId }: ShoppingListCsvManagerProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [selectedItemFiles, setSelectedItemFiles] = useState<File[]>([]);
  const [selectedCategoryFiles, setSelectedCategoryFiles] = useState<File[]>([]);
  const [importResults, setImportResults] = useState<FileImportResult[]>([]);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState<Record<CsvDataset, boolean>>({ items: false, categories: false });
  const [isExporting, setIsExporting] = useState<Record<CsvDataset, boolean>>({ items: false, categories: false });
  const [isImporting, setIsImporting] = useState<Record<CsvDataset, boolean>>({ items: false, categories: false });
  const [serverError, setServerError] = useState<string | null>(null);

  async function downloadCsv(mode: "template" | "export", dataset: CsvDataset, fallbackFileName: string, stateKey: "isDownloadingTemplate" | "isExporting") {
    setServerError(null);
    if (stateKey === "isDownloadingTemplate") {
      setIsDownloadingTemplate((current) => ({ ...current, [dataset]: true }));
    } else {
      setIsExporting((current) => ({ ...current, [dataset]: true }));
    }

    try {
      const response = await fetch(`/api/families/${familyId}/shopping-list-csv?mode=${mode}&dataset=${dataset}`, { cache: "no-store" });
      const contentType = response.headers.get("content-type") ?? "text/plain";

      if (!response.ok) {
        const payload = contentType.includes("application/json") ? ((await response.json()) as { error?: string }) : null;
        throw new Error(payload?.error ?? "Failed to prepare CSV.");
      }

      const csv = await response.text();
      const disposition = response.headers.get("content-disposition") ?? "";
      const fileNameMatch = disposition.match(/filename="([^"]+)"/i);
      downloadBlob(csv, fileNameMatch?.[1] ?? fallbackFileName, "text/csv;charset=utf-8");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Failed to prepare CSV.");
    } finally {
      if (stateKey === "isDownloadingTemplate") {
        setIsDownloadingTemplate((current) => ({ ...current, [dataset]: false }));
      } else {
        setIsExporting((current) => ({ ...current, [dataset]: false }));
      }
    }
  }

  async function importFilesSequentially(dataset: CsvDataset) {
    const selectedFiles = dataset === "items" ? selectedItemFiles : selectedCategoryFiles;
    if (selectedFiles.length === 0) {
      return;
    }

    setServerError(null);
    setIsImporting((current) => ({ ...current, [dataset]: true }));
    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("dataset", dataset);

      try {
        const response = await fetch(`/api/families/${familyId}/shopping-list-csv`, {
          method: "POST",
          body: formData
        });
        const payload = (await response.json()) as ImportReport & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to import CSV.");
        }

        const nextResult: FileImportResult = {
          fileName: file.name,
          dataset,
          status: "success",
          report: payload,
          error: null
        };
        setImportResults((current) => [...current.filter((entry) => !(entry.dataset === dataset && entry.fileName === file.name)), nextResult]);
      } catch (error) {
        const nextResult: FileImportResult = {
          fileName: file.name,
          dataset,
          status: "error",
          report: null,
          error: error instanceof Error ? error.message : "Failed to import CSV."
        };
        setImportResults((current) => [...current.filter((entry) => !(entry.dataset === dataset && entry.fileName === file.name)), nextResult]);
      }
    }

    if (dataset === "items") {
      setSelectedItemFiles([]);
    } else {
      setSelectedCategoryFiles([]);
    }
    setIsImporting((current) => ({ ...current, [dataset]: false }));
    router.refresh();
  }

  function renderDatasetSection(dataset: CsvDataset) {
    const isCategoryDataset = dataset === "categories";
    const selectedFiles = isCategoryDataset ? selectedCategoryFiles : selectedItemFiles;
    const datasetResults = importResults.filter((result) => result.dataset === dataset);
    const overview = datasetResults.reduce(
      (totals, entry) => {
        totals.files += 1;
        if (entry.status === "success" && entry.report) {
          totals.successfulFiles += 1;
          totals.processedRows += entry.report.processedRows;
          totals.successCount += entry.report.successCount;
          totals.errorCount += entry.report.errorCount;
        } else {
          totals.failedFiles += 1;
        }
        return totals;
      },
      { files: 0, successfulFiles: 0, failedFiles: 0, processedRows: 0, successCount: 0, errorCount: 0 }
    );

    return (
      <div className="loom-stack-sm">
        <div className="loom-soft-row loom-csv-manager-card">
          <div className="loom-stack-sm">
            <p className="m-0 font-semibold">
              {isCategoryDataset ? t("family.shoppingListCategoryCsvTitle", "Shopping list categories CSV") : t("family.shoppingListCsvTitle", "Shopping list items CSV")}
            </p>
            <p className="loom-muted small m-0">
              {isCategoryDataset
                ? t("family.shoppingListCategoryCsvHint", "Download or import the allowed Shopping List categories used by your family items.")
                : t("family.shoppingListCsvHint", "Download the CSV template or your current Shopping List, edit it offline, and import one or more CSV files back in sequence.")}
            </p>
          </div>

          <div className="loom-form-actions">
            <button
              type="button"
              className="loom-button-ghost"
              onClick={() =>
                downloadCsv(
                  "template",
                  dataset,
                  isCategoryDataset ? "shopping-list-categories-template.csv" : "shopping-list-template.csv",
                  "isDownloadingTemplate"
                )
              }
              disabled={isDownloadingTemplate[dataset] || isExporting[dataset] || isImporting[dataset]}
            >
              {isDownloadingTemplate[dataset] ? t("common.loading", "Loading...") : t("family.downloadCsvTemplate", "Download template")}
            </button>
            <button
              type="button"
              className="loom-button-ghost"
              onClick={() =>
                downloadCsv(
                  "export",
                  dataset,
                  isCategoryDataset ? "shopping-list-categories-export.csv" : "shopping-list-export.csv",
                  "isExporting"
                )
              }
              disabled={isDownloadingTemplate[dataset] || isExporting[dataset] || isImporting[dataset]}
            >
              {isExporting[dataset]
                ? t("common.loading", "Loading...")
                : isCategoryDataset
                  ? t("family.exportShoppingListCategoryCsv", "Export categories")
                  : t("family.exportShoppingListCsv", "Export current list")}
            </button>
          </div>
        </div>

        <div className="loom-soft-row loom-csv-manager-card">
          <label className="loom-field">
            <span>{isCategoryDataset ? t("family.importShoppingListCategoryCsv", "Import category CSV files") : t("family.importShoppingListCsv", "Import CSV files")}</span>
            <input
              className="loom-input"
              type="file"
              accept=".csv,text/csv"
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                if (isCategoryDataset) {
                  setSelectedCategoryFiles(files);
                } else {
                  setSelectedItemFiles(files);
                }
              }}
              disabled={isImporting[dataset]}
            />
          </label>

          <p className="loom-muted small m-0">
            {isCategoryDataset
              ? t("family.importShoppingListCategoryCsvHelp", 'Use action "upsert" to add categories and "delete" to remove unused ones.')
              : t("family.importShoppingListCsvHelp", 'Use action "upsert" to add or update items, and "delete" to remove them. Include the exported id when updating or deleting an existing item.')}
          </p>

          {selectedFiles.length > 0 ? (
            <div className="loom-stack-sm">
              {selectedFiles.map((file) => (
                <p key={`${file.name}-${file.lastModified}-${file.size}`} className="loom-muted small m-0">
                  {file.name}
                </p>
              ))}
            </div>
          ) : null}

          <div className="loom-form-actions">
            <button
              type="button"
              className="loom-button-ghost"
              onClick={() => (isCategoryDataset ? setSelectedCategoryFiles([]) : setSelectedItemFiles([]))}
              disabled={isImporting[dataset] || selectedFiles.length === 0}
            >
              {t("common.clear", "Clear")}
            </button>
            <button type="button" className="loom-button-primary" onClick={() => importFilesSequentially(dataset)} disabled={isImporting[dataset] || selectedFiles.length === 0}>
              {isImporting[dataset]
                ? t("family.importShoppingListCsvLoading", "Importing CSV files...")
                : isCategoryDataset
                  ? t("family.importShoppingListCategoryCsvAction", "Import category files")
                  : t("family.importShoppingListCsvAction", "Import files")}
            </button>
          </div>

          {serverError ? <p className="loom-feedback-error m-0">{serverError}</p> : null}
        </div>

        {datasetResults.length > 0 ? (
          <div className="loom-soft-row loom-csv-manager-card">
            <div className="loom-stack-sm">
              <p className="m-0 font-semibold">{t("family.importOverview", "Import overview")}</p>
              <div className="loom-csv-overview-grid">
                <div>
                  <span className="loom-muted small">{t("family.filesProcessed", "Files processed")}</span>
                  <p className="m-0">{overview.files}</p>
                </div>
                <div>
                  <span className="loom-muted small">{t("family.processedRows", "Processed rows")}</span>
                  <p className="m-0">{overview.processedRows}</p>
                </div>
                <div>
                  <span className="loom-muted small">{t("family.successfulRows", "Successful rows")}</span>
                  <p className="m-0">{overview.successCount}</p>
                </div>
                <div>
                  <span className="loom-muted small">{t("family.erroredRows", "Errored rows")}</span>
                  <p className="m-0">{overview.errorCount}</p>
                </div>
              </div>
            </div>

            <div className="loom-stack-sm">
              {datasetResults.map((result) => (
                <div key={`${result.dataset}-${result.fileName}-${result.status}`} className="loom-csv-report-card">
                  <div className="loom-row-between">
                    <p className="m-0 font-semibold">{result.fileName}</p>
                    <span className={result.status === "success" ? "loom-muted small" : "loom-feedback-error"}>
                      {result.status === "success" ? t("common.success", "Success") : t("common.error", "Error")}
                    </span>
                  </div>

                  {result.error ? <p className="loom-feedback-error m-0">{result.error}</p> : null}

                  {result.report ? (
                    <>
                      <p className="loom-muted small m-0">
                        {t("family.importReportSummary", "{success} succeeded, {errors} errored, {rows} rows processed.")
                          .replace("{success}", String(result.report.successCount))
                          .replace("{errors}", String(result.report.errorCount))
                          .replace("{rows}", String(result.report.processedRows))}
                      </p>
                      <div className="loom-csv-report-table">
                        <table>
                          <thead>
                            <tr>
                              <th>{t("common.row", "Row")}</th>
                              <th>{t("common.action", "Action")}</th>
                              <th>{isCategoryDataset ? t("common.category", "Category") : t("lists.item", "Item")}</th>
                              <th>{t("common.status", "Status")}</th>
                              <th>{t("common.error", "Error")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.report.results.map((entry) => (
                              <tr key={`${result.dataset}-${result.fileName}-${entry.rowNumber}`}>
                                <td>{entry.rowNumber}</td>
                                <td>{entry.action}</td>
                                <td>{"itemRef" in entry ? entry.itemRef : entry.categoryRef}</td>
                                <td>{entry.status}</td>
                                <td>{entry.error ?? "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="loom-stack-sm">
      {renderDatasetSection("items")}
      {renderDatasetSection("categories")}
    </div>
  );
}
