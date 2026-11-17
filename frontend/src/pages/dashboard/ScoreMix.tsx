import { Link } from 'react-router-dom';
import type { ApiError, ScoreLevelReport } from '../../api/client';
import { LEVEL_META, LEVEL_ORDER, formatCount, formatPercent } from '../../components/ScoreMeta';
import { t } from '../../i18n';
import { Panel, PanelError, PanelSkeleton } from './Panel';

/** Overall 4-level mix as a light CSS donut (no chart library on the Dashboard); full charts live in Reports. */
export function ScoreMix({
  levels,
  loading,
  error,
  onRetry,
}: {
  levels: ScoreLevelReport | null;
  loading: boolean;
  error: ApiError | null;
  onRetry: () => void;
}) {
  const title = t('Phổ điểm toàn kỳ thi');
  const subtitle = t('Tỷ lệ bài thi theo 4 mức điểm.');

  if (loading) {
    return (
      <Panel title={title} subtitle={subtitle}>
        <PanelSkeleton />
      </Panel>
    );
  }
  if (error || !levels) {
    return (
      <Panel title={title} subtitle={subtitle}>
        <PanelError message={t('Không thể tải biểu đồ thống kê')} onRetry={onRetry} retryLabel={t('Thử lại')} />
      </Panel>
    );
  }

  const counts = LEVEL_ORDER.map((lvl) => ({
    lvl,
    count: levels.subjects.reduce((acc, s) => acc + (s.counts[lvl] ?? 0), 0),
  }));
  const total = counts.reduce((acc, c) => acc + c.count, 0);
  const pctOf = (count: number) => (total > 0 ? (count / total) * 100 : 0);

  let from = 0;
  const stops = counts.map(({ lvl, count }) => {
    const pct = pctOf(count);
    const stop = `${LEVEL_META[lvl].color} ${from}% ${from + pct}%`;
    from += pct;
    return stop;
  });

  const summary = counts.map(({ lvl, count }) => `${LEVEL_META[lvl].rankLabel} ${formatPercent(pctOf(count))}`).join(', ');

  return (
    <Panel title={title} subtitle={subtitle}>
      <div className="flex flex-1 flex-col justify-between gap-5">
        <div className="flex flex-col items-center gap-5">
          <div
            role="img"
            aria-label={`${t('Biểu đồ tròn phổ điểm toàn kỳ thi')}: ${summary}`}
            className="relative h-32 w-32 shrink-0 rounded-full"
            style={{ background: `conic-gradient(${stops.join(', ')})` }}
          >
            <div className="absolute inset-[20%] flex flex-col items-center justify-center rounded-full bg-surface text-center">
              <span className="text-sm font-bold text-slate-900 tabular-nums">{formatCount(total)}</span>
              <span className="text-xs text-slate-600">{t('bài thi')}</span>
            </div>
          </div>

          <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {counts.map(({ lvl, count }) => (
              <li key={lvl} className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${LEVEL_META[lvl].dotClass}`} />
                  <span className="truncate font-medium text-slate-800">{LEVEL_META[lvl].rankLabel}</span>
                </div>
                <div className="flex items-baseline gap-1.5 pl-4">
                  <span className="font-semibold text-slate-900 tabular-nums">{formatPercent(pctOf(count))}</span>
                  <span className="text-xs whitespace-nowrap text-slate-500">({LEVEL_META[lvl].rangeLabel})</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <Link to="/reports" className="inline-block text-sm font-semibold text-brand-fg hover:underline">
          {t('Xem báo cáo đầy đủ')} →
        </Link>
      </div>

    </Panel>
  );
}
