import type { AnalyzeResponse } from '../api/types';

export function ResultCard({ result }: { result: AnalyzeResponse }) {
  return (
    <section className="result">
      <span className={`badge ${result.verdict}`}>{result.verdict}</span>
      <div className="metrics">
        <div>
          <span>Expected</span>
          <strong>${result.expectedFeeUsd.toFixed(2)}</strong>
        </div>
        <div>
          <span>Charged</span>
          <strong>${result.chargedFeeUsd.toFixed(2)}</strong>
        </div>
        <div>
          <span>Difference</span>
          <strong>
            {result.differenceUsd >= 0 ? '+' : ''}$
            {result.differenceUsd.toFixed(2)}
          </strong>
        </div>
      </div>
      <p>
        Fee date: <strong>{result.feeDate}</strong> · Rate:{' '}
        <strong>{result.season === 'peak' ? 'peak' : 'non-peak'}</strong> · Size
        tier: <strong>{result.sizeTier.replaceAll('_', ' ')}</strong> · Shipping
        weight: <strong>{result.shippingWeightLb} lb</strong> (
        {result.weightBandLabel})
        {result.source ? (
          <>
            {' '}
            · Source: <strong>{result.source}</strong>
          </>
        ) : null}
      </p>
      <p className="explanation">{result.explanation}</p>
    </section>
  );
}
