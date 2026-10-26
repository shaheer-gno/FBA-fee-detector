/**
 * Re-export shared Amazon report detection so API and web stay in sync.
 * Source of truth: @fba/amazon-report-detect
 */
export {
  detectAmazonReportType,
  REPORT_LABELS,
  type AmazonReportType,
} from '@fba/amazon-report-detect';
