import { Link } from 'react-router-dom';
import type { ApiError, OverviewResponse, ScoreLevelReport } from '../../api/client';
import { formatCount, formatPercent, formatScore, subjectName } from '../../components/ScoreMeta';
import { t } from '../../i18n';

function Kpi({ label, value, sub }: { label: string; value: string; sub: React.ReactNode }) {
  return (
    <div className="surface p-4">
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-slate-600 tabular-nums">{sub}</p>
    </div>
  );
}

/** Four headline numbers. Combines /overview (new) with /reports/score-levels (existing). */
export function KpiStrip({
  overview,
  levels,
  loading,
  error,
  onRetry,
}: {
  overview: OverviewResponse | null;
  levels: ScoreLevelReport | null;
  loading: boolean;
  error: ApiError | null;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-rose-900">
        <p className="text-sm font-semibold">{t('Không thể tải số liệu tổng quan')}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-surface px-3.5 py-1.5 text-xs font-semibold ring-1 ring-slate-300 hover:bg-slate-50"
        >
          {t('Thử lại')}
        </button>
      </div>
    );
  }

  const { totals, topScorer, subjects } = overview;
  const mostPerfect = [...subjects].sort((a, b) => b.perfectScores - a.perfectScores)[0];

  // ≥ 8 share over every paper, from the existing score-level report.
  const sum = (pick: (c: ScoreLevelReport['subjects'][number]['counts']) => number) =>
    levels?.subjects.reduce((acc, s) => acc + pick(s.counts), 0) ?? 0;
  const excellent = sum((c) => c.excellent);
  const all = sum((c) => c.excellent + c.good + c.average + c.poor);

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-3.5 xl:grid-cols-4">
      <Kpi
        label={t('Tổng số thí sinh')}
        value={formatCount(totals.candidates)}
        sub={t('{n} bài thi', { n: formatCount(totals.papers) })}
      />

      <Kpi
        label={t('Thủ khoa toàn quốc')}
        value={topScorer ? formatScore(topScorer.total) : '—'}
        sub={
          topScorer ? (
            <Link
              to={`/search?sbd=${topScorer.sbd}`}
              className="font-medium text-brand-fg underline-offset-2 hover:underline"
            >
              {t('SBD {sbd} · {group}', { sbd: topScorer.sbd, group: t(topScorer.group.name) })}
            </Link>
          ) : (
            '—'
          )
        }
      />

      <Kpi
        label={t('Số điểm 10')}
        value={formatCount(totals.perfectScores)}
        sub={
          mostPerfect && mostPerfect.perfectScores > 0
            ? t('Nhiều nhất: {name} ({n})', { name: subjectName(mostPerfect.code), n: formatCount(mostPerfect.perfectScores) })
            : '—'
        }
      />

      <Kpi
        label={t('Tỷ lệ điểm ≥ 8 toàn kỳ thi')}
        value={all > 0 ? formatPercent((excellent / all) * 100) : '—'}
        sub={levels ? t('{n} bài đạt từ 8 điểm trở lên', { n: formatCount(excellent) }) : '—'}
      />
    </div>
  );
}
