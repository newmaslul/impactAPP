import { CONNECTION_STATUS } from '../../health/healthTypes.js';

const META = {
  [CONNECTION_STATUS.NOT_CONNECTED]: { icon: '⭕', label: 'לא מחובר', pillClass: 'status-pill--ended' },
  [CONNECTION_STATUS.CONNECTING]: { icon: '⏳', label: 'מתחבר…', pillClass: 'status-pill--scheduled' },
  [CONNECTION_STATUS.CONNECTED]: { icon: '✅', label: 'מחובר', pillClass: 'status-pill--active' },
  [CONNECTION_STATUS.SYNCING]: { icon: '🔄', label: 'מסנכרן…', pillClass: 'status-pill--scheduled' },
  [CONNECTION_STATUS.ERROR]: { icon: '⚠️', label: 'שגיאת חיבור', pillClass: 'status-pill--ended' },
  [CONNECTION_STATUS.UNSUPPORTED]: { icon: '📲', label: 'לא נתמך בדפדפן', pillClass: 'status-pill--ended' },
};

/** Small status pill for a ConnectionStatus (src/health/healthTypes.js) — same status-pill classes every other card in the app already uses. */
export default function HealthStatus({ status }) {
  const meta = META[status] ?? META[CONNECTION_STATUS.NOT_CONNECTED];
  return (
    <span className={`status-pill ${meta.pillClass}`}>
      {meta.icon} {meta.label}
    </span>
  );
}
