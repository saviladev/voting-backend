export interface PadronImportResultDto {
  created: number;
  updated: number;
  disabled: number;
  skipped: number;
  rejected: string[];
  message?: string;
  skippedDetails?: PadronImportSkippedDetail[];
}

export interface PadronImportSkippedDetail {
  dni?: string;
  reason: string;
}
