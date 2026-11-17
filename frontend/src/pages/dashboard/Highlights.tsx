import { Link } from 'react-router-dom';
import type { ApiError, OverviewResponse } from '../../api/client';
import { formatCount, formatScore, subjectName } from '../../components/ScoreMeta';
import { t } from '../../i18n';
import { Panel, PanelError, PanelSkeleton } from './Panel';

interface Props {
  overview: OverviewResponse | null;
  loading: boolean;
  error: ApiError | null;
  onRetry: () => void;
}

function Row({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-xs text-slate-600">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
      </div>
      <p className="shrink-0 text-sm font-bold text-brand-fg tabular-nums">{value}</p>
    </li>
  );
}

function Unavailable({ title, subtitle, loading, onRetry }: { title: string; subtitle?: string; loading: boolean; onRetry: () => void }) {
  return (
    <Panel title={title} subtitle={subtitle}>
      {loading ? (
        <PanelSkeleton />
      ) : (
        <PanelError message={t('Không thể tải số liệu tổng quan')} onRetry={onRetry} retryLabel={t('Thử lại')} />
      )}
    </Panel>
  );
}

/** Subjects that stand out, from per-subject stats that only /overview provides. */
export function Highlights({ overview, loading, error, onRetry }: Props) {
  const title = t('Môn nổi bật');
  const subtitle = t('So sánh 9 môn theo điểm trung bình và số lượng.');
  if (loading || error || !overview) {
    return <Unavailable title={title} subtitle={subtitle} loading={loading} onRetry={onRetry} />;
  }

  const taken = overview.subjects.filter((s) => s.taken > 0 && s.average !== null);
  const byAvg = [...taken].sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
  const highest = byAvg[0];
  const lowest = byAvg.at(-1);
  const mostPerfect = [...taken].sort((a, b) => b.perfectScores - a.perfectScores)[0];
  const mostTaken = [...taken].sort((a, b) => b.taken - a.taken)[0];

  return (
    <Panel title={title} subtitle={subtitle}>
      <ul className="flex flex-1 flex-col justify-between gap-2.5">
        {highest && (
          <Row label={t('Điểm trung bình cao nhất')} name={subjectName(highest.code)} value={formatScore(highest.average)} />
        )}
        {lowest && (
          <Row label={t('Điểm trung bình thấp nhất')} name={subjectName(lowest.code)} value={formatScore(lowest.average)} />
        )}
        {mostPerfect && (
          <Row label={t('Nhiều điểm 10 nhất')} name={subjectName(mostPerfect.code)} value={formatCount(mostPerfect.perfectScores)} />
        )}
        {mostTaken && (
          <Row
            label={t('Nhiều thí sinh dự thi nhất')}
            name={subjectName(mostTaken.code)}
            value={formatCount(mostTaken.taken)}
          />
        )}
      </ul>
    </Panel>
  );
}

/** Highest total in each admission group. */
export function TopScorersByGroup({ overview, loading, error, onRetry }: Props) {
  const title = t('Thủ khoa theo khối');
  const subtitle = t('Mỗi khối một thí sinh có tổng điểm cao nhất.');
  if (loading || error || !overview) {
    return <Unavailable title={title} subtitle={subtitle} loading={loading} onRetry={onRetry} />;
  }

  return (
    <Panel title={title} subtitle={subtitle}>
      <ul className="grid gap-2.5 md:grid-cols-2 xl:flex xl:flex-1 xl:flex-col xl:justify-between">
        {overview.groupTopScorers.map((s) => (
          <li key={s.group.code}>
            <Link
              to={`/search?sbd=${s.sbd}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="rounded-md bg-brand px-1.5 py-0.5 text-xs font-bold text-white">{s.group.code}</span>
                <span className="font-mono text-sm font-semibold text-slate-900">{s.sbd}</span>
              </span>
              <span className="text-sm font-bold text-brand-fg tabular-nums">{formatScore(s.total)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
