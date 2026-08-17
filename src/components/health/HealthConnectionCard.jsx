import { useState } from 'react';
import { useNativeHealthAdapter } from '../../lib/healthAdapters/nativeHealthAdapter.js';
import { getHealthConnectionStatus, connectHealth, disconnectHealth, getTodaySteps } from '../../health/healthService.js';
import { syncHealthData, deleteHealthData } from '../../health/healthSync.js';
import { CONNECTION_STATUS } from '../../health/healthTypes.js';
import HealthStatus from './HealthStatus.jsx';
import SyncProgress from './SyncProgress.jsx';

// Represents the NATIVE health connection specifically (HealthKit/Health
// Connect via useNativeHealthAdapter) — deliberately separate from the
// general "whichever source is currently feeding the score" concept
// useActivitySync.js handles for the step tile elsewhere on the
// dashboard. This keeps the existing, working web accelerometer pedometer
// (PedometerBanner.jsx + usePedometer.js) completely untouched: on a
// plain website this card just honestly shows "not supported in the
// browser, open the mobile app," without replacing or hiding the
// step count the pedometer already provides today.
export default function HealthConnectionCard() {
  const adapter = useNativeHealthAdapter();
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [error, setError] = useState('');
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [disconnectNotice, setDisconnectNotice] = useState('');

  const status = getHealthConnectionStatus(adapter, { connecting, syncing });
  const steps = getTodaySteps(adapter);

  const handleConnect = async () => {
    setError('');
    setConnecting(true);
    try {
      await connectHealth(adapter);
    } catch (err) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    setError('');
    setSyncing(true);
    try {
      await syncHealthData(adapter);
      setLastSyncedAt(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleConfirmDisconnect = async () => {
    setError('');
    setDeleting(true);
    try {
      await deleteHealthData(adapter);
      setLastSyncedAt(null);
      setConfirmingDisconnect(false);
      setDisconnectNotice(disconnectHealth().instructions);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="card health-card">
      <div className="health-card__header">
        <p className="card__label">📱 אפליקציית הבריאות</p>
        <HealthStatus status={status} />
      </div>

      {status === CONNECTION_STATUS.UNSUPPORTED && (
        <p className="card__meta">
          יש לפתוח את IMPACT באפליקציית המובייל כדי להתחבר ל-Apple Health / Health Connect ולקבל ספירת צעדים מדויקת יותר.
        </p>
      )}

      {status === CONNECTION_STATUS.NOT_CONNECTED && (
        <>
          <p className="card__meta">חברו את IMPACT לנתוני הפעילות שלכם — לאחר החיבור נוכל לסנכרן את מספר הצעדים היומי שלכם.</p>
          <button type="button" className="btn-primary health-card__cta" onClick={handleConnect}>
            התחברו לאפליקציית הבריאות
          </button>
        </>
      )}

      {status === CONNECTION_STATUS.CONNECTING && <p className="card__meta">מתחברים…</p>}

      {status === CONNECTION_STATUS.ERROR && (
        <>
          <p className="card__meta">החיבור נכשל או שההרשאה נדחתה.</p>
          <button type="button" className="btn-ghost health-card__cta" onClick={handleConnect}>
            נסו שוב
          </button>
        </>
      )}

      {(status === CONNECTION_STATUS.CONNECTED || status === CONNECTION_STATUS.SYNCING) && (
        <>
          <p className="stat-big">
            {steps != null ? steps.toLocaleString('he-IL') : '—'}
            <span className="stat-big__unit">צעדים היום</span>
          </p>
          <SyncProgress syncing={status === CONNECTION_STATUS.SYNCING} lastSyncedAt={lastSyncedAt} />
          <button
            type="button"
            className="btn-ghost health-card__cta"
            onClick={handleSync}
            disabled={status === CONNECTION_STATUS.SYNCING}
          >
            {status === CONNECTION_STATUS.SYNCING ? 'מסנכרן…' : 'סנכרן עכשיו'}
          </button>

          {!confirmingDisconnect && !disconnectNotice && (
            <button type="button" className="link-btn health-card__disconnect" onClick={() => setConfirmingDisconnect(true)}>
              נתקו ומחקו את נתוני הבריאות שלי
            </button>
          )}

          {confirmingDisconnect && (
            <div className="health-card__confirm">
              <p className="card__meta">בטוחים? זה ימחק את כל היסטוריית הצעדים שנשמרה מאפליקציית הבריאות (לא ניתן לשחזר).</p>
              <div className="health-card__confirm-actions">
                <button type="button" className="btn-ghost" onClick={() => setConfirmingDisconnect(false)} disabled={deleting}>
                  ביטול
                </button>
                <button type="button" className="btn-primary" onClick={handleConfirmDisconnect} disabled={deleting}>
                  {deleting ? 'מוחקים…' : 'כן, מחקו'}
                </button>
              </div>
            </div>
          )}

          {disconnectNotice && <p className="card__meta">הנתונים נמחקו. {disconnectNotice}</p>}
        </>
      )}

      {error && <p className="form-error">{error}</p>}
    </section>
  );
}
