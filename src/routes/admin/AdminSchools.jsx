import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function AdminSchools() {
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolCode, setNewSchoolCode] = useState('');
  const [newSchoolQuota, setNewSchoolQuota] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newClassSchoolId, setNewClassSchoolId] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    api.adminListSchools().then(({ schools }) => {
      setSchools(schools);
      setNewClassSchoolId((prev) => prev || (schools[0] ? String(schools[0].id) : ''));
    });
    api.adminListClasses().then(({ classes }) => setClasses(classes));
  };

  useEffect(load, []);

  const handleAddSchool = async (e) => {
    e.preventDefault();
    if (!newSchoolName.trim() || !newSchoolCode.trim()) return;
    try {
      await api.adminCreateSchool({
        name: newSchoolName.trim(),
        code: newSchoolCode.trim(),
        studentQuota: newSchoolQuota.trim() ? Number(newSchoolQuota) : null,
      });
      setNewSchoolName('');
      setNewSchoolCode('');
      setNewSchoolQuota('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim() || !newClassSchoolId) return;
    try {
      await api.adminCreateClass({ name: newClassName.trim(), schoolId: Number(newClassSchoolId) });
      setNewClassName('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveSchool = async (id) => {
    try {
      await api.adminDeleteSchool(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveClass = async (id) => {
    try {
      await api.adminDeleteClass(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1 className="admin-page__title">בתי ספר וכיתות</h1>
      </div>

      {error && <p className="form-error">{error}</p>}

      <section className="card">
        <p className="card__label">בתי ספר</p>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>שם</th><th>קוד</th><th>נרשמים / מכסה</th><th></th></tr></thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id}>
                  <td className="admin-table__name">{s.name}</td>
                  <td dir="ltr">{s.code ?? '—'}</td>
                  <td>{s.registeredStudentCount ?? 0} / {s.student_quota ?? '∞'}</td>
                  <td><button type="button" className="link-btn link-btn--danger" onClick={() => handleRemoveSchool(s.id)}>הסר</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form onSubmit={handleAddSchool} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <div className="date-range-row">
            <input
              type="text"
              className="text-input"
              placeholder="שם בית ספר חדש"
              value={newSchoolName}
              onChange={(e) => setNewSchoolName(e.target.value)}
            />
            <input
              type="text"
              className="text-input"
              placeholder="קוד בית ספר"
              value={newSchoolCode}
              onChange={(e) => setNewSchoolCode(e.target.value)}
              dir="ltr"
            />
          </div>
          <div className="date-range-row">
            <div className="field-suffix-row" style={{ flex: 1 }}>
              <input
                type="number"
                min="0"
                className="text-input"
                placeholder="כמות תלמידים לרישום (לא חובה)"
                value={newSchoolQuota}
                onChange={(e) => setNewSchoolQuota(e.target.value)}
                dir="ltr"
              />
              <span className="field-suffix">תלמידים</span>
            </div>
            <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.85rem 1.3rem' }}>הוסף</button>
          </div>
        </form>
      </section>

      <section className="card">
        <p className="card__label">כיתות</p>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>כיתה</th><th>בית ספר</th><th>תלמידים</th><th></th></tr></thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id}>
                  <td className="admin-table__name">{c.name}</td>
                  <td>{c.school_name}</td>
                  <td>{c.student_count}</td>
                  <td><button type="button" className="link-btn link-btn--danger" onClick={() => handleRemoveClass(c.id)}>הסר</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="date-range-row" style={{ marginTop: '1rem' }} onSubmit={handleAddClass}>
          <select className="text-input" value={newClassSchoolId} onChange={(e) => setNewClassSchoolId(e.target.value)}>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input
            type="text"
            className="text-input"
            placeholder="שם כיתה (לדוגמה ה'1)"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
          />
          <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.85rem 1.3rem' }}>הוסף</button>
        </form>
      </section>
    </div>
  );
}
