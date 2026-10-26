import { useMemo, useState, type FormEvent } from 'react';
import type { AnalyzeResponse, FeeCategory } from '../../../shared/api/types';
import { seasonHint, todayLocalIso } from '../../../shared/lib/dates';
import { ResultCard } from '../../../shared/ui/ResultCard';
import { useAnalyzeDetection } from '../queries';

export function AnalyzePage() {
  const [lengthIn, setLengthIn] = useState('8');
  const [widthIn, setWidthIn] = useState('5');
  const [heightIn, setHeightIn] = useState('0.5');
  const [unitWeightOz, setUnitWeightOz] = useState('10');
  const [category, setCategory] = useState<FeeCategory>('general');
  const [sellingPriceUsd, setSellingPriceUsd] = useState('25');
  const [feeDate, setFeeDate] = useState(todayLocalIso);
  const [chargedFeeUsd, setChargedFeeUsd] = useState('4.20');
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const inferredSeason = useMemo(() => seasonHint(feeDate), [feeDate]);
  const mutation = useAnalyzeDetection();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate(
      {
        lengthIn: Number(lengthIn),
        widthIn: Number(widthIn),
        heightIn: Number(heightIn),
        unitWeightOz: Number(unitWeightOz),
        category,
        sellingPriceUsd: Number(sellingPriceUsd),
        feeDate,
        chargedFeeUsd: Number(chargedFeeUsd),
      },
      { onSuccess: setResult },
    );
  }

  return (
    <main>
      <h1>One-off analyze</h1>
      <p className="lede">
        Ad-hoc check without saving a product. Prefer{' '}
        <strong>Products</strong> for SKUs you monitor daily.
      </p>

      <form onSubmit={onSubmit}>
        <label>
          Length (in)
          <input
            value={lengthIn}
            onChange={(e) => setLengthIn(e.target.value)}
            required
          />
        </label>
        <label>
          Width (in)
          <input
            value={widthIn}
            onChange={(e) => setWidthIn(e.target.value)}
            required
          />
        </label>
        <label>
          Height (in)
          <input
            value={heightIn}
            onChange={(e) => setHeightIn(e.target.value)}
            required
          />
        </label>
        <label>
          Unit weight (oz)
          <input
            value={unitWeightOz}
            onChange={(e) => setUnitWeightOz(e.target.value)}
            required
          />
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as FeeCategory)}
          >
            <option value="general">General</option>
            <option value="apparel">Apparel</option>
            <option value="dangerous_goods">Dangerous goods</option>
          </select>
        </label>
        <label>
          Fee date
          <input
            type="date"
            value={feeDate}
            onChange={(e) => setFeeDate(e.target.value)}
            required
          />
          <span className="hint">
            Uses {inferredSeason === 'peak' ? 'peak (holiday)' : 'non-peak'}{' '}
            rates (peak = Oct 15 – Jan 14)
          </span>
        </label>
        <label>
          Selling price (USD)
          <input
            value={sellingPriceUsd}
            onChange={(e) => setSellingPriceUsd(e.target.value)}
            required
          />
        </label>
        <label>
          Charged FBA fee (USD)
          <input
            value={chargedFeeUsd}
            onChange={(e) => setChargedFeeUsd(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Analyzing…' : 'Analyze fee'}
        </button>
      </form>

      {mutation.isError ? (
        <p className="error">{(mutation.error as Error).message}</p>
      ) : null}

      {result ? <ResultCard result={result} /> : null}
    </main>
  );
}
