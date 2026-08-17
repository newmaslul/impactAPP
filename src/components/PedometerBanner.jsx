// Shown when the live device pedometer isn't running yet. Two states:
// 'idle' (never asked) and 'denied' (asked, refused) both get a real
// retry button — on iOS specifically, "denied" is very often not a
// deliberate decline but Safari's separate, global Settings toggle for
// motion access being off, which silently refuses every request (even a
// freshly-tapped one) until the person flips it — so the copy points
// directly at that setting instead of a vague "check your browser
// settings."
export default function PedometerBanner({ status, requestPermission }) {
  if (status !== 'idle' && status !== 'denied') return null;

  return (
    <section className="card pedometer-banner">
      <span className="pedometer-banner__icon" aria-hidden="true">📍</span>
      <div className="pedometer-banner__text">
        {status === 'denied' ? (
          <>
            <p className="pedometer-banner__title">הגישה למד הצעדים נחסמה</p>
            <p className="pedometer-banner__desc">
              באייפון: הגדרות ⟵ Safari ⟵ "גישה לתנועה ולכיוון" — ודאו שזה מופעל, ואז חזרו לכאן ולחצו נסה שוב.
              באנדרואיד: אפשרו גישה לחיישני תנועה בהגדרות האתר של הדפדפן.
            </p>
          </>
        ) : (
          <>
            <p className="pedometer-banner__title">מד הצעדים כבוי</p>
            <p className="pedometer-banner__desc">הפעילו כדי לספור את הצעדים שלכם היום ישירות מהטלפון.</p>
          </>
        )}
      </div>
      <button type="button" className="btn-primary pedometer-banner__cta" onClick={requestPermission}>
        {status === 'denied' ? 'נסה שוב' : 'הפעל מד צעדים'}
      </button>
    </section>
  );
}
