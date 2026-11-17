import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { t } from '../i18n';

const icon = (paths: string[]) => (
  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    {paths.map((d) => (
      <path key={d} strokeLinecap="round" strokeLinejoin="round" d={d} />
    ))}
  </svg>
);

// Labels are Vietnamese source keys, translated when rendered.
const NAV = [
  {
    to: '/',
    label: 'Tổng quan',
    sub: 'Số liệu chung và top thí sinh',
    icon: icon(['M4 4h6.5v6.5H4z', 'M13.5 4H20v6.5h-6.5z', 'M4 13.5h6.5V20H4z', 'M13.5 13.5H20V20h-6.5z']),
  },
  {
    to: '/search',
    label: 'Tra cứu điểm thi',
    sub: 'Theo số báo danh',
    icon: icon(['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z', 'm20 20-3.8-3.8']),
  },
  {
    to: '/reports',
    label: 'Phổ điểm và báo cáo',
    sub: 'Biểu đồ và số liệu theo môn',
    icon: icon(['M3 3v18h18', 'M7 16v-5m4 5V7m4 9v-3m4 3V9']),
  },
  {
    to: '/settings',
    label: 'Cài đặt',
    sub: 'Giao diện và ngôn ngữ',
    icon: icon([
      'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
      'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
    ]),
  },
];

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Tổng quan',
    subtitle: 'Tổng quan kỳ thi THPT 2024 và top thí sinh điểm cao nhất theo khối.',
  },
  '/search': {
    title: 'Tra cứu điểm thi',
    subtitle: 'Xem phiếu điểm 9 môn và tổ hợp xét tuyển theo số báo danh.',
  },
  '/reports': {
    title: 'Phổ điểm và báo cáo',
    subtitle: 'Thống kê 4 mức điểm trên 1.061.605 thí sinh toàn quốc.',
  },
  '/settings': {
    title: 'Cài đặt',
    subtitle: 'Tuỳ chỉnh giao diện, ngôn ngữ và lựa chọn mặc định cho ứng dụng.',
  },
};

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-lift">
        G
      </div>
      <div className="leading-tight">
        <p className="text-lg font-bold tracking-tight text-slate-900">G-Scores</p>
        <p className="text-xs text-slate-500">{t("Điểm thi THPT 2024")}</p>
      </div>
    </div>
  );
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const [quickSbd, setQuickSbd] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const pageMeta = PAGE_TITLES[location.pathname] ?? PAGE_TITLES['/'];

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const handleQuickSearch = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = quickSbd.trim();
    if (!trimmed) return;
    navigate(`/search?sbd=${encodeURIComponent(trimmed)}`);
    setQuickSbd('');
  };

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
      >
        {t("Bỏ qua điều hướng")}
      </a>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-[2px] md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`z-40 flex w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-surface p-4 max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:shadow-2xl max-md:transition-transform max-md:duration-200 md:sticky md:top-0 md:h-dvh ${
          open ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
        }`}
      >
        <div>
          <div className="mb-8 flex items-center justify-between px-2 pt-1">
            <BrandMark />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("Đóng menu")}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav aria-label={t("Điều hướng chính")} className="flex flex-col gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 rounded-xl py-2.5 pr-3 pl-4 transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-brand-fg'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute top-2.5 bottom-2.5 left-0 w-1 rounded-r-full bg-brand" />}
                    <span className={isActive ? 'text-brand-fg' : 'text-slate-500'}>{n.icon}</span>
                    <span className="min-w-0">
                      <span className={`block text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{t(n.label)}</span>
                      <span className="mt-0.5 block text-xs font-normal text-slate-500">{t(n.sub)}</span>
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-surface/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 md:hidden">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-surface p-2 text-slate-700 hover:bg-slate-50"
              onClick={() => setOpen(true)}
              aria-label={t("Mở menu")}
              aria-expanded={open}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-base font-bold tracking-tight text-slate-900">G-Scores</span>
          </div>

          {!['/', '/search'].includes(location.pathname) && (
            <form onSubmit={handleQuickSearch} className="ml-auto" role="search">
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={quickSbd}
                onChange={(e) => setQuickSbd(e.target.value)}
                placeholder={t("Nhập số báo danh")}
                aria-label={t("Tra nhanh số báo danh")}
                className="h-9 w-40 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 tabular-nums transition-[width,background-color,border-color] outline-none placeholder:text-slate-500 focus:w-56 focus:border-brand focus:bg-surface sm:w-52 sm:focus:w-64"
              />
            </form>
          )}
        </header>

        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 lg:mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t(pageMeta.title)}</h1>
              <p className="mt-1.5 max-w-2xl text-sm text-slate-600 sm:text-base">{t(pageMeta.subtitle)}</p>
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export function Card({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="surface mb-6 p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
        </div>
        {action && <div className="min-w-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
