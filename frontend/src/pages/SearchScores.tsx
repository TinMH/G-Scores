import { useEffect, useState, type FormEvent } from 'react';
import { t } from '../i18n';
import { useSearchParams } from 'react-router-dom';
import { ApiError, api, type StudentResult } from '../api/client';
import { Card } from '../components/Layout';
import {
  categoryLabel,
  LEVEL_META,
  ScoreLegend,
  ScoreLevelBadge,
  formatScore,
  subjectName,
} from '../components/ScoreMeta';

const SBD_REGEX = /^\d{8}$/;

const SAMPLE_SBDS = [
  { sbd: '26020938', tag: 'Thủ khoa A00', detail: '29,60 điểm' },
  { sbd: '19000335', tag: 'Thủ khoa C00', detail: '29,75 điểm' },
  { sbd: '01000001', tag: 'Tổ hợp KHTN', detail: 'Hà Nội' },
  { sbd: '01000736', tag: 'Ngoại ngữ N6', detail: 'Tiếng Nhật' },
];

export function SearchScores() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sbdParam = searchParams.get('sbd')?.trim() ?? '';

  const [input, setInput] = useState(sbdParam);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [result, setResult] = useState<StudentResult | null>(null);
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    setInput(sbdParam);
    if (!sbdParam) {
      setValidationError(null);
      setApiError(null);
      setResult(null);
      setLoading(false);
      return;
    }

    if (!SBD_REGEX.test(sbdParam)) {
      setValidationError(t("Số báo danh phải gồm đúng 8 chữ số (ví dụ: 01000001)."));
      setApiError(null);
      setResult(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setValidationError(null);
    setApiError(null);
    setLoading(true);

    api
      .student(sbdParam, controller.signal)
      .then((data) => {
        setResult(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setResult(null);
        setApiError(err instanceof ApiError ? err : new ApiError(500, t("Đã xảy ra lỗi không xác định.")));
        setLoading(false);
      });

    return () => controller.abort();
  }, [sbdParam, reloadTick]);

  const triggerSearch = (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      setValidationError(t("Vui lòng nhập số báo danh để tra cứu."));
      return;
    }
    if (!SBD_REGEX.test(trimmed)) {
      setValidationError(t("Số báo danh phải gồm đúng 8 chữ số (ví dụ: 01000001)."));
      return;
    }
    setValidationError(null);
    if (trimmed === sbdParam) {
      setReloadTick((t) => t + 1);
    } else {
      setSearchParams({ sbd: trimmed });
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    triggerSearch(input);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if (validationError) {
      const trimmed = value.trim();
      if (!trimmed || SBD_REGEX.test(trimmed)) setValidationError(null);
    }
  };

  const takenScores = result?.scores.filter((s) => s.score !== null) ?? [];
  const avgScore =
    takenScores.length > 0
      ? takenScores.reduce((acc, s) => acc + (s.score ?? 0), 0) / takenScores.length
      : null;
  const bestGroup =
    result && result.groups.length > 0
      ? [...result.groups].sort((a, b) => b.total - a.total)[0]
      : null;
  const scoreMap = new Map(result?.scores.map((s) => [s.subject.code, s.score]) ?? []);

  return (
    <>
      {/* Balanced Search Card */}
      <section className="mb-6 surface p-5 md:p-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-center">
          <div className="xl:col-span-7">
            <h2 className="text-base font-bold text-slate-900 md:text-lg">{t("Tra cứu theo số báo danh")}</h2>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              {t("Nhập mã số báo danh 8 chữ số để trích xuất điểm thi từng môn và tổng điểm các khối xét tuyển.")}
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-4">
              <label htmlFor="sbd-input" className="sr-only">
                {t("Số báo danh (8 chữ số)")}
              </label>

              <div className="flex flex-col gap-2.5 sm:flex-row">
                <div className="relative flex-1">
                  <input
                    id="sbd-input"
                    name="sbd"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={16}
                    placeholder={t("Nhập 8 chữ số, ví dụ 26020938")}
                    value={input}
                    onChange={(e) => handleInputChange(e.target.value)}
                    aria-invalid={Boolean(validationError)}
                    aria-describedby={validationError ? 'sbd-error' : undefined}
                    className={`w-full rounded-xl border bg-slate-50/60 py-3 pr-10 pl-3.5 font-mono text-sm font-medium tracking-wide text-slate-900 transition outline-none focus:bg-surface ${
                      validationError
                        ? 'border-rose-400 ring-2 ring-rose-500/15 focus:border-rose-500'
                        : 'border-slate-200 focus:border-brand focus:ring-3 focus:ring-brand/15'
                    }`}
                  />
                  {input && (
                    <button
                      type="button"
                      onClick={() => {
                        setInput('');
                        setValidationError(null);
                        if (sbdParam) setSearchParams({});
                      }}
                      aria-label={t("Xoá số báo danh")}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {t("Đang tải...")}
                    </>
                  ) : (
                    t("Tra cứu ngay")
                  )}
                </button>
              </div>

              {validationError && (
                <p id="sbd-error" role="alert" className="mt-2 text-xs font-semibold text-rose-600 sm:text-sm">
                  {validationError}
                </p>
              )}
            </form>
          </div>

          {/* Right Quick Sample Grid */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 xl:col-span-5">
            <p className="mb-2.5 text-xs font-semibold tracking-wider text-slate-500 uppercase">
              {t("Số báo danh gợi ý")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SAMPLE_SBDS.map((sample) => {
                const active = sbdParam === sample.sbd;
                return (
                  <button
                    key={sample.sbd}
                    type="button"
                    onClick={() => {
                      setInput(sample.sbd);
                      triggerSearch(sample.sbd);
                    }}
                    className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition ${
                      active
                        ? 'border-brand bg-blue-50/70 ring-1 ring-brand/20'
                        : 'border-slate-200/80 bg-surface hover:border-slate-300 hover:shadow-2xs'
                    }`}
                  >
                    <span className="font-mono text-xs font-bold text-brand-fg">{sample.sbd}</span>
                    <span className="mt-0.5 text-xs font-medium text-slate-700">{t(sample.tag)}</span>
                    <span className="text-xs text-slate-500">{t(sample.detail)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4" aria-live="polite" aria-busy="true">
          <div className="h-28 animate-pulse rounded-2xl bg-surface" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }).map((_, idx) => (
              <div key={idx} className="h-28 animate-pulse rounded-2xl bg-surface" />
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && apiError && (
        <div
          role="alert"
          className={`mb-6 rounded-2xl border p-5 ${
            apiError.status === 404
              ? 'border-amber-200 bg-amber-50/80 text-amber-950'
              : apiError.status === 429
                ? 'border-orange-200 bg-orange-50/80 text-orange-950'
                : 'border-rose-200 bg-rose-50/80 text-rose-950'
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold">
                {apiError.status === 404
                  ? t("Không tìm thấy thí sinh")
                  : apiError.status === 429
                    ? t("Bạn đang tra cứu quá nhanh")
                    : apiError.status === 400
                      ? t("Số báo danh không hợp lệ")
                      : t("Không thể tải dữ liệu điểm thi")}
              </p>
              <p className="mt-1 text-sm opacity-90">{apiError.message}</p>
            </div>
            {apiError.status !== 404 && apiError.status !== 400 && (
              <button
                type="button"
                onClick={() => setReloadTick((t) => t + 1)}
                className="shrink-0 rounded-xl bg-surface px-4 py-2 text-xs font-semibold shadow-2xs ring-1 ring-slate-300 hover:bg-slate-50"
              >
                {t("Thử lại")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !apiError && !result && (
        <div className="rounded-2xl border border-dashed border-slate-300/80 bg-surface/70 px-6 py-14 text-center">
          <p className="text-sm font-bold text-slate-800">{t("Sẵn sàng tra cứu phiếu điểm")}</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500 sm:text-sm">
            {t("Nhập số báo danh 8 chữ số hoặc chọn một thí sinh tiêu biểu ở khung bên phải để xem kết quả chi tiết.")}
          </p>
        </div>
      )}

      {/* Student Score Transcript */}
      {!loading && !apiError && result && (
        <div className="space-y-6">
          {/* Official Student Banner */}
          <div className="overflow-hidden rounded-2xl bg-gradient-to-r keep-light from-brand-dark via-indigo-900 to-brand p-5 text-white shadow-md md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-amber-300 uppercase ring-1 ring-white/15">
                  {t("Phiếu điểm tốt nghiệp THPT 2024")}
                </div>
                <div className="mt-2.5 flex flex-wrap items-baseline gap-3">
                  <span className="font-mono text-3xl font-extrabold tracking-tight">
                    SBD {result.sbd}
                  </span>
                  <span className="rounded-lg bg-white/12 px-2.5 py-1 text-xs font-medium text-indigo-100">
                    {t("Ngoại ngữ:")} {result.foreignLanguage ? t(result.foreignLanguage) : t("Miễn thi / Không đăng ký")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                <div className="rounded-xl bg-white/10 px-3.5 py-2.5 ring-1 ring-white/10">
                  <p className="text-xs text-indigo-200">{t("Môn dự thi")}</p>
                  <p className="mt-0.5 text-lg font-bold tabular-nums">
                    {takenScores.length}
                    <span className="text-xs font-normal text-indigo-200">/{result.scores.length}</span>
                  </p>
                </div>
                <div className="rounded-xl bg-white/10 px-3.5 py-2.5 ring-1 ring-white/10">
                  <p className="text-xs text-indigo-200">{t("Điểm trung bình")}</p>
                  <p className="mt-0.5 text-lg font-bold tabular-nums">
                    {avgScore !== null ? formatScore(avgScore) : '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-400/15 px-3.5 py-2.5 ring-1 ring-amber-300/30">
                  <p className="text-xs text-amber-200">{t("Khối cao nhất")}</p>
                  <p className="mt-0.5 text-lg font-bold text-amber-300 tabular-nums">
                    {bestGroup ? `${formatScore(bestGroup.total)}` : '—'}
                    {bestGroup && (
                      <span className="ml-1 text-xs font-semibold text-amber-200">({bestGroup.code})</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 9 Subjects Breakdown */}
          <Card
            title={t("Điểm thi chi tiết theo môn")}
            subtitle={t("Mỗi môn được xếp vào một trong 4 mức điểm.")}
            action={<ScoreLegend />}
          >
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
              {result.scores.map(({ subject, score, level }) => {
                const taken = score !== null && level !== null;
                const pct = taken ? Math.min(100, Math.max(0, score * 10)) : 0;
                const extraLang =
                  subject.code === 'ngoai_ngu' && result.foreignLanguage ? ` · ${t(result.foreignLanguage)}` : '';

                return (
                  <div
                    key={subject.code}
                    className={`rounded-xl border p-4 transition ${
                      taken
                        ? `border-slate-200/90 border-l-4 ${LEVEL_META[level].borderLeftClass} bg-surface shadow-2xs`
                        : 'border-dashed border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`font-bold ${taken ? 'text-slate-900' : 'text-slate-500'}`}>
                          {t(subject.name)}
                          <span className="text-xs font-normal text-slate-500">{extraLang}</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          {categoryLabel(subject.category)}
                        </p>
                      </div>
                      <ScoreLevelBadge level={level} />
                    </div>

                    <div className="mt-3.5 flex items-baseline justify-between">
                      <span
                        className={`text-2xl font-extrabold tabular-nums ${
                          taken ? 'text-slate-900' : 'text-slate-400'
                        }`}
                        aria-hidden={!taken || undefined}
                      >
                        {formatScore(score)}
                      </span>
                      {taken && <span className="text-xs font-medium text-slate-500">/ 10</span>}
                    </div>

                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      {taken && (
                        <div
                          className={`h-full rounded-full ${LEVEL_META[level].barClass}`}
                          style={{ width: `${pct}%` }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Admission Group Combinations */}
          <Card
            title={t("Tổng điểm theo tổ hợp xét tuyển đại học")}
            subtitle={t("Tự động tính cho các khối thí sinh dự thi đầy đủ cả 3 môn thành phần.")}
          >
            {result.groups.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                {t("Thí sinh chưa có đủ điểm cả 3 môn cho các khối chuẩn (A00, A01, B00, C00, D01).")}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                {result.groups.map((group) => {
                  const isBest = bestGroup !== null && group.total === bestGroup.total;
                  const pct = Math.min(100, Math.max(0, (group.total / 30) * 100));
                  return (
                    <div
                      key={group.code}
                      className={`rounded-xl border p-4 transition ${
                        isBest
                          ? 'border-brand/35 bg-gradient-to-br from-blue-50/70 via-surface to-surface ring-1 ring-brand/15'
                          : 'border-slate-200/90 bg-surface'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-brand px-2.5 py-0.5 text-xs font-bold text-white">
                            {group.code}
                          </span>
                          <span className="text-sm font-bold text-slate-800">{t(group.name)}</span>
                        </div>
                        {isBest && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                            {t("Cao nhất")}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-baseline gap-1.5">
                        <span className="text-2xl font-extrabold text-brand-fg tabular-nums">
                          {formatScore(group.total)}
                        </span>
                        <span className="text-xs text-slate-500">{t("/ 30 điểm")}</span>
                      </div>

                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {group.subjects.map((code) => (
                          <span
                            key={code}
                            className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 tabular-nums"
                          >
                            {subjectName(code)}: <strong>{formatScore(scoreMap.get(code) ?? null)}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
