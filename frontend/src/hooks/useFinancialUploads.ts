"use client";

import { useState } from "react";

import type { Company, CsvValidationResult } from "@/types/companyTypes";
import { fetchWithAuth } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

export function useFinancialUploads() {
  const [selectedCompanyForUpload, setSelectedCompanyForUpload] =
    useState<Company | null>(null);
  const [validationResult, setValidationResult] =
    useState<CsvValidationResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [refreshHistory, setRefreshHistory] = useState(0);

  async function processFile(): Promise<void> {
    if (!validationResult?.file || !selectedCompanyForUpload) {
      return;
    }
    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", validationResult.file);
    formData.append("company_id", selectedCompanyForUpload.id);
    formData.append(
      "document_type",
      validationResult.detectedType || "ventas-contribuyentes",
    );

    try {
      await fetchWithAuth("/financial/upload", {
        method: "POST",
        body: formData,
      });
      setValidationResult(null);
      setSelectedCompanyForUpload(null);
      setRefreshHistory((current) => current + 1);
    } catch (error: unknown) {
      setUploadError(
        getErrorMessage(error, "No se pudo procesar el archivo."),
      );
    } finally {
      setIsUploading(false);
    }
  }

  function clearSelection(): void {
    setSelectedCompanyForUpload(null);
    setValidationResult(null);
    setUploadError(null);
  }

  function refresh(): void {
    setRefreshHistory((current) => current + 1);
  }

  return {
    selectedCompanyForUpload,
    setSelectedCompanyForUpload,
    validationResult,
    setValidationResult,
    isUploading,
    uploadError,
    setUploadError,
    refreshHistory,
    processFile,
    clearSelection,
    refresh,
  };
}
