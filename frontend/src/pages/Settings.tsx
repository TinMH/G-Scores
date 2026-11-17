import { useId, type ReactNode } from 'react';
import { t } from '../i18n';
import { Card } from '../components/Layout';
import { DEFAULT_GROUPS } from '../components/ScoreMeta';
import type { Lang } from '../i18n';
import { DEFAULT_SETTINGS, useSettings, type Settings, type TextSize, type ThemeMode } from '../settings';

/** Accessible radio group: real radio inputs, styled as selectable cards. */
function OptionGroup<T extends string | number>({
  legend,
  value,
  options,
  onChange,
  columns = 'sm:grid-cols-3',
}: {
  legend: string;
  value: T;
  options: { value: T; label: string; hint?: string; preview?: ReactNode }[];
  onChange: (v: T) => void;
  columns?: string;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-2.5 text-sm font-semibold text-slate-900">{legend}</legend>
      <div className={`grid grid-cols-1 gap-3 ${columns}`}>
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label
              key={String(o.value)}
              className={`relative cursor-pointer rounded-xl border p-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-fg ${
                checked
                  ? 'border-brand bg-indigo-50 ring-1 ring-brand'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name={name}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {o.preview}
              <span className="block text-sm font-semibold text-slate-900">{o.label}</span>
              {o.hint && <span className="mt-0.5 block text-xs text-slate-600">{o.hint}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Fixed-colour thumbnail so each option looks the same whichever theme is active. */
function ThemePreview({ mode }: { mode: ThemeMode }) {
  const light = { bg: '#f8fafc', card: '#ffffff', line: '#cbd5e1', accent: '#4338ca' };
  const dark = { bg: '#020617', card: '#0f172a', line: '#334155', accent: '#a5b4fc' };
  const Pane = ({ c }: { c: typeof light }) => (
    <div className="h-full w-full p-2" style={{ background: c.bg }}>
      <div className="h-full rounded-md p-1.5" style={{ background: c.card, border: `1px solid ${c.line}` }}>
        <div className="h-1.5 w-8 rounded-full" style={{ background: c.accent }} />
        <div className="mt-1.5 h-1 w-full rounded-full" style={{ background: c.line }} />
        <div className="mt-1 h-1 w-2/3 rounded-full" style={{ background: c.line }} />
      </div>
    </div>
  );
  return (
    <div className="mb-2.5 h-16 overflow-hidden rounded-lg border border-slate-200" aria-hidden="true">
      {mode === 'system' ? (
        <div className="flex h-full">
          <div className="w-1/2 overflow-hidden">
            <div className="h-full w-[200%]">
              <Pane c={light} />
            </div>
          </div>
          <div className="w-1/2 overflow-hidden">
            <div className="ml-[-100%] h-full w-[200%]">
              <Pane c={dark} />
            </div>
          </div>
        </div>
      ) : (
        <Pane c={mode === 'dark' ? dark : light} />
      )}
    </div>
  );
}

const THEME_OPTIONS: { value: ThemeMode; label: string; hint: string }[] = [
  { value: 'light', label: 'Sáng', hint: 'Nền sáng, chữ tối' },
  { value: 'dark', label: 'Tối', hint: 'Nền tối, dịu mắt khi dùng ban đêm' },
  { value: 'system', label: 'Theo hệ thống', hint: 'Tự đổi theo thiết lập của thiết bị' },
];

const TEXT_OPTIONS: { value: TextSize; label: string; hint: string; sample: string }[] = [
  { value: 'normal', label: 'Chuẩn', hint: '16 px', sample: 'text-base' },
  { value: 'large', label: 'Lớn', hint: '18 px, dễ đọc hơn', sample: 'text-xl' },
];

const LIMIT_OPTIONS = [10, 20, 50] as const;

export function SettingsPage() {
  const { settings, update, reset, resolvedTheme } = useSettings();
  const isDefault = (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).every(
    (k) => settings[k] === DEFAULT_SETTINGS[k],
  );

  const selectClass =
    'h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-brand focus:bg-surface';

  return (
    <>
      <Card title={t("Ngôn ngữ")} subtitle={t("Chọn ngôn ngữ hiển thị. Số liệu cũng đổi theo định dạng của ngôn ngữ đó.")}>
        <OptionGroup<Lang>
          legend={t("Ngôn ngữ hiển thị")}
          value={settings.language}
          onChange={(language) => update({ language })}
          columns="sm:grid-cols-2"
          options={[
            // Language names are shown in their own language on purpose, so they stay findable if you pick the wrong one.
            { value: 'vi', label: 'Tiếng Việt', hint: 'Vietnamese · 1.061.605' },
            { value: 'en', label: 'English', hint: 'Tiếng Anh · 1,061,605' },
          ]}
        />
      </Card>

      <Card
        title={t("Giao diện")}
        subtitle={
          settings.theme === 'system'
            ? resolvedTheme === 'dark'
              ? t("Đang theo thiết bị: hiển thị chế độ tối.")
              : t("Đang theo thiết bị: hiển thị chế độ sáng.")
            : t("Áp dụng ngay cho toàn bộ ứng dụng.")
        }
      >
        <div className="space-y-6">
          <OptionGroup
            legend={t("Chế độ màu")}
            value={settings.theme}
            onChange={(theme) => update({ theme })}
            options={THEME_OPTIONS.map((o) => ({ value: o.value, label: t(o.label), hint: t(o.hint), preview: <ThemePreview mode={o.value} /> }))}
          />

          <OptionGroup
            legend={t("Cỡ chữ")}
            value={settings.textSize}
            onChange={(textSize) => update({ textSize })}
            columns="sm:grid-cols-2"
            options={TEXT_OPTIONS.map((o) => ({
              value: o.value,
              label: t(o.label),
              hint: t(o.hint),
              preview: (
                <span className={`mb-1 block font-semibold text-slate-900 ${o.sample}`} aria-hidden="true">
                  Aa
                </span>
              ),
            }))}
          />
        </div>
      </Card>

      <Card title={t("Tổng quan")} subtitle={t("Lựa chọn hiển thị khi bạn mở trang Tổng quan.")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="default-group" className="mb-1.5 block text-sm font-semibold text-slate-900">
              {t("Khối mặc định")}
            </label>
            <select
              id="default-group"
              value={settings.defaultGroup}
              onChange={(e) => update({ defaultGroup: e.target.value })}
              className={selectClass}
            >
              {DEFAULT_GROUPS.map((g) => (
                <option key={g.code} value={g.code}>
                  {t(g.name)} ({g.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="default-limit" className="mb-1.5 block text-sm font-semibold text-slate-900">
              {t("Số thí sinh hiển thị")}
            </label>
            <select
              id="default-limit"
              value={settings.defaultLimit}
              onChange={(e) => update({ defaultLimit: Number(e.target.value) as Settings['defaultLimit'] })}
              className={selectClass}
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  Top {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">{t("Cài đặt được lưu tự động trên trình duyệt này.")}</p>
        <button
          type="button"
          onClick={reset}
          disabled={isDefault}
          className="h-10 rounded-lg border border-slate-200 bg-surface px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("Khôi phục mặc định")}
        </button>
      </div>
    </>
  );
}
