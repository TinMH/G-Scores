import { locale, t } from '../i18n';
import type { GroupInfo, ScoreLevel } from '../api/client';

export interface LevelStyle {
  level: ScoreLevel;
  rangeLabel: string;
  rankLabel: string;
  color: string;
  badgeClass: string;
  dotClass: string;
  barClass: string;
  borderLeftClass: string;
  softBgClass: string;
}

export const LEVEL_ORDER: ScoreLevel[] = ['excellent', 'good', 'average', 'poor'];

export const LEVEL_META: Record<ScoreLevel, LevelStyle> = {
  excellent: {
    level: 'excellent',
    rangeLabel: '≥ 8',
    get rankLabel() {
      return t('Giỏi');
    },
    color: '#10b981',
    badgeClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
    dotClass: 'bg-level-excellent',
    barClass: 'bg-level-excellent',
    borderLeftClass: 'border-l-emerald-500',
    softBgClass: 'bg-emerald-50/60',
  },
  good: {
    level: 'good',
    rangeLabel: '6 – <8',
    get rankLabel() {
      return t('Khá');
    },
    color: '#3b82f6',
    badgeClass: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
    dotClass: 'bg-level-good',
    barClass: 'bg-level-good',
    borderLeftClass: 'border-l-blue-500',
    softBgClass: 'bg-blue-50/60',
  },
  average: {
    level: 'average',
    rangeLabel: '4 – <6',
    get rankLabel() {
      return t('Trung bình');
    },
    color: '#f59e0b',
    badgeClass: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/25',
    dotClass: 'bg-level-average',
    barClass: 'bg-level-average',
    borderLeftClass: 'border-l-amber-500',
    softBgClass: 'bg-amber-50/60',
  },
  poor: {
    level: 'poor',
    rangeLabel: '< 4',
    get rankLabel() {
      return t('Yếu');
    },
    color: '#f43f5e',
    badgeClass: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20',
    dotClass: 'bg-level-poor',
    barClass: 'bg-level-poor',
    borderLeftClass: 'border-l-rose-500',
    softBgClass: 'bg-rose-50/60',
  },
};

export const CATEGORY_LABELS: Record<string, string> = {
  core: 'Môn bắt buộc',
  natural_science: 'Tổ hợp KHTN',
  social_science: 'Tổ hợp KHXH',
};

export const SUBJECT_NAMES: Record<string, string> = {
  toan: 'Toán',
  ngu_van: 'Ngữ văn',
  ngoai_ngu: 'Ngoại ngữ',
  vat_li: 'Vật lí',
  hoa_hoc: 'Hoá học',
  sinh_hoc: 'Sinh học',
  lich_su: 'Lịch sử',
  dia_li: 'Địa lí',
  gdcd: 'GDCD',
};

export const DEFAULT_GROUPS: GroupInfo[] = [
  { code: 'A00', name: 'Khối A', subjects: ['toan', 'vat_li', 'hoa_hoc'] },
  { code: 'A01', name: 'Khối A1', subjects: ['toan', 'vat_li', 'ngoai_ngu'] },
  { code: 'B00', name: 'Khối B', subjects: ['toan', 'hoa_hoc', 'sinh_hoc'] },
  { code: 'C00', name: 'Khối C', subjects: ['ngu_van', 'lich_su', 'dia_li'] },
  { code: 'D01', name: 'Khối D', subjects: ['toan', 'ngu_van', 'ngoai_ngu'] },
];

export function classifyClientScore(score: number): ScoreLevel {
  if (score >= 8) return 'excellent';
  if (score >= 6) return 'good';
  if (score >= 4) return 'average';
  return 'poor';
}

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return '—';
  return score.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Vietnamese decimal comma, e.g. 27,7% */
export function formatPercent(pct: number, digits = 1): string {
  const n = pct.toLocaleString(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${n}%`;
}

/** Axis ticks: 900K, 1,2M */
export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString(locale(), { maximumFractionDigits: 1 })}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

export function formatCount(n: number): string {
  return n.toLocaleString(locale());
}

export function subjectName(code: string): string {
  return t(SUBJECT_NAMES[code] ?? code);
}

export function ScoreLevelBadge({ level, showRange = false }: { level: ScoreLevel | null; showRange?: boolean }) {
  if (!level) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
        {t('Không dự thi')}
      </span>
    );
  }
  const meta = LEVEL_META[level];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
      {showRange ? `${meta.rankLabel} (${meta.rangeLabel})` : meta.rankLabel}
    </span>
  );
}

export function ScoreLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
      {LEVEL_ORDER.map((lvl) => {
        const meta = LEVEL_META[lvl];
        return (
          <span key={lvl} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`} />
            <span className="font-semibold text-slate-700">{meta.rankLabel}</span>
            <span className="text-slate-500">({meta.rangeLabel})</span>
          </span>
        );
      })}
    </div>
  );
}

export function categoryLabel(category: string): string {
  return t(CATEGORY_LABELS[category] ?? category);
}
