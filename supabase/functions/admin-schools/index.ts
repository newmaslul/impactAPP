// Ported from server/routes/schools.js.
import { corsHeaders, handleOptions, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

function restSegments(req: Request): string[] {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  const idx = segments.indexOf('admin-schools');
  return idx >= 0 ? segments.slice(idx + 1) : [];
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const rest = restSegments(req);

  try {
    if (rest.length === 0 && req.method === 'GET') {
      const { data: schools, error } = await supabaseAdmin.from('schools').select('*').order('name');
      if (error) throw error;

      // Registered-student count per school, for the quota column — same
      // shape as admin-classes' own student_count, just rolled up one
      // level (across every class belonging to the school).
      const { data: classRows, error: classError } = await supabaseAdmin.from('classes').select('id, school_id');
      if (classError) throw classError;
      const classIdsBySchool = new Map<number, number[]>();
      for (const c of classRows ?? []) {
        const list = classIdsBySchool.get(c.school_id) ?? [];
        list.push(c.id);
        classIdsBySchool.set(c.school_id, list);
      }
      const { data: studentRows, error: studentError } = await supabaseAdmin
        .from('users')
        .select('class_id')
        .eq('role', 'student');
      if (studentError) throw studentError;
      const studentCountByClass = new Map<number, number>();
      for (const s of studentRows ?? []) {
        if (s.class_id == null) continue;
        studentCountByClass.set(s.class_id, (studentCountByClass.get(s.class_id) ?? 0) + 1);
      }

      const result = (schools ?? []).map((s: any) => {
        const classIds = classIdsBySchool.get(s.id) ?? [];
        const registeredCount = classIds.reduce((sum, id) => sum + (studentCountByClass.get(id) ?? 0), 0);
        return { ...s, registeredStudentCount: registeredCount };
      });

      return json({ schools: result });
    }
    if (rest.length === 0 && req.method === 'POST') {
      const { name, code, studentQuota } = await req.json().catch(() => ({}));
      if (!name || !String(name).trim()) return json({ error: 'נדרש שם בית ספר' }, 400);
      if (!code || !String(code).trim()) return json({ error: 'נדרש קוד בית ספר' }, 400);
      if (studentQuota !== undefined && studentQuota !== null && studentQuota !== '') {
        const quotaNum = Number(studentQuota);
        if (!Number.isInteger(quotaNum) || quotaNum < 0) return json({ error: 'כמות תלמידים לרישום חייבת להיות מספר שלם חיובי' }, 400);
      }

      const { data, error } = await supabaseAdmin
        .from('schools')
        .insert({
          name: String(name).trim(),
          code: String(code).trim(),
          student_quota: studentQuota !== undefined && studentQuota !== null && studentQuota !== '' ? Number(studentQuota) : null,
        })
        .select()
        .single();
      if (error) {
        if (error.code === '23505') return json({ error: 'קוד בית הספר כבר קיים — בחרו קוד אחר' }, 409);
        throw error;
      }
      return json({ school: data }, 201);
    }
    if (rest.length === 1 && req.method === 'PATCH') return await handleUpdate(req, rest[0]);
    if (rest.length === 1 && req.method === 'DELETE') {
      const { error, count } = await supabaseAdmin.from('schools').delete({ count: 'exact' }).eq('id', rest[0]);
      if (error) throw error;
      if (!count) return json({ error: 'בית ספר לא נמצא' }, 404);
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    return json({ error: 'Not found' }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: 'שגיאת שרת' }, 500);
  }
});

async function handleUpdate(req: Request, id: string) {
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (!String(body.name).trim()) return json({ error: 'נדרש שם בית ספר' }, 400);
    patch.name = String(body.name).trim();
  }
  if (body.code !== undefined) {
    if (!String(body.code).trim()) return json({ error: 'נדרש קוד בית ספר' }, 400);
    patch.code = String(body.code).trim();
  }
  if (body.studentQuota !== undefined) {
    if (body.studentQuota === null || body.studentQuota === '') {
      patch.student_quota = null;
    } else {
      const quotaNum = Number(body.studentQuota);
      if (!Number.isInteger(quotaNum) || quotaNum < 0) return json({ error: 'כמות תלמידים לרישום חייבת להיות מספר שלם חיובי' }, 400);
      patch.student_quota = quotaNum;
    }
  }

  const { data, error } = await supabaseAdmin.from('schools').update(patch).eq('id', id).select().maybeSingle();
  if (error) {
    if (error.code === '23505') return json({ error: 'קוד בית הספר כבר קיים — בחרו קוד אחר' }, 409);
    throw error;
  }
  if (!data) return json({ error: 'בית ספר לא נמצא' }, 404);

  return json({ school: data });
}
