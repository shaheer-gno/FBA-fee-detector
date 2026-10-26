import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import {
  DetectionDetails,
  type DetectionDetailsView,
} from '../../../shared/ui/DetectionDetails';
import { IconButton, Icons } from '../../../shared/ui/IconButton';
import { Modal } from '../../../shared/ui/Modal';
import { Pagination } from '../../../shared/ui/Pagination';
import {
  VerdictFilter,
  type VerdictFilterValue,
} from '../../../shared/ui/VerdictFilter';
import { useProductFilterOptions } from '../../products/queries';
import { detectionRecordToDetailsView } from '../lib/toDetailsView';
import { LIST_PAGE_SIZE } from '../../../shared/constants';
import { useHistoryList } from '../queries';

const PAGE_SIZE = LIST_PAGE_SIZE;
const historyRouteApi = getRouteApi('/history');

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${date} ${time}`;
}

function sourceLabel(source: string): string {
  if (source === 'daily_job') return 'Daily';
  if (source === 'product') return 'Detect';
  if (source === 'manual') return 'Manual';
  return source;
}

export function HistoryPage() {
  const navigate = useNavigate();
  const { productId } = historyRouteApi.useSearch();
  const [page, setPage] = useState(1);
  const [verdict, setVerdict] = useState<VerdictFilterValue>('');
  const [detailsView, setDetailsView] = useState<DetectionDetailsView | null>(
    null,
  );

  useEffect(() => {
    setPage(1);
  }, [productId, verdict]);

  const productsQuery = useProductFilterOptions();
  const query = useHistoryList(
    page,
    PAGE_SIZE,
    productId,
    verdict || undefined,
  );

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const products = productsQuery.data?.items ?? [];
  const selected = products.find((p) => p.id === productId);

  function setProductFilter(nextId: string) {
    void navigate({
      to: '/history',
      search: nextId ? { productId: nextId } : {},
    });
  }

  return (
    <main>
      <div className="page-head">
        <div>
          <h1>Detection history</h1>
          <p className="lede">
            Each run snapshots the dims used that day so edits to a product do
            not rewrite the past.
          </p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Listing</h2>
          <div className="panel-filters">
            <label className="inline">
              Product
              <select
                value={productId ?? ''}
                onChange={(e) => setProductFilter(e.target.value)}
              >
                <option value="">All products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku}
                  </option>
                ))}
              </select>
            </label>
            <VerdictFilter value={verdict} onChange={setVerdict} />
          </div>
        </div>

        {productId || verdict ? (
          <p className="hint">
            {productId ? (
              <>
                Product <strong>{selected?.sku ?? productId}</strong>
                {selected?.asin ? ` · ASIN ${selected.asin}` : ''}
              </>
            ) : null}
            {productId && verdict ? ' · ' : null}
            {verdict ? (
              <>
                Status <strong>{verdict}</strong>
              </>
            ) : null}
            {' · '}
            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setVerdict('');
                setProductFilter('');
              }}
            >
              Clear filters
            </button>
          </p>
        ) : (
          <p className="hint">
            Showing detections for all products and one-offs.
          </p>
        )}

        {query.isLoading ? <p>Loading…</p> : null}
        {query.isError ? (
          <p className="error">{(query.error as Error).message}</p>
        ) : null}

        {!query.isLoading && items.length === 0 ? (
          <p className="hint">
            {productId || verdict
              ? 'No detections match these filters.'
              : 'No detections yet.'}
          </p>
        ) : (
          <div className="table-wrap list-table">
            <table>
              <thead>
                <tr>
                  <th className="left">When</th>
                  <th className="left">Product</th>
                  <th className="left">ASIN</th>
                  <th>Fee date</th>
                  <th>Source</th>
                  <th>Verdict</th>
                  <th>Expected</th>
                  <th>Charged</th>
                  <th>Δ</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td
                      className="left muted-sm when-cell"
                      title={new Date(row.createdAt).toLocaleString()}
                    >
                      {formatWhen(row.createdAt)}
                    </td>
                    <td className="left sku-cell">
                      {row.productSku ? (
                        <strong
                          className="sku-clip"
                          title={
                            row.productTitle
                              ? `${row.productSku} — ${row.productTitle}`
                              : row.productSku
                          }
                        >
                          {row.productSku}
                        </strong>
                      ) : (
                        <span className="muted-sm">One-off</span>
                      )}
                    </td>
                    <td className="left muted-sm mono asin-cell">
                      {row.productAsin ?? '—'}
                    </td>
                    <td className="muted-sm nowrap">{row.input.feeDate}</td>
                    <td className="muted-sm nowrap">
                      {sourceLabel(row.source)}
                    </td>
                    <td>
                      <span className={`badge ${row.result.verdict}`}>
                        {row.result.verdict}
                      </span>
                    </td>
                    <td>${row.result.expectedFeeUsd.toFixed(2)}</td>
                    <td>${row.result.chargedFeeUsd.toFixed(2)}</td>
                    <td>
                      {row.result.differenceUsd >= 0 ? '+' : ''}
                      {row.result.differenceUsd.toFixed(2)}
                    </td>
                    <td>
                      <div className="row-actions">
                        <IconButton
                          label="Details"
                          onClick={() =>
                            setDetailsView(detectionRecordToDetailsView(row))
                          }
                        >
                          {Icons.details}
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      </section>

      {detailsView ? (
        <Modal
          title="FBA comparison details"
          onClose={() => setDetailsView(null)}
        >
          <DetectionDetails view={detailsView} />
        </Modal>
      ) : null}
    </main>
  );
}
