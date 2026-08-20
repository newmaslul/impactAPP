import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { GRADE_OPTIONS } from '../../lib/challengeTypes.js';

export default function AdminSchools() {
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolCode, setNewSchoolCode] = useState('');
  const [newSchoolQuota, setNewSchoolQuota] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newClassSchoolId, setNewClassSchoolId] = useState('');
  const [newClassGrade, setNewClassGrade] = useState('');
  const [error, setError] = useState('');

  // Inline-edit state: which row (by id) is being edited, and its
  // in-progress field values — one shared editor per table, keyed by id
  // so only one row's inputs are ever mounted at a time.
  const [editingSchoolId, setEditingSchoolId] = useState(null);
  const [schoolEdit, setSchoolEdit] = useState({ name: '', code: '', studentQuota: '' });
  const [savingSchool, setSavingSchool] = useState(false);

  const [editingClassId, setEditingClassId] = useState(null);
  const [classEdit, setClassEdit] = useState({ name: '', schoolId: '', grade: '' });
  const [savingClass, setSavingClass] = useState(false);

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
      await api.adminCreateClass({
        name: newClassName.trim(),
        schoolId: Number(newClassSchoolId),
        grade: newClassGrade.trim() || null,
      });
      setNewClassName('');
      setNewClassGrade('');
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

  const startEditingSchool = (s) => {
    setError('');
    setEditingSchoolId(s.id);
    setSchoolEdit({
      name: s.name ?? '',
      code: s.code ?? '',
      studentQuota: s.student_quota ?? '',
    });
  };

  const cancelEditingSchool = () => {
    setEditingSchoolId(null);
  };

  const handleSaveSchool = async (id) => {
    if (!schoolEdit.name.trim() || !schoolEdit.code.trim()) {
      setError('נדרש שם וקוד בית ספר');
      return;
    }
    setSavingSchool(true);
    setError('');
    try {
      await api.adminUpdateSchool(id, {
        name: schoolEdit.name.trim(),
        code: schoolEdit.code.trim(),
        studentQuota: schoolEdit.studentQuota === '' ? null : Number(schoolEdit.studentQuota),
      });
      setEditingSchoolId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingSchool(false);
    }
  };

  const startEditingClass = (c) => {
    setError('');
    setEditingClassId(c.id);
    setClassEdit({ name: c.name ?? '', schoolId: String(c.school_id ?? ''), grade: c.grade ?? '' });
  };

  const cancelEditingClass = () => {
    setEditingClassId(null);
  };

  const handleSaveClass = async (id) => {
    if (!classEdit.name.trim() || !classEdit.schoolId) {
      setError('נדרש שם כיתה ובית ספר');
      return;
    }
    setSavingClass(true);
    setError('');
    try {
      await api.adminUpdateClass(id, {
        name: classEdit.name.trim(),
        schoolId: Number(classEdit.schoolId),
        grade: classEdit.grade.trim() || null,
      });
      setEditingClassId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingClass(false);
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
              {schools.map((s) => {
                const isEditing = editingSchoolId === s.id;
                if (isEditing) {
                  return (
                    <tr key={s.id}>
                      <td>
                        <input
                          type="text"
                          className="text-input"
                          value={schoolEdit.name}
                          onChange={(e) => setSchoolEdit((prev) => ({ ...prev, name: e.target.value }))}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="text-input"
                          value={schoolEdit.code}
                          onChange={(e) => setSchoolEdit((prev) => ({ ...prev, code: e.target.value }))}
                          dir="ltr"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          className="text-input"
                          placeholder="ללא הגבלה"
                          value={schoolEdit.studentQuota}
                          onChange={(e) => setSchoolEdit((prev) => ({ ...prev, studentQuota: e.target.value }))}
                          dir="ltr"
                          style={{ width: '7rem' }}
                        />
                      </td>
                      <td style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" className="link-btn" disabled={savingSchool} onClick={() => handleSaveSchool(s.id)}>
                          {savingSchool ? 'שומר…' : 'שמור'}
                        </button>
                        <button type="button" className="link-btn" disabled={savingSchool} onClick={cancelEditingSchool}>ביטול</button>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={s.id}>
                    <td className="admin-table__name">{s.name}</td>
                    <td dir="ltr">{s.code ?? '—'}</td>
                    <td>{s.registeredStudentCount ?? 0} / {s.student_quota ?? '∞'}</td>
                    <td style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="button" className="link-btn" onClick={() => startEditingSchool(s)}>ערוך</button>
                      <button type="button" className="link-btn link-btn--danger" onClick={() => handleRemoveSchool(s.id)}>הסר</button>
                    </td>
                  </tr>
                );
              })}
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
            <thead><tr><th>כיתה</th><th>שכבה</th><th>בית ספר</th><th>תלמידים</th><th></th></tr></thead>
            <tbody>
              {classes.map((c) => {
                const isEditing = editingClassId === c.id;
                if (isEditing) {
                  return (
                    <tr key={c.id}>
                      <td>
                        <input
                          type="text"
                          className="text-input"
                          value={classEdit.name}
                          onChange={(e) => setClassEdit((prev) => ({ ...prev, name: e.target.value }))}
                        />
                      </td>
                      <td>
                        <select
                          className="text-input"
                          value={classEdit.grade}
                          onChange={(e) => setClassEdit((prev) => ({ ...prev, grade: e.target.value }))}
                          style={{ width: '5rem' }}
                        >
                          <option value="">—</option>
                          {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </td>
                      <td>
                        <select
                          className="text-input"
                          value={classEdit.schoolId}
                          onChange={(e) => setClassEdit((prev) => ({ ...prev, schoolId: e.target.value }))}
                        >
                          {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </td>
                      <td>{c.student_count}</td>
                      <td style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" className="link-btn" disabled={savingClass} onClick={() => handleSaveClass(c.id)}>
                          {savingClass ? 'שומר…' : 'שמור'}
                        </button>
                        <button type="button" className="link-btn" disabled={savingClass} onClick={cancelEditingClass}>ביטול</button>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={c.id}>
                    <td className="admin-table__name">{c.name}</td>
                    <td>{c.grade ?? '—'}</td>
                    <td>{c.school_name}</td>
                    <td>{c.student_count}</td>
                    <td style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="button" className="link-btn" onClick={() => startEditingClass(c)}>ערוך</button>
                      <button type="button" className="link-btn link-btn--danger" onClick={() => handleRemoveClass(c.id)}>הסר</button>
                    </td>
                  </tr>
                );
              })}
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
          <select
            className="text-input"
            value={newClassGrade}
            onChange={(e) => setNewClassGrade(e.target.value)}
            style={{ maxWidth: '8rem' }}
          >
            <option value="">שכבה</option>
            {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.85rem 1.3rem' }}>הוסף</button>
        </form>
      </section>
    </div>
  );
}
