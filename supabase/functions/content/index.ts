// Student-facing content endpoints: list watchable content (with each
// item's watched status for the current user) and mark one as watched,
// which awards its points once (idempotent via the unique(user_id,
// content_id) constraint on content_views).

import { corsHeaders, handleOptions, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { getUserIdFromRequest, AuthError } from '../_shared/auth.ts';

function restSegments(req: Request): string[] {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  const idx = segments.indexOf('content');
  return idx >= 0 ? segments.slice(idx + 1) : [];
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const rest = restSegments(req);

  try {
    if (rest.length === 0 && req.method === 'GET') return await handleList(req);
    if (rest.length === 2 && rest[1] === 'complete' && req.method === 'POST') return await handleComplete(req, rest[0]);
    return json({ error: 'Not found' }, 404);
  } catch (err) {
    if (err instanceof AuthError) return json({ error: err.message }, 401);
    console.error(err);
    return json({ error: 'שגיאת שרת' }, 500);
  }
});

async function handleList(req: Request) {
  const userId = getUserIdFromRequest(req);

  const { data: items, error } = await supabaseAdmin
    .from('content_items')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const { data: views, error: viewsError } = await supabaseAdmin
    .from('content_views')
    .select('content_id')
    .eq('user_id', userId);
  if (viewsError) throw viewsError;

  const watchedIds = new Set((views ?? []).map((v) => v.content_id));
  const result = (items ?? []).map((item: any) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    videoUrl: item.video_url,
    pointsReward: item.points_reward,
    watched: watchedIds.has(item.id),
  }));

  return json({ content: result });
}

async function handleComplete(req: Request, contentId: string) {
  const userId = getUserIdFromRequest(req);

  const { data: existing } = await supabaseAdmin
    .from('content_views')
    .select('*')
    .eq('user_id', userId)
    .eq('content_id', contentId)
    .maybeSingle();
  if (existing) {
    return json({ alreadyWatched: true, pointsAwarded: existing.points_awarded });
  }

  const { data: item, error: itemError } = await supabaseAdmin
    .from('content_items')
    .select('*')
    .eq('id', contentId)
    .maybeSingle();
  if (itemError) throw itemError;
  if (!item) return json({ error: 'תוכן לא נמצא' }, 404);

  const { error: viewError } = await supabaseAdmin
    .from('content_views')
    .insert({ user_id: userId, content_id: contentId, points_awarded: item.points_reward });
  if (viewError) throw viewError;

  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('points')
    .eq('id', userId)
    .single();
  if (userError) throw userError;

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ points: (user.points ?? 0) + item.points_reward })
    .eq('id', userId);
  if (updateError) throw updateError;

  return json({ alreadyWatched: false, pointsAwarded: item.points_reward });
}
