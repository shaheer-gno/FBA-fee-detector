import Swal from 'sweetalert2';
import type { AnalyzeResponse } from '../api/types';

const base = {
  confirmButtonColor: '#1f4d3a',
  cancelButtonColor: '#6b7280',
};

function verdictIcon(
  verdict: AnalyzeResponse['verdict'],
): 'success' | 'warning' | 'info' {
  if (verdict === 'correct') return 'success';
  if (verdict === 'overcharged') return 'warning';
  return 'info';
}

export async function notifySuccess(title: string, text?: string) {
  await Swal.fire({ ...base, icon: 'success', title, text });
}

export async function notifyError(title: string, text?: string) {
  await Swal.fire({ ...base, icon: 'error', title, text });
}

export async function notifyDetectResult(result: AnalyzeResponse) {
  const delta =
    (result.differenceUsd >= 0 ? '+' : '') +
    `$${result.differenceUsd.toFixed(2)}`;
  await Swal.fire({
    ...base,
    icon: verdictIcon(result.verdict),
    title: result.verdict.replaceAll('_', ' ').toUpperCase(),
    html: `
      <p style="margin:0 0 0.75rem;text-align:left">
        <strong>Expected</strong> $${result.expectedFeeUsd.toFixed(2)}
        · <strong>Charged</strong> $${result.chargedFeeUsd.toFixed(2)}
        · <strong>Δ</strong> ${delta}
      </p>
      <p style="margin:0;text-align:left;font-size:0.9rem;opacity:0.85">${result.explanation}</p>
    `,
  });
}

export async function notifyDailyResult(args: {
  ran: number;
  skipped: number;
  season: string;
  overcharged?: number;
  undercharged?: number;
  correct?: number;
}) {
  const parts = [
    `Ran <strong>${args.ran}</strong>`,
    `skipped <strong>${args.skipped}</strong>`,
    `season <strong>${args.season}</strong>`,
  ];
  if (args.correct != null) {
    parts.push(
      `correct ${args.correct} · over ${args.overcharged ?? 0} · under ${args.undercharged ?? 0}`,
    );
  }
  await Swal.fire({
    ...base,
    icon: 'success',
    title: 'Daily run complete',
    html: `<p style="margin:0">${parts.join(' · ')}</p>`,
  });
}

export async function confirmDelete(sku: string): Promise<boolean> {
  const res = await Swal.fire({
    ...base,
    icon: 'warning',
    title: 'Delete product?',
    text: `Remove ${sku}? This cannot be undone.`,
    showCancelButton: true,
    confirmButtonText: 'Delete',
    confirmButtonColor: '#b42318',
  });
  return res.isConfirmed;
}
