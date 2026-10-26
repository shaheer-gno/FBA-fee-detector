import { useMemo, useRef, useState } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import {
  detectAmazonReportType,
  REPORT_LABELS,
  type AmazonReportType,
} from '../lib/detectReport';
import type { AmazonReportsImportResult } from '../types';

type StagedFile = {
  name: string;
  text: string;
  type: AmazonReportType;
};

type Props = {
  pending: boolean;
  onClose: () => void;
  onImport: (files: { name: string; text: string }[]) => Promise<AmazonReportsImportResult>;
};

const REQUIRED: AmazonReportType[] = [
  'fee_preview',
  'settlement_v2',
  'merchant_listings',
];

const ACCEPTED = new Set<AmazonReportType>(REQUIRED);

export function ImportAmazonReportsModal({ pending, onClose, onImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  const byType = useMemo(() => {
    const map = new Map<AmazonReportType, StagedFile[]>();
    for (const f of staged) {
      const list = map.get(f.type) ?? [];
      list.push(f);
      map.set(f.type, list);
    }
    return map;
  }, [staged]);

  const hasFeePreview = (byType.get('fee_preview')?.length ?? 0) > 0;
  const hasSettlement = (byType.get('settlement_v2')?.length ?? 0) > 0;
  const hasMerchant = (byType.get('merchant_listings')?.length ?? 0) > 0;
  const canContinue = hasFeePreview && hasSettlement && hasMerchant;

  async function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setLocalError(null);
    const next = [...staged];
    const ignored: string[] = [];

    for (const file of Array.from(fileList)) {
      const text = await file.text();
      const type = detectAmazonReportType(text);
      if (!ACCEPTED.has(type)) {
        ignored.push(
          `${file.name} (${REPORT_LABELS[type]} — not used)`,
        );
        continue;
      }
      const idx = next.findIndex((f) => f.name === file.name);
      const entry = { name: file.name, text, type };
      if (idx >= 0) next[idx] = entry;
      else next.push(entry);
    }

    setStaged(next);
    if (ignored.length > 0) {
      setLocalError(`Skipped: ${ignored.join('; ')}`);
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  function removeFile(name: string) {
    setStaged((prev) => prev.filter((f) => f.name !== name));
  }

  async function runImport() {
    setLocalError(null);
    try {
      await onImport(staged.map(({ name, text }) => ({ name, text })));
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Import failed');
    }
  }

  return (
    <Modal title="Import Amazon reports" onClose={onClose}>
      <p className="import-warning" role="alert">
        Dimensions and weight come from Amazon reports. Check each product’s
        package size manually — Amazon’s measurements are often wrong and that
        is usually why fees look overcharged.
      </p>

      {step === 'upload' ? (
        <div className="import-wizard">
          <p className="hint">
            Upload Fee Preview, Settlement, and Merchant listings (all required).
          </p>

          <input
            ref={inputRef}
            type="file"
            accept=".txt,.tsv,.csv,text/plain,text/csv,text/tab-separated-values"
            multiple
            hidden
            onChange={(e) => void addFiles(e.target.files)}
          />

          <button
            type="button"
            className="btn-secondary btn-block"
            onClick={() => inputRef.current?.click()}
          >
            Choose report files…
          </button>

          <ul className="import-checklist">
            {REQUIRED.map((t) => (
              <li key={t} className={byType.has(t) ? 'ok' : 'missing'}>
                <span>{REPORT_LABELS[t]}</span>
                <strong>
                  {byType.has(t)
                    ? `${byType.get(t)!.length} file(s)`
                    : 'Missing'}
                </strong>
              </li>
            ))}
          </ul>

          {staged.length > 0 ? (
            <ul className="import-files">
              {staged.map((f) => (
                <li key={f.name}>
                  <span>
                    <strong>{f.name}</strong>
                    <em>{REPORT_LABELS[f.type]}</em>
                  </span>
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => removeFile(f.name)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {localError ? <p className="error">{localError}</p> : null}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              disabled={!canContinue}
              onClick={() => setStep('review')}
            >
              Review
            </button>
          </div>
        </div>
      ) : (
        <div className="import-wizard">
          <p className="hint">
            We will apply Fee Preview first (US products + Amazon dims), enrich
            from Merchant listings, then update charged fees from Settlement,
            then run detect on every imported/updated SKU.
          </p>

          <ul className="import-checklist">
            {staged.map((f) => (
              <li key={f.name} className={f.type === 'unknown' ? 'missing' : 'ok'}>
                <span>{f.name}</span>
                <strong>{REPORT_LABELS[f.type]}</strong>
              </li>
            ))}
          </ul>

          {localError ? <p className="error">{localError}</p> : null}

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              disabled={pending}
              onClick={() => setStep('upload')}
            >
              Back
            </button>
            <button type="button" disabled={pending} onClick={() => void runImport()}>
              {pending ? 'Importing…' : 'Import'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
