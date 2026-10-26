import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { todayLocalIso } from '../../../shared/lib/dates';
import {
  confirmDelete,
  notifyDailyResult,
  notifyDetectResult,
  notifyError,
  notifySuccess,
} from '../../../shared/lib/notify';
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
import { ImportAmazonReportsModal } from '../components/ImportAmazonReportsModal';
import {
  ProductForm,
  type ProductFormValues,
} from '../components/ProductForm';
import { latestDetectionToDetailsView } from '../lib/toDetailsView';
import {
  useCreateProduct,
  useDeleteProduct,
  useDetectProduct,
  useImportAmazonReports,
  useProductsList,
  useRunDaily,
  useUpdateProduct,
} from '../queries';
import { LIST_PAGE_SIZE } from '../../../shared/constants';
import type { Product } from '../types';

const PAGE_SIZE = LIST_PAGE_SIZE;

type ModalState =
  | { mode: 'closed' }
  | { mode: 'add' }
  | { mode: 'edit'; product: Product }
  | { mode: 'import' };

export function ProductsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [verdict, setVerdict] = useState<VerdictFilterValue>('');
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' });
  const [detailsView, setDetailsView] = useState<DetectionDetailsView | null>(
    null,
  );
  const [feeDate, setFeeDate] = useState(todayLocalIso);

  useEffect(() => {
    setPage(1);
  }, [verdict]);

  const productsQuery = useProductsList(
    page,
    PAGE_SIZE,
    verdict || undefined,
  );
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const detectMutation = useDetectProduct();
  const dailyMutation = useRunDaily();
  const importMutation = useImportAmazonReports();

  const formPending = createMutation.isPending || updateMutation.isPending;
  const formError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    null;

  function onFormSubmit(values: ProductFormValues) {
    if (modal.mode === 'add') {
      createMutation.mutate(
        { values, feeDate },
        {
          onSuccess: async ({ result }) => {
            setModal({ mode: 'closed' });
            if (result) {
              await notifyDetectResult(result);
            } else {
              await notifySuccess('Product saved', values.sku);
            }
          },
          onError: (err) => {
            void notifyError('Could not save product', (err as Error).message);
          },
        },
      );
    } else if (modal.mode === 'edit') {
      updateMutation.mutate(
        { id: modal.product.id, values, feeDate },
        {
          onSuccess: async ({ result }) => {
            setModal({ mode: 'closed' });
            if (result) {
              await notifyDetectResult(result);
            } else {
              await notifySuccess('Changes saved', values.sku);
            }
          },
          onError: (err) => {
            void notifyError('Could not update', (err as Error).message);
          },
        },
      );
    }
  }

  async function onDelete(p: Product) {
    if (!(await confirmDelete(p.sku))) return;
    deleteMutation.mutate(p.id, {
      onSuccess: () => {
        void notifySuccess('Deleted', p.sku);
      },
      onError: (err) => {
        void notifyError('Delete failed', (err as Error).message);
      },
    });
  }

  const items = productsQuery.data?.items ?? [];
  const total = productsQuery.data?.total ?? 0;

  return (
    <main>
      <div className="page-head">
        <div>
          <h1>Products</h1>
          <p className="lede">
            Import Amazon reports (Fee Preview + Settlement), or add SKUs
            manually. Always verify package dimensions after import.
          </p>
        </div>
        <div className="page-head-actions">
          <button
            type="button"
            className="btn-secondary"
            data-tooltip="Fee Preview, Settlement, Listings…"
            disabled={importMutation.isPending}
            onClick={() => setModal({ mode: 'import' })}
          >
            {importMutation.isPending ? 'Importing…' : 'Import products'}
          </button>
          <button type="button" onClick={() => setModal({ mode: 'add' })}>
            Add product
          </button>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Listing</h2>
          <div className="panel-filters">
            <VerdictFilter value={verdict} onChange={setVerdict} />
            <label className="inline">
              Fee date
              <input
                type="date"
                value={feeDate}
                onChange={(e) => setFeeDate(e.target.value)}
              />
            </label>
          </div>
        </div>

        {productsQuery.isLoading ? <p>Loading…</p> : null}
        {productsQuery.isError ? (
          <p className="error">{(productsQuery.error as Error).message}</p>
        ) : null}

        {!productsQuery.isLoading && items.length === 0 ? (
          <p className="hint">
            {verdict
              ? `No products with status “${verdict}”.`
              : 'No products yet. Click “Add product”.'}
          </p>
        ) : (
          <div className="table-wrap list-table">
            <table>
              <thead>
                <tr>
                  <th className="left">SKU</th>
                  <th className="left">ASIN</th>
                  <th className="left" title="Package dimensions and unit weight">
                    Size
                  </th>
                  <th>Price</th>
                  <th title="Last FBA fee charged">Charged</th>
                  <th title="Calculated FBA fee from rate card">Expected</th>
                  <th>Status</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr
                    key={p.id}
                    className={p.active ? undefined : 'row-inactive'}
                  >
                    <td className="left sku-cell">
                      <strong className="sku-clip" title={p.sku}>
                        {p.sku}
                      </strong>
                      {p.title ? (
                        <div className="muted-sm title-clip" title={p.title}>
                          {p.title}
                        </div>
                      ) : null}
                    </td>
                    <td className="left muted-sm mono">{p.asin ?? '—'}</td>
                    <td
                      className="left size-cell muted-sm"
                      title={`${p.lengthIn}×${p.widthIn}×${p.heightIn} in · ${p.unitWeightOz} oz`}
                    >
                      {p.lengthIn}×{p.widthIn}×{p.heightIn} in · {p.unitWeightOz}{' '}
                      oz
                    </td>
                    <td>${p.sellingPriceUsd.toFixed(2)}</td>
                    <td>
                      {p.lastChargedFeeUsd != null
                        ? `$${p.lastChargedFeeUsd.toFixed(2)}`
                        : '—'}
                    </td>
                    <td>
                      {p.latestDetection
                        ? `$${p.latestDetection.expectedFeeUsd.toFixed(2)}`
                        : '—'}
                    </td>
                    <td>
                      {p.latestDetection ? (
                        <span className={`badge ${p.latestDetection.verdict}`}>
                          {p.latestDetection.verdict}
                        </span>
                      ) : (
                        <span className="muted-sm">No run</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`active-dot ${p.active ? 'on' : 'off'}`}
                        title={p.active ? 'Active' : 'Inactive'}
                      >
                        {p.active ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <IconButton
                          label="View details"
                          disabled={!p.latestDetection}
                          onClick={() => {
                            if (!p.latestDetection) return;
                            setDetailsView(
                              latestDetectionToDetailsView(
                                p,
                                p.latestDetection,
                              ),
                            );
                          }}
                        >
                          {Icons.details}
                        </IconButton>
                        <IconButton
                          label="Edit"
                          onClick={() => setModal({ mode: 'edit', product: p })}
                        >
                          {Icons.edit}
                        </IconButton>
                        <IconButton
                          label="Detect"
                          disabled={
                            p.lastChargedFeeUsd == null ||
                            detectMutation.isPending
                          }
                          onClick={() =>
                            detectMutation.mutate(
                              { product: p, feeDate },
                              {
                                onSuccess: (result) => {
                                  void notifyDetectResult(result);
                                },
                                onError: (err) => {
                                  void notifyError(
                                    'Detect failed',
                                    (err as Error).message,
                                  );
                                },
                              },
                            )
                          }
                        >
                          {Icons.detect}
                        </IconButton>
                        <IconButton
                          label="History"
                          onClick={() =>
                            void navigate({
                              to: '/history',
                              search: { productId: p.id },
                            })
                          }
                        >
                          {Icons.history}
                        </IconButton>
                        <IconButton
                          label="Delete"
                          danger
                          disabled={deleteMutation.isPending}
                          onClick={() => void onDelete(p)}
                        >
                          {Icons.trash}
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

        <div className="toolbar">
          <button
            type="button"
            className="btn-secondary"
            disabled={dailyMutation.isPending}
            onClick={() =>
              dailyMutation.mutate(feeDate, {
                onSuccess: (res) => {
                  let correct = 0;
                  let overcharged = 0;
                  let undercharged = 0;
                  for (const r of res.ran) {
                    if (r.verdict === 'correct') correct += 1;
                    else if (r.verdict === 'overcharged') overcharged += 1;
                    else undercharged += 1;
                  }
                  void notifyDailyResult({
                    ran: res.ran.length,
                    skipped: res.skipped.length,
                    season: res.season,
                    correct,
                    overcharged,
                    undercharged,
                  });
                },
                onError: (err) => {
                  void notifyError('Daily run failed', (err as Error).message);
                },
              })
            }
          >
            {dailyMutation.isPending
              ? 'Running…'
              : 'Run daily (all active with charged fee)'}
          </button>
        </div>
      </section>

      {modal.mode === 'import' ? (
        <ImportAmazonReportsModal
          pending={importMutation.isPending}
          onClose={() => setModal({ mode: 'closed' })}
          onImport={async (files) => {
            const res = await importMutation.mutateAsync({
              files,
              feeDate,
            });
            setModal({ mode: 'closed' });
            await notifySuccess(
              'Import complete',
              [
                `Fee Preview: ${res.feePreview.created} created · ${res.feePreview.updated} updated · ${res.feePreview.unchanged} unchanged`,
                `Settlement: ${res.settlement.skusUpdated} charged · ${res.settlement.unchanged} unchanged`,
                `Merchant: ${res.merchant.enriched} enriched · ${res.merchant.unchanged} unchanged`,
                `Detect: ${res.detect.ran} ran · ${res.detect.skipped} skipped`,
              ]
                .filter(Boolean)
                .join('\n'),
            );
            return res;
          }}
        />
      ) : null}

      {modal.mode === 'add' || modal.mode === 'edit' ? (
        <Modal
          title={
            modal.mode === 'add' ? 'Add product' : `Edit ${modal.product.sku}`
          }
          onClose={() => setModal({ mode: 'closed' })}
        >
          <ProductForm
            key={modal.mode === 'edit' ? modal.product.id : 'add'}
            initial={modal.mode === 'edit' ? modal.product : null}
            submitLabel={modal.mode === 'add' ? 'Save product' : 'Save changes'}
            pending={formPending}
            error={formError}
            onSubmit={onFormSubmit}
            onCancel={() => setModal({ mode: 'closed' })}
          />
        </Modal>
      ) : null}

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
