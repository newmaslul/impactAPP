// Admin content management (create/list/update/delete). Same
// intentionally-open caveat as the other admin-* functions.

import { corsHeaders, handleOptions, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

function restSegments(req: Request): string[] {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  const idx = segments.indexOf('admin-content');
  return idx >= 0 ? segments.slice(idx + 1) : [];
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const rest = restSegments(req);

  try {
    if (rest.length === 0 && req.method === 'GET') return await handleList();
    if (rest.length === 0 && req.method === 'POST') return await handleCreate(req);
    if (rest.length === 1 && req.method === 'PATCH') return await handleUpdate(req, rest[0]);
    if (rest.length === 1 && req.method === 'DELETE') {
      const { error, count } = await supabaseAdmin.from('content_items').delete({ count: 'exact' }).eq('id', rest[0]);
      if (error) throw error;
      if (!count) return json({ error: 'תוכן לא נמצא' }, 404);
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    return json({ error: 'Not found' }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: 'שגיאת שרת' }, 500);
  }
});

async function handleList() {
  const { data: items, error } = await supabaseAdmin
    .from('content_items')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const { data: views, error: viewsError } = await supabaseAdmin.from('content_views').select('content_id');
  if (viewsError) throw viewsError;

  const viewCounts: Record<number, number> = {};
  for (const v of views ?? []) viewCounts[v.content_id as number] = (viewCounts[v.content_id as number] ?? 0) + 1;

  const result = (items ?? []).map((item: any) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    videoUrl: item.video_url,
    pointsReward: item.points_reward,
    active: item.active,
    viewCount: viewCounts[item.id] ?? 0,
    category: item.category,
    thumbnailUrl: item.thumbnail_url,
    durationLabel: item.duration_label,
    level: item.level,
    benefits: item.benefits ?? [],
  }));

  return json({ content: result });
}

const CATEGORIES = ['workout', 'tip', 'yoga', 'lecture'];
const LEVELS = ['קל', 'בינוני', 'קשה'];

async function handleCreate(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { title, description, videoUrl, pointsReward, category, thumbnailUrl, durationLabel, level, benefits } = body;
  if (!title || !String(title).trim()) return json({ error: 'נדרשת כותרת' }, 400);
  if (!videoUrl || !String(videoUrl).trim()) return json({ error: 'נדרש קישור לסרטון' }, 400);
  if (category !== undefined && !CATEGORIES.includes(category)) {
    return json({ error: `קטגוריה חייבת להיות אחת מ: ${CATEGORIES.join(', ')}` }, 400);
  }
  if (level !== undefined && !LEVELS.includes(level)) {
    return json({ error: `רמה חייבת להיות אחת מ: ${LEVELS.join(', ')}` }, 400);
  }

  const { data, error } = await supabaseAdmin
    .from('content_items')
    .insert({
      title: String(title).trim(),
      description: description || null,
      video_url: String(videoUrl).trim(),
      points_reward: Number(pointsReward) || 0,
      category: category || 'workout',
      thumbnail_url: thumbnailUrl || null,
      duration_label: durationLabel || null,
      level: level || 'קל',
      benefits: Array.isArray(benefits) ? benefits : [],
    })
    .select()
    .single();
  if (error) throw error;

  return json({ contentItem: data }, 201);
}

async function handleUpdate(req: Request, id: string) {
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.description !== undefined) patch.description = body.description;
  if (body.videoUrl !== undefined) patch.video_url = body.videoUrl;
  if (body.pointsReward !== undefined) patch.points_reward = Number(body.pointsReward) || 0;
  if (body.active !== undefined) patch.active = !!body.active;
  if (body.category !== undefined) {
    if (!CATEGORIES.includes(body.category)) return json({ error: `קטגוריה חייבת להיות אחת מ: ${CATEGORIES.join(', ')}` }, 400);
    patch.category = body.category;
  }
  if (body.thumbnailUrl !== undefined) patch.thumbnail_url = body.thumbnailUrl || null;
  if (body.durationLabel !== undefined) patch.duration_label = body.durationLabel || null;
  if (body.level !== undefined) {
    if (!LEVELS.includes(body.level)) return json({ error: `רמה חייבת להיות אחת מ: ${LEVELS.join(', ')}` }, 400);
    patch.level = body.level;
  }
  if (body.benefits !== undefined) patch.benefits = Array.isArray(body.benefits) ? body.benefits : [];

  const { data, error } = await supabaseAdmin.from('content_items').update(patch).eq('id', id).select().maybeSingle();
  if (error) throw error;
  if (!data) return json({ error: 'תוכן לא נמצא' }, 404);

  return json({ contentItem: data });
}
