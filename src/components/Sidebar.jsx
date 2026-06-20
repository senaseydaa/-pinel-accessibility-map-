import { Accessibility, Plus, List, Navigation, ShieldCheck, MapPin, User, Sun, Moon } from 'lucide-react';
import ReportsView from './views/ReportsView.jsx';
import RouteView from './views/RouteView.jsx';
import OfficialView from './views/OfficialView.jsx';
import InfraView from './views/InfraView.jsx';
import ProfileView from './views/ProfileView.jsx';

const VIEWS = [
  { key: 'reports', label: 'Bildirimler', Icon: List },
  { key: 'route', label: 'Rota', Icon: Navigation },
  { key: 'official', label: 'Resmî durum', Icon: ShieldCheck },
  { key: 'altyapi', label: 'Altyapı', Icon: MapPin },
  { key: 'profile', label: 'Profil', Icon: User },
];

// Dikey rail (masaüstü) ikon düğmesi
function RailBtn({ Icon, label, active, accent, onClick }) {
  const base = 'relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors';
  const style = accent
    ? `${active ? 'bg-ramp text-white' : 'bg-brand text-white hover:bg-brand-hover'}`
    : active
      ? 'bg-brand/10 text-brand'
      : 'text-muted hover:bg-surface-2 hover:text-ink';
  return (
    <button type="button" onClick={onClick} className={`${base} ${style}`} title={label} aria-label={label} aria-pressed={active}>
      <Icon size={20} aria-hidden="true" />
    </button>
  );
}

// Yatay sekme (mobil) düğmesi
function TabBtn({ Icon, label, active, accent, onClick }) {
  const style = accent
    ? `${active ? 'bg-ramp text-white' : 'bg-brand text-white'}`
    : active
      ? 'bg-brand/10 text-brand'
      : 'text-muted hover:bg-surface-2';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-[11px] font-semibold transition-colors ${style}`}
      aria-label={label}
      aria-pressed={active}
    >
      <Icon size={21} aria-hidden="true" />
      {label}
    </button>
  );
}

export default function Sidebar({
  activeView,
  onView,
  reportMode,
  onToggleReport,
  theme,
  onToggleTheme,
  sheetExpanded,
  onToggleSheet,
  panelCollapsed,
  ...rest
}) {
  const view = (
    <>
      {activeView === 'reports' && <ReportsView {...rest} />}
      {activeView === 'route' && (
        <RouteView
          start={rest.routeStart}
          end={rest.routeEnd}
          route={rest.route}
          routeStatus={rest.routeStatus}
          pickingFor={rest.pickingFor}
          onUseLocation={rest.onRouteUseLocation}
          onUseMeydan={rest.onRouteUseMeydan}
          onPickStart={rest.onRoutePickStart}
          onPickDest={rest.onRoutePickDest}
          onSetPreset={rest.onRouteSetPreset}
          onCompute={rest.onRouteCompute}
          onClear={rest.onRouteClear}
        />
      )}
      {activeView === 'official' && (
        <OfficialView
          official={rest.official}
          officialStatus={rest.officialStatus}
          onRefreshOfficial={rest.onRefreshOfficial}
          onFitOfficial={rest.onFitOfficial}
        />
      )}
      {activeView === 'altyapi' && (
        <InfraView
          infra={rest.infra}
          infraStatus={rest.infraStatus}
          onRefresh={rest.onRefreshInfra}
          showInfra={rest.showInfra}
          onToggleShow={rest.onToggleInfra}
          from={rest.infraFrom}
          onFocus={rest.onFocusInfra}
        />
      )}
      {activeView === 'profile' && <ProfileView theme={theme} onToggleTheme={onToggleTheme} points={rest.points} />}
    </>
  );

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row-reverse">
      {/* MASAÜSTÜ — dikey ikon rail (sağ kenarda; panel sola açılır) */}
      <nav className="hidden w-14 shrink-0 flex-col items-center gap-1.5 border-l border-border bg-surface py-3 lg:flex">
        <span className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white" title="PINel">
          <Accessibility size={20} aria-hidden="true" />
        </span>
        <RailBtn Icon={Plus} label="Engel bildir" accent active={reportMode} onClick={onToggleReport} />
        <div className="my-1 h-px w-6 bg-border" />
        {VIEWS.map((v) => (
          <RailBtn key={v.key} Icon={v.Icon} label={v.label} active={activeView === v.key} onClick={() => onView(v.key)} />
        ))}
        <div className="mt-auto" />
        <RailBtn
          Icon={theme === 'dark' ? Sun : Moon}
          label={theme === 'dark' ? 'Açık tema' : 'Koyu tema'}
          onClick={onToggleTheme}
        />
      </nav>

      {/* İÇERİK SÜTUNU */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* MOBİL — tutamaç + sekme şeridi */}
        <div className="shrink-0 lg:hidden">
          <button
            type="button"
            onClick={onToggleSheet}
            className="flex w-full justify-center pb-2 pt-3.5"
            aria-expanded={sheetExpanded}
            aria-label={sheetExpanded ? 'Paneli küçült' : 'Paneli genişlet'}
          >
            <span className="h-1.5 w-11 rounded-full bg-border" aria-hidden="true" />
          </button>
          <div className="flex items-stretch gap-2 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-0.5">
            <TabBtn Icon={Plus} label="Bildir" accent active={reportMode} onClick={onToggleReport} />
            {VIEWS.map((v) => (
              <TabBtn key={v.key} Icon={v.Icon} label={v.label === 'Bildirimler' ? 'Liste' : v.label === 'Resmî durum' ? 'Resmî' : v.label} active={activeView === v.key} onClick={() => onView(v.key)} />
            ))}
          </div>
        </div>

        {/* AKTİF GÖRÜNÜM */}
        <div
          className={`${sheetExpanded ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-1 flex-col ${
            panelCollapsed ? 'lg:hidden' : 'lg:flex'
          }`}
        >
          {view}
        </div>
      </div>
    </div>
  );
}
