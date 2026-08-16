import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function AdminSchools() {
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [newSchoolName, setNewSchoolName] = useState('');
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
    if (!newSchoolName.trim()) return;
    try {
      await api.adminCreateSchool({ name: newSchoolName.trim() });
      setNewSchoolName('');
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
            <thead><tr><th>שם</th><th></th></tr></thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id}>
                  <td className="admin-table__name">{s.name}</td>
                  <td><button type="button" className="link-btn link-btn--danger" onClick={() => handleRemoveSchool(s.id)}>הסר</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="date-range-row" style={{ marginTop: '1rem' }} onSubmit={handleAddSchool}>
          <input
            type="text"
            className="text-input"
            placeholder="שם בית ספר חדש"
            value={newSchoolName}
            onChange={(e) => setNewSchoolName(e.target.value)}
          />
          <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.85rem 1.3rem' }}>הוסף</button>
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
