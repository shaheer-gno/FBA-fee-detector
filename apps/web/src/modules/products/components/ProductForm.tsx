import { useState, type FormEvent, type ReactNode } from 'react';
import type { FeeCategory } from '../../../shared/api/types';
import type { CreateProductPayload, Product } from '../types';

export type ProductFormValues = CreateProductPayload;

type Props = {
  initial?: Product | null;
  submitLabel: string;
  pending?: boolean;
  error?: string | null;
  onSubmit: (values: ProductFormValues) => void;
  onCancel: () => void;
};

function FieldLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <span className="field-label">
      {children}
      {required ? (
        <span className="req" aria-hidden="true">
          *
        </span>
      ) : null}
    </span>
  );
}

function parseRequiredNonNeg(raw: string, label: string): number {
  const trimmed = raw.trim();
  if (trimmed === '') {
    throw new Error(`${label} is required`);
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${label} must be a number ≥ 0`);
  }
  return n;
}

function parseRequiredPositive(raw: string, label: string): number {
  const n = parseRequiredNonNeg(raw, label);
  if (n <= 0) {
    throw new Error(`${label} must be greater than 0`);
  }
  return n;
}

export function ProductForm({
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: Props) {
  const [sku, setSku] = useState(initial?.sku ?? '');
  const [asin, setAsin] = useState(initial?.asin ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [lengthIn, setLengthIn] = useState(String(initial?.lengthIn ?? ''));
  const [widthIn, setWidthIn] = useState(String(initial?.widthIn ?? ''));
  const [heightIn, setHeightIn] = useState(String(initial?.heightIn ?? ''));
  const [unitWeightOz, setUnitWeightOz] = useState(
    String(initial?.unitWeightOz ?? ''),
  );
  const [category, setCategory] = useState<FeeCategory>(
    initial?.category ?? 'general',
  );
  const [sellingPriceUsd, setSellingPriceUsd] = useState(
    String(initial?.sellingPriceUsd ?? ''),
  );
  const [lastChargedFeeUsd, setLastChargedFeeUsd] = useState(
    initial?.lastChargedFeeUsd != null
      ? String(initial.lastChargedFeeUsd)
      : '',
  );
  const [active, setActive] = useState(initial?.active ?? true);
  const [localError, setLocalError] = useState<string | null>(null);
  const feeLocked =
    initial?.feeSource === 'fee_preview' ||
    initial?.feeSource === 'settlement';

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);

    try {
      if (!sku.trim()) {
        throw new Error('SKU is required');
      }
      onSubmit({
        sku: sku.trim(),
        asin: asin.trim() || null,
        title: title.trim() || null,
        lengthIn: parseRequiredPositive(lengthIn, 'Length'),
        widthIn: parseRequiredPositive(widthIn, 'Width'),
        heightIn: parseRequiredPositive(heightIn, 'Height'),
        unitWeightOz: parseRequiredPositive(unitWeightOz, 'Unit weight'),
        category,
        sellingPriceUsd: parseRequiredNonNeg(sellingPriceUsd, 'Selling price'),
        lastChargedFeeUsd: parseRequiredNonNeg(
          lastChargedFeeUsd,
          'Amazon charged FBA fee',
        ),
        active,
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Invalid form');
    }
  }

  const displayError = localError ?? error;

  return (
    <form className="modal-form" onSubmit={handleSubmit} noValidate>
      <label>
        <FieldLabel required>SKU</FieldLabel>
        <input
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          required
          autoComplete="off"
        />
      </label>
      <label>
        <FieldLabel>ASIN</FieldLabel>
        <input value={asin} onChange={(e) => setAsin(e.target.value)} />
      </label>
      <label className="full">
        <FieldLabel>Title</FieldLabel>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        <FieldLabel required>Length (in)</FieldLabel>
        <input
          type="number"
          inputMode="decimal"
          min="0.01"
          step="any"
          value={lengthIn}
          onChange={(e) => setLengthIn(e.target.value)}
          required
        />
      </label>
      <label>
        <FieldLabel required>Width (in)</FieldLabel>
        <input
          type="number"
          inputMode="decimal"
          min="0.01"
          step="any"
          value={widthIn}
          onChange={(e) => setWidthIn(e.target.value)}
          required
        />
      </label>
      <label>
        <FieldLabel required>Height (in)</FieldLabel>
        <input
          type="number"
          inputMode="decimal"
          min="0.01"
          step="any"
          value={heightIn}
          onChange={(e) => setHeightIn(e.target.value)}
          required
        />
      </label>
      <label>
        <FieldLabel required>Unit weight (oz)</FieldLabel>
        <input
          type="number"
          inputMode="decimal"
          min="0.01"
          step="any"
          value={unitWeightOz}
          onChange={(e) => setUnitWeightOz(e.target.value)}
          required
        />
      </label>
      <label>
        <FieldLabel required>Category</FieldLabel>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as FeeCategory)}
          required
        >
          <option value="general">General</option>
          <option value="apparel">Apparel</option>
          <option value="dangerous_goods">Dangerous goods</option>
        </select>
      </label>
      <label>
        <FieldLabel required>Selling price (USD)</FieldLabel>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={sellingPriceUsd}
          onChange={(e) => setSellingPriceUsd(e.target.value)}
          required
        />
      </label>
      <label>
        <FieldLabel required={!feeLocked}>Amazon FBA fee (USD)</FieldLabel>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={lastChargedFeeUsd}
          onChange={(e) => setLastChargedFeeUsd(e.target.value)}
          placeholder="e.g. 4.20"
          required
          readOnly={feeLocked}
          disabled={feeLocked}
        />
        {feeLocked ? (
          <span className="hint">
            From Amazon report (
            {initial?.feeSource === 'settlement' ? 'Settlement' : 'Fee Preview'})
            — re-import reports to update.
          </span>
        ) : null}
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        Active (include in daily runs)
      </label>
      {displayError ? <p className="error full">{displayError}</p> : null}
      <div className="form-actions full">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
