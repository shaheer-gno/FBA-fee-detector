import type { AnalyzeResponse, FeeCategory } from '../api/types';

/** Normalized view-model for the FBA comparison details panel. */
export type DetectionDetailsView = {
  title?: string;
  subtitle?: string;
  createdAt?: string;
  feeDate: string;
  season: 'non_peak' | 'peak';
  source?: string;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  unitWeightOz: number;
  category: FeeCategory | string;
  sellingPriceUsd: number;
  sizeTier: string;
  shippingWeightLb: number;
  shippingWeightOz: number;
  dimensionalWeightLb: number;
  priceBand: string;
  weightBandLabel: string;
  expectedFeeUsd: number;
  chargedFeeUsd: number;
  differenceUsd: number;
  verdict: AnalyzeResponse['verdict'];
  explanation: string;
  reverseMatch: AnalyzeResponse['reverseMatch'];
};

export function DetectionDetails({ view }: { view: DetectionDetailsView }) {
  return (
    <div className="detection-details">
      {view.title ? <h3 className="details-title">{view.title}</h3> : null}
      {view.subtitle ? <p className="hint">{view.subtitle}</p> : null}

      <span className={`badge ${view.verdict}`}>{view.verdict}</span>

      <div className="metrics">
        <div>
          <span>Expected</span>
          <strong>${view.expectedFeeUsd.toFixed(2)}</strong>
        </div>
        <div>
          <span>Charged</span>
          <strong>${view.chargedFeeUsd.toFixed(2)}</strong>
        </div>
        <div>
          <span>Difference</span>
          <strong>
            {view.differenceUsd >= 0 ? '+' : ''}$
            {view.differenceUsd.toFixed(2)}
          </strong>
        </div>
      </div>

      <dl className="details-grid">
        <div>
          <dt>Fee date</dt>
          <dd>{view.feeDate}</dd>
        </div>
        <div>
          <dt>Rate season</dt>
          <dd>{view.season === 'peak' ? 'peak' : 'non-peak'}</dd>
        </div>
        {view.source ? (
          <div>
            <dt>Source</dt>
            <dd>{view.source}</dd>
          </div>
        ) : null}
        {view.createdAt ? (
          <div>
            <dt>Run at</dt>
            <dd>{new Date(view.createdAt).toLocaleString()}</dd>
          </div>
        ) : null}
        <div>
          <dt>Package dims</dt>
          <dd>
            {view.lengthIn}×{view.widthIn}×{view.heightIn} in
          </dd>
        </div>
        <div>
          <dt>Unit weight</dt>
          <dd>{view.unitWeightOz} oz</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{String(view.category).replaceAll('_', ' ')}</dd>
        </div>
        <div>
          <dt>Selling price</dt>
          <dd>${view.sellingPriceUsd.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Size tier</dt>
          <dd>{view.sizeTier.replaceAll('_', ' ')}</dd>
        </div>
        <div>
          <dt>Shipping weight</dt>
          <dd>
            {view.shippingWeightLb} lb ({view.shippingWeightOz} oz) ·{' '}
            {view.weightBandLabel}
          </dd>
        </div>
        <div>
          <dt>Dim weight</dt>
          <dd>{view.dimensionalWeightLb} lb</dd>
        </div>
        <div>
          <dt>Price band</dt>
          <dd>{view.priceBand.replaceAll('_', ' ')}</dd>
        </div>
      </dl>

      <p className="explanation">{view.explanation}</p>

      {view.reverseMatch ? (
        <div className="reverse-match">
          <h4>Implied Amazon band</h4>
          <p className="hint">
            Closest rate-card match to the charged fee:{' '}
            <strong>
              {view.reverseMatch.impliedSizeTier.replaceAll('_', ' ')}
            </strong>{' '}
            / {view.reverseMatch.impliedWeightBandLabel} @ $
            {view.reverseMatch.matchedFeeUsd.toFixed(2)} (Δ $
            {view.reverseMatch.feeDeltaFromCharged.toFixed(2)} from charged).
          </p>
        </div>
      ) : null}
    </div>
  );
}
