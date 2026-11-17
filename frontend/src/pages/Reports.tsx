import { useEffect, useMemo, useState } from 'react';
import { t } from '../i18n';
import { useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ApiError, api, type ScoreLevel, type ScoreLevelReport } from '../api/client';
import { Card } from '../components/Layout';
import { useSettings } from '../settings';
import { useElementWidth } from '../useElementWidth';
import {
  categoryLabel,
  LEVEL_META,
  LEVEL_ORDER,
  ScoreLegend,
  formatCompact,
  formatCount,
  formatPercent,
} from '../components/ScoreMeta';

type ChartMode = 'count' | 'percent';

interface ChartDatum {
  code: string;
  name: string;
  category: string;
  total: number;
  count_excellent: number;
  count_good: number;
  count_average: number;
  count_poor: number;
  pct_excellent: number;
  pct_good: number;
  pct_average: number;
  pct_poor: number;
}

interface PieSliceDatum {
  level: ScoreLevel;
  name: string;
  range: string;
  count: number;
  pct: number;
  color: string;
}

// Bottom-to-top stack order so >= 8 (emerald) crowns the top of each subject bar.
const STACK_LEVELS: ScoreLevel[] = ['poor', 'average', 'good', 'excellent'];


function CustomBarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartDatum }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;

  return (
    <div className="min-w-60 rounded-xl border border-slate-200 bg-surface/98 p-3.5 text-xs shadow-xl">
      <div className="mb-2 flex items-baseline justify-between gap-4 border-b border-slate-100 pb-2">
        <span className="text-sm font-bold text-slate-900">{row.name}</span>
        <span className="text-slate-500 tabular-nums">{t("{n} bài thi", { n: formatCount(row.total) })}</span>
      </div>
      <div className="space-y-1.5">
        {LEVEL_ORDER.map((lvl) => {
          const meta = LEVEL_META[lvl];
          const count = row[`count_${lvl}`];
          const pct = row[`pct_${lvl}`];
          return (
            <div key={lvl} className="flex items-center justify-between gap-4 tabular-nums">
              <span className="inline-flex items-center gap-1.5 text-slate-700">
                <span className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`} />
                <span>
                  {meta.rankLabel} ({meta.rangeLabel})
                </span>
              </span>
              <span className="font-semibold text-slate-900">
                {formatCount(count)}{' '}
                <span className="font-normal text-slate-500">({formatPercent(pct, 1)})</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CustomPieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: PieSliceDatum }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const slice = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-200 bg-surface/98 px-3.5 py-2.5 text-xs shadow-xl tabular-nums">
      <div className="flex items-center gap-2 font-bold text-slate-900">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
        <span>
          {slice.name} ({slice.range})
        </span>
      </div>
      <p className="mt-1 text-slate-600">
        {t("Tỷ trọng:")} <strong className="text-slate-900">{formatPercent(slice.pct, 2)}</strong> ·{' '}
        {t("{n} bài thi", { n: formatCount(slice.count) })}
      </p>
    </div>
  );
}

function buildPieSlices(counts: Record<ScoreLevel, number>, total: number): PieSliceDatum[] {
  return LEVEL_ORDER.map((lvl) => {
    const c = counts[lvl] ?? 0;
    return {
      level: lvl,
      name: LEVEL_META[lvl].rankLabel,
      range: LEVEL_META[lvl].rangeLabel,
      count: c,
      pct: total > 0 ? (c / total) * 100 : 0,
      color: LEVEL_META[lvl].color,
    };
  });
}

export function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode: ChartMode = searchParams.get('view') === 'pie' ? 'percent' : 'count';
  const selectedSubject = searchParams.get('subject') ?? 'all';

  // Recharts takes literal colours, so pick a palette that matches the active theme.
  const { resolvedTheme } = useSettings();
  const chart =
    resolvedTheme === 'dark'
      ? { grid: '#1e293b', axis: '#334155', tick: '#e2e8f0', tickMuted: '#94a3b8', cursor: '#1e293b', sliceStroke: '#0f172a' }
      : { grid: '#e2e8f0', axis: '#cbd5e1', tick: '#334155', tickMuted: '#64748b', cursor: '#f1f5f9', sliceStroke: '#ffffff' };

  // Tilt the 9 subject labels when the chart itself is too narrow for them side by side (phones, and tablets where the
  // sidebar or the padding leaves ~650 px). Measured on the chart, not the screen, so it holds for any layout.
  const [chartRef, chartWidth] = useElementWidth<HTMLDivElement>();
  const narrow = chartWidth > 0 && chartWidth < 720;

  const [report, setReport] = useState<ScoreLevelReport | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    api
      .scoreLevels(controller.signal)
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof ApiError ? err : new ApiError(500, t("Không thể tải báo cáo thống kê.")));
        setLoading(false);
      });

    return () => controller.abort();
  }, [reloadTick]);

  const setView = (nextMode: ChartMode, nextSubject = selectedSubject) => {
    const next: Record<string, string> = {};
    if (nextMode === 'percent') {
      next.view = 'pie';
      if (nextSubject !== 'all') next.subject = nextSubject;
    }
    setSearchParams(next);
  };

  const { chartData, summary } = useMemo(() => {
    if (!report) return { chartData: [] as ChartDatum[], summary: null };

    const rows: ChartDatum[] = report.subjects.map((s) => {
      const cExc = s.counts.excellent ?? 0;
      const cGood = s.counts.good ?? 0;
      const cAvg = s.counts.average ?? 0;
      const cPoor = s.counts.poor ?? 0;
      const total = cExc + cGood + cAvg + cPoor;
      const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

      return {
        code: s.code,
        name: t(s.name),
        category: s.category,
        total,
        count_excellent: cExc,
        count_good: cGood,
        count_average: cAvg,
        count_poor: cPoor,
        pct_excellent: pct(cExc),
        pct_good: pct(cGood),
        pct_average: pct(cAvg),
        pct_poor: pct(cPoor),
      };
    });

    const totals = rows.reduce(
      (acc, r) => ({
        all: acc.all + r.total,
        excellent: acc.excellent + r.count_excellent,
        good: acc.good + r.count_good,
        average: acc.average + r.count_average,
        poor: acc.poor + r.count_poor,
      }),
      { all: 0, excellent: 0, good: 0, average: 0, poor: 0 },
    );

    const topExcellentSubject =
      rows.length > 0 ? [...rows].sort((a, b) => b.pct_excellent - a.pct_excellent)[0] : null;
    const highestPoorSubject =
      rows.length > 0 ? [...rows].sort((a, b) => b.pct_poor - a.pct_poor)[0] : null;

    return {
      chartData: rows,
      summary: {
        totals,
        excellentRate: totals.all > 0 ? (totals.excellent / totals.all) * 100 : 0,
        topExcellentSubject,
        highestPoorSubject,
      },
    };
  }, [report]);

  const activePieTarget = useMemo(() => {
    if (!summary) return null;
    const found = chartData.find((r) => r.code === selectedSubject);
    if (found) {
      return {
        code: found.code,
        title: t("Môn {name}", { name: found.name }),
        subtitle: categoryLabel(found.category),
        total: found.total,
        slices: buildPieSlices(
          {
            excellent: found.count_excellent,
            good: found.count_good,
            average: found.count_average,
            poor: found.count_poor,
          },
          found.total,
        ),
      };
    }
    return {
      code: 'all',
      title: t("Toàn kỳ thi (9 môn)"),
      subtitle: t("Tổng hợp tất cả bài thi"),
      total: summary.totals.all,
      slices: buildPieSlices(
        {
          excellent: summary.totals.excellent,
          good: summary.totals.good,
          average: summary.totals.average,
          poor: summary.totals.poor,
        },
        summary.totals.all,
      ),
    };
  }, [chartData, selectedSubject, summary]);

  return (
    <>
      {/* KPI Summary Strip */}
      {summary && !loading && !error && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-3.5 xl:grid-cols-4">
          <div className="surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500">{t("Tổng số bài thi")}</p>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">
              {formatCount(summary.totals.all)}
            </p>
            <p className="mt-1 text-xs text-slate-500">{t("Cộng dồn 9 môn thi")}</p>
          </div>

          <div className="surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500">{t("Tỷ lệ điểm ≥ 8 toàn kỳ thi")}</p>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-emerald-600 tabular-nums">
              {formatPercent(summary.excellentRate, 1)}
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              {t("{n} bài đạt từ 8 điểm trở lên", { n: formatCount(summary.totals.excellent) })}
            </p>
          </div>

          <div className="surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500">{t("Tỷ lệ điểm ≥ 8 cao nhất")}</p>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">
              {summary.topExcellentSubject?.name ?? '—'}
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-600 tabular-nums">
              {summary.topExcellentSubject
                ? `${formatPercent(summary.topExcellentSubject.pct_excellent, 1)} (${t("{n} bài", { n: formatCount(summary.topExcellentSubject.count_excellent) })})`
                : '—'}
            </p>
          </div>

          <div className="surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500">{t("Tỷ lệ điểm dưới 4 cao nhất")}</p>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">
              {summary.highestPoorSubject?.name ?? '—'}
            </p>
            <p className="mt-1 text-xs font-semibold text-rose-600 tabular-nums">
              {summary.highestPoorSubject
                ? `${formatPercent(summary.highestPoorSubject.pct_poor, 1)} (${t("{n} bài", { n: formatCount(summary.highestPoorSubject.count_poor) })})`
                : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Visualization Card */}
      <Card
        title={t("Biểu đồ phân bố 4 mức điểm theo môn")}
        subtitle={
          mode === 'count'
            ? t("Số bài thi ở từng mức điểm của 9 môn.")
            : t("Tỷ lệ bài thi ở từng mức điểm, cho toàn kỳ thi hoặc từng môn.")
        }
        action={
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/90 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setView('count')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                mode === 'count' ? 'bg-surface text-brand-fg shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t("Biểu đồ cột")}
            </button>
            <button
              type="button"
              onClick={() => setView('percent')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                mode === 'percent' ? 'bg-surface text-brand-fg shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t("Biểu đồ tròn")}
            </button>
          </div>
        }
      >
        {loading && <div className="h-96 animate-pulse rounded-xl bg-slate-100" aria-busy="true" />}

        {!loading && error && (
          <div
            role="alert"
            className="flex flex-col items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-5 text-rose-900 sm:flex-row sm:items-center"
          >
            <div>
              <p className="text-sm font-semibold">{t("Không thể tải biểu đồ thống kê")}</p>
              <p className="mt-0.5 text-sm opacity-90">{error.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setReloadTick((t) => t + 1)}
              className="rounded-lg bg-surface px-3.5 py-1.5 text-xs font-semibold shadow-2xs ring-1 ring-slate-300 hover:bg-slate-50"
            >
              {t("Thử lại")}
            </button>
          </div>
        )}

        {/* MODE 1: Stacked Bar Chart (Count) */}
        {!loading && !error && mode === 'count' && chartData.length > 0 && (
          <div className="space-y-4">
            <ScoreLegend />

            <div className="overflow-x-auto pb-2">
              <div ref={chartRef} className="h-96 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 12, right: narrow ? 4 : 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chart.grid} />
                    <XAxis
                      dataKey="name"
                      interval={0}
                      angle={narrow ? -45 : 0}
                      textAnchor={narrow ? 'end' : 'middle'}
                      height={narrow ? 64 : 30}
                      tick={{ fill: chart.tick, fontSize: 12, fontWeight: 600 }}
                      axisLine={{ stroke: chart.axis }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={formatCompact}
                      tick={{ fill: chart.tickMuted, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                    />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: chart.cursor }} />
                    {STACK_LEVELS.map((lvl, idx) => (
                      <Bar
                        key={lvl}
                        dataKey={`count_${lvl}`}
                        name={`${LEVEL_META[lvl].rankLabel} (${LEVEL_META[lvl].rangeLabel})`}
                        stackId="scores"
                        fill={LEVEL_META[lvl].color}
                        isAnimationActive={false}
                        maxBarSize={48}
                        radius={idx === STACK_LEVELS.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: 100% Pie / Donut Chart View */}
        {!loading && !error && mode === 'percent' && activePieTarget && (
          <div className="space-y-6">
            {/* Subject Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setView('percent', 'all')}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  activePieTarget.code === 'all'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {t("Toàn kỳ (9 môn)")}
              </button>
              {chartData.map((s) => {
                const active = activePieTarget.code === s.code;
                return (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => setView('percent', s.code)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'bg-brand text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                    }`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>

            {/* Spotlight Donut + 4-Level Breakdown */}
            <div className="grid grid-cols-1 items-center gap-6 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 xl:grid-cols-12">
              <div className="relative h-72 xl:col-span-5">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activePieTarget.slices}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={74}
                      outerRadius={116}
                      paddingAngle={2}
                      cornerRadius={6}
                      startAngle={90}
                      endAngle={-270}
                      isAnimationActive={false}
                    >
                      {activePieTarget.slices.map((slice) => (
                        <Cell key={slice.level} fill={slice.color} stroke={chart.sliceStroke} strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-semibold text-slate-500">{activePieTarget.title}</span>
                  <span className="mt-0.5 text-xl font-extrabold text-slate-900 tabular-nums">
                    {formatCount(activePieTarget.total)}
                  </span>
                  <span className="text-xs text-slate-500">{t("100% bài thi")}</span>
                </div>
              </div>

              <div className="space-y-3 xl:col-span-7">
                <div className="flex items-baseline justify-between border-b border-slate-200/80 pb-2.5">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{activePieTarget.title}</h3>
                    <p className="text-xs text-slate-500">{activePieTarget.subtitle}</p>
                  </div>
                  <span className="rounded-lg bg-surface px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 tabular-nums">
                    {t("Tổng:")} {formatCount(activePieTarget.total)}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {activePieTarget.slices.map((slice) => {
                    const meta = LEVEL_META[slice.level];
                    return (
                      <div
                        key={slice.level}
                        className="rounded-xl border border-slate-200/80 bg-surface p-3.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
                            <span className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`} />
                            {slice.name}
                          </span>
                          <span className="text-xs font-medium text-slate-500">{slice.range}</span>
                        </div>

                        <div className="mt-2 flex items-baseline justify-between tabular-nums">
                          <span className="text-xl font-extrabold text-slate-900">
                            {formatPercent(slice.pct, 1)}
                          </span>
                          <span className="text-xs text-slate-500">{t("{n} bài thi", { n: formatCount(slice.count) })}</span>
                        </div>

                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${meta.barClass}`}
                            style={{ width: `${slice.pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 9-Subject Mini Pie Charts Grid */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">
                  {t("So sánh tỷ lệ giữa 9 môn thi")}
                </h3>
                <span className="text-xs text-slate-500">{t("Chọn một môn để xem chi tiết")}</span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {chartData.map((row) => {
                  const selected = activePieTarget.code === row.code;
                  const miniSlices = buildPieSlices(
                    {
                      excellent: row.count_excellent,
                      good: row.count_good,
                      average: row.count_average,
                      poor: row.count_poor,
                    },
                    row.total,
                  );

                  return (
                    <button
                      key={row.code}
                      type="button"
                      onClick={() => setView('percent', row.code)}
                      className={`flex items-center gap-3.5 rounded-xl border p-3.5 text-left transition ${
                        selected
                          ? 'border-brand bg-blue-50/50 ring-1 ring-brand/25'
                          : 'border-slate-200/80 bg-surface hover:border-slate-300 hover:shadow-2xs'
                      }`}
                    >
                      <div className="shrink-0">
                        <PieChart width={76} height={76}>
                          <Pie
                            data={miniSlices}
                            dataKey="count"
                            cx={38}
                            cy={38}
                            innerRadius={19}
                            outerRadius={35}
                            paddingAngle={1.5}
                            startAngle={90}
                            endAngle={-270}
                            isAnimationActive={false}
                          >
                            {miniSlices.map((s) => (
                              <Cell key={s.level} fill={s.color} stroke="none" />
                            ))}
                          </Pie>
                        </PieChart>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-bold text-slate-900">{row.name}</span>
                          <span className="text-xs text-slate-500 tabular-nums">
                            {formatCompact(row.total)}
                          </span>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs tabular-nums">
                          {miniSlices.map((s) => (
                            <span key={s.level} className="inline-flex items-center gap-1 text-slate-600">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: s.color }}
                              />
                              <strong className="font-semibold text-slate-800">{formatPercent(s.pct, 1)}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Detailed Statistics Table with Inline Spark-Bar */}
      {!loading && !error && chartData.length > 0 && summary && (
        <Card
          title={t("Bảng số liệu chi tiết")}
          subtitle={t("Số bài thi và tỷ lệ ở từng mức điểm của mỗi môn.")}
        >
          {/* Below xl: one card per subject instead of a clipped 7-column table */}
          <ul className="grid gap-3 sm:grid-cols-2 xl:hidden">
            {chartData.map((row) => (
              <li key={row.code} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{row.name}</p>
                    <p className="text-xs text-slate-500">{categoryLabel(row.category)}</p>
                  </div>
                  <p className="text-right text-sm font-semibold text-slate-900 tabular-nums">
                    {formatCount(row.total)}
                    <span className="block text-xs font-normal text-slate-500">{t("bài thi")}</span>
                  </p>
                </div>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                  {LEVEL_ORDER.map((lvl) => (
                    <div key={lvl} className={LEVEL_META[lvl].barClass} style={{ width: `${row[`pct_${lvl}`]}%` }} />
                  ))}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm tabular-nums">
                  {LEVEL_ORDER.map((lvl) => (
                    <div key={lvl} className="flex items-center justify-between gap-2">
                      <dt className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span className={`h-2 w-2 rounded-full ${LEVEL_META[lvl].dotClass}`} />
                        {LEVEL_META[lvl].rangeLabel}
                      </dt>
                      <dd className="font-semibold text-slate-900">
                        {formatPercent(row[`pct_${lvl}`], 1)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  <th className="py-3 pr-4">{t("Môn thi")}</th>
                  <th className="px-3 py-3">{t("Tỷ trọng")}</th>
                  {LEVEL_ORDER.map((lvl) => (
                    <th key={lvl} className="px-3 py-3 text-right">
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${LEVEL_META[lvl].dotClass}`} />
                        {LEVEL_META[lvl].rangeLabel}
                      </span>
                    </th>
                  ))}
                  <th className="py-3 pl-4 text-right">{t("Tổng số bài thi")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {chartData.map((row) => (
                  <tr key={row.code} className="transition hover:bg-indigo-50/60">
                    <td className="py-3.5 pr-4">
                      <div className="font-bold text-slate-900">{row.name}</div>
                      <div className="text-xs text-slate-500">
                        {categoryLabel(row.category)}
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                        {LEVEL_ORDER.map((lvl) => (
                          <div
                            key={lvl}
                            className={LEVEL_META[lvl].barClass}
                            style={{ width: `${row[`pct_${lvl}`]}%` }}
                            title={`${LEVEL_META[lvl].rankLabel}: ${formatPercent(row[`pct_${lvl}`], 1)}`}
                          />
                        ))}
                      </div>
                    </td>
                    {LEVEL_ORDER.map((lvl) => {
                      const count = row[`count_${lvl}`];
                      const pct = row[`pct_${lvl}`];
                      return (
                        <td key={lvl} className="px-3 py-3.5 text-right">
                          <div className="font-semibold text-slate-800">{formatCount(count)}</div>
                          <div className="text-xs text-slate-500">{formatPercent(pct, 1)}</div>
                        </td>
                      );
                    })}
                    <td className="py-3.5 pl-4 text-right font-bold text-slate-900">
                      {formatCount(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-bold text-slate-900 tabular-nums">
                  <td className="py-3.5 pr-4" colSpan={2}>
                    {t("Tổng cộng 9 môn")}
                  </td>
                  {LEVEL_ORDER.map((lvl) => {
                    const count = summary.totals[lvl];
                    const pct = summary.totals.all > 0 ? (count / summary.totals.all) * 100 : 0;
                    return (
                      <td key={lvl} className="px-3 py-3.5 text-right">
                        <div>{formatCount(count)}</div>
                        <div className="text-xs font-medium text-slate-500">{formatPercent(pct, 1)}</div>
                      </td>
                    );
                  })}
                  <td className="py-3.5 pl-4 text-right text-brand-fg">
                    {formatCount(summary.totals.all)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
