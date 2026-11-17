import { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError, api, type GroupInfo, type GroupRanking } from '../../api/client';
import { Card } from '../../components/Layout';
import { Pagination } from '../../components/Pagination';
import { useSettings } from '../../settings';
import {
  DEFAULT_GROUPS,
  LEVEL_META,
  classifyClientScore,
  formatScore,
  subjectName,
} from '../../components/ScoreMeta';

const LIMIT_OPTIONS = [10, 20, 50] as const;
const PAGE_SIZE = 10;

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="keep-light inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 text-xs font-extrabold text-slate-950 shadow-2xs">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="keep-light inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 text-xs font-extrabold text-slate-800">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="keep-light inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-200 to-amber-300 text-xs font-extrabold text-amber-950">
        3
      </span>
    );
  }
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
      {rank}
    </span>
  );
}

export function RankingSection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useSettings();

  const groupCode = (searchParams.get('group') ?? settings.defaultGroup).toUpperCase();
  const rawLimit = Number(searchParams.get('limit') ?? settings.defaultLimit);
  const limit = LIMIT_OPTIONS.includes(rawLimit as (typeof LIMIT_OPTIONS)[number]) ? rawLimit : settings.defaultLimit;

  const rawPage = Math.floor(Number(searchParams.get('page')));
  const page = Number.isFinite(rawPage) && rawPage > 1 ? rawPage : 1;
  const cardRef = useRef<HTMLDivElement>(null);

  const [groups, setGroups] = useState<GroupInfo[]>(DEFAULT_GROUPS);
  const [ranking, setRanking] = useState<GroupRanking | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api
      .subjects(controller.signal)
      .then((catalog) => {
        if (catalog.groups.length > 0) setGroups(catalog.groups);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    api
      .topGroup(groupCode, limit, controller.signal)
      .then((data) => {
        setRanking(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setRanking(null);
        setError(err instanceof ApiError ? err : new ApiError(500, t("Không thể tải bảng xếp hạng.")));
        setLoading(false);
      });

    return () => controller.abort();
  }, [groupCode, limit, reloadTick]);

  const updateParams = (nextGroup: string, nextLimit: number, nextPage = 1) => {
    const params: Record<string, string> = {};
    if (nextGroup !== settings.defaultGroup) params.group = nextGroup;
    if (nextLimit !== settings.defaultLimit) params.limit = String(nextLimit);
    if (nextPage > 1) params.page = String(nextPage);
    setSearchParams(params);
  };

  const goToPage = (nextPage: number) => {
    updateParams(groupCode, limit, nextPage);
    // Bring the table back into view (the pager sits below a long list, especially on phones).
    requestAnimationFrame(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      cardRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  };

  const activeGroupMeta =
    ranking?.group ?? groups.find((g) => g.code === groupCode) ?? DEFAULT_GROUPS[0];
  const students = ranking?.students ?? [];
  const totalPages = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages); // a stale ?page=9 falls back to the last page
  const pageStudents = students.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const cutoffStudent = students.at(-1) ?? null;
  const avgTopTotal =
    students.length > 0 ? students.reduce((acc, s) => acc + s.total, 0) / students.length : null;

  return (
    <>
      {/* Filter Toolbar */}
      <div className="mb-6 flex flex-col gap-3 surface p-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t("Chọn khối xét tuyển")}>
          {groups.map((g) => {
            const active = g.code === groupCode;
            return (
              <button
                key={g.code}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => updateParams(g.code, limit)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition sm:text-sm ${
                  active
                    ? 'bg-brand text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="font-bold">{g.code}</span>
                <span className={active ? 'font-normal text-white/80' : 'font-normal text-slate-500'}>
                  · {t(g.name)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 pt-2.5 xl:border-t-0 xl:pt-0">
          <span className="shrink-0 text-xs font-medium text-slate-500">{t("Tổ hợp:")}</span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-slate-700">
            {activeGroupMeta.subjects.map(subjectName).join(' + ')}
          </span>
          <select
            id="limit-select"
            aria-label={t("Số lượng hiển thị")}
            value={limit}
            onChange={(e) => updateParams(groupCode, Number(e.target.value))}
            className="ml-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-brand focus:bg-surface"
          >
            {LIMIT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                Top {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Ranking Table */}
      <div ref={cardRef} className="scroll-mt-20">
      <Card
        title={t("Top {limit} thí sinh — {group} ({code})", { limit, group: t(activeGroupMeta.name), code: activeGroupMeta.code })}
        subtitle={t("Chọn một thí sinh để xem phiếu điểm chi tiết.")}
        action={
          !loading && !error && students.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600">
                {t("Trung bình top {limit}:", { limit })} <strong className="text-slate-900">{formatScore(avgTopTotal)}</strong>
              </span>
              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-600/15">
                {t("Điểm thứ {limit}:", { limit })} <strong>{cutoffStudent ? formatScore(cutoffStudent.total) : '—'}</strong>
              </span>
            </div>
          ) : undefined
        }
      >
        {loading && (
          <div className="space-y-2.5" aria-busy="true">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="flex flex-col items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-5 text-rose-900 sm:flex-row sm:items-center"
          >
            <div>
              <p className="text-sm font-semibold">{t("Không thể tải bảng xếp hạng")}</p>
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

        {!loading && !error && ranking && (
          <>
          {/* Below xl: one card per student (two columns on tablets) instead of a clipped table */}
          <ol className="grid gap-2.5 md:grid-cols-2 xl:hidden">
            {pageStudents.map((student) => (
              <li key={student.sbd}>
                <Link
                  to={`/search?sbd=${student.sbd}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-surface p-3 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50"
                >
                  <RankBadge rank={student.rank} />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold text-slate-900">{student.sbd}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600 tabular-nums">
                      {ranking.group.subjects.map((code) => (
                        <span key={code}>
                          {subjectName(code)}{' '}
                          <strong className={student.scores[code] === 10 ? 'text-emerald-700' : 'text-slate-900'}>
                            {formatScore(student.scores[code])}
                          </strong>
                        </span>
                      ))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg leading-none font-bold text-brand-fg tabular-nums">{formatScore(student.total)}</p>
                    <p className="mt-1 text-xs text-slate-500">/ 30</p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>

          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/90 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  <th className="w-16 py-3 pr-3">{t("Hạng")}</th>
                  <th className="px-3 py-3">{t("Số báo danh")}</th>
                  {ranking.group.subjects.map((code) => (
                    <th key={code} className="px-3 py-3 text-right">
                      {subjectName(code)}
                    </th>
                  ))}
                  <th className="w-44 py-3 pl-4 text-right whitespace-nowrap">{t("Tổng điểm")}</th>
                  <th className="w-28 py-3 pl-4 text-right whitespace-nowrap">{t("Phiếu điểm")}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 tabular-nums">
                {pageStudents.map((student) => {
                  const pct = Math.min(100, Math.max(0, (student.total / 30) * 100));
                  return (
                    <tr
                      key={student.sbd}
                      className="group transition hover:bg-indigo-50/60"
                    >
                      <td className="py-3.5 pr-3">
                        <RankBadge rank={student.rank} />
                      </td>

                      <td className="px-3 py-3.5">
                        <Link
                          to={`/search?sbd=${student.sbd}`}
                          className="font-mono text-sm font-semibold text-slate-900 transition group-hover:text-brand-fg hover:underline"
                        >
                          {student.sbd}
                        </Link>
                      </td>

                      {ranking.group.subjects.map((code) => {
                        const val = student.scores[code];
                        const lvl = classifyClientScore(val);
                        const isPerfect = val === 10;
                        return (
                          <td key={code} className="px-3 py-3.5 text-right">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-sm ${
                                isPerfect
                                  ? 'bg-emerald-100 font-bold text-emerald-800'
                                  : 'font-medium text-slate-700'
                              }`}
                              title={LEVEL_META[lvl].rankLabel}
                            >
                              {formatScore(val)}
                            </span>
                          </td>
                        );
                      })}

                      <td className="py-3.5 pl-4 text-right">
                        <div className="inline-flex flex-col items-end gap-1">
                          <span className="text-sm font-extrabold text-brand-fg">
                            {formatScore(student.total)}
                          </span>
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                        <Link
                          to={`/search?sbd=${student.sbd}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-surface px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-slate-600 shadow-2xs transition hover:border-brand/40 hover:text-brand-fg"
                        >
                          {t("Xem chi tiết")}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            total={students.length}
            pageSize={PAGE_SIZE}
            onChange={goToPage}
          />
          </>
        )}
      </Card>
      </div>
    </>
  );
}
