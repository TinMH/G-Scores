import { t } from '../i18n';
import { formatCount } from './ScoreMeta';

/** 1 … 4 5 6 … 12: always shows first/last and a window around the current page. */
function pageItems(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const items: (number | 'gap')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) items.push('gap');
  for (let p = start; p <= end; p++) items.push(p);
  if (end < totalPages - 1) items.push('gap');
  items.push(totalPages);
  return items;
}

const base =
  'inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-2.5 text-sm font-semibold tabular-nums transition-colors';

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label={t('Phân trang')}
      className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row"
    >
      <p className="text-sm text-slate-600 tabular-nums" aria-live="polite">
        {t('Hiển thị {from}–{to} trên {total} thí sinh', {
          from: formatCount(from),
          to: formatCount(to),
          total: formatCount(total),
        })}
      </p>

      <ul className="flex items-center gap-1.5">
        <li>
          <button
            type="button"
            onClick={() => onChange(page - 1)}
            disabled={page === 1}
            aria-label={t('Trang trước')}
            className={`${base} border-slate-200 bg-surface text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface`}
          >
            <span aria-hidden="true">‹</span>
            <span className="ml-1.5 hidden sm:inline">{t('Trước')}</span>
          </button>
        </li>

        {pageItems(page, totalPages).map((item, i) =>
          item === 'gap' ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-slate-500">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                onClick={() => onChange(item)}
                aria-label={t('Trang {page}', { page: item })}
                aria-current={item === page ? 'page' : undefined}
                className={`${base} ${
                  item === page
                    ? 'border-brand bg-brand text-white'
                    : 'border-slate-200 bg-surface text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item}
              </button>
            </li>
          ),
        )}

        <li>
          <button
            type="button"
            onClick={() => onChange(page + 1)}
            disabled={page === totalPages}
            aria-label={t('Trang sau')}
            className={`${base} border-slate-200 bg-surface text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface`}
          >
            <span className="mr-1.5 hidden sm:inline">{t('Sau')}</span>
            <span aria-hidden="true">›</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
