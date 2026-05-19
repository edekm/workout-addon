import { error } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';

export const load: ServerLoad = ({ params }) => {
  const db = getDb();
  const slot = params.slot;
  if (slot !== 'user1' && slot !== 'user2') throw error(404, 'Nieznany profil');

  const user = db.prepare('SELECT id, slot, name FROM users WHERE slot = ?').get(slot) as
    | { id: number; slot: string; name: string }
    | undefined;
  if (!user) throw error(404, 'Profil nie istnieje');

  const plan = db
    .prepare(
      `SELECT id, name, description
       FROM plans WHERE user_id = ? AND is_active = 1
       ORDER BY id DESC LIMIT 1`
    )
    .get(user.id) as { id: number; name: string; description: string | null } | undefined;

  let days: Array<{ label: string; exercise_count: number }> = [];
  if (plan) {
    days = db
      .prepare(
        `SELECT day_label AS label, COUNT(*) AS exercise_count
         FROM plan_exercises
         WHERE plan_id = ?
         GROUP BY day_label
         ORDER BY MIN(ord)`
      )
      .all(plan.id) as Array<{ label: string; exercise_count: number }>;
  }

  const recentSessions = db
    .prepare(
      `SELECT s.id, s.day_label, s.started_at, s.completed_at,
              (SELECT COUNT(*) FROM sets WHERE session_id = s.id) AS set_count
       FROM sessions s WHERE s.user_id = ? AND s.completed_at IS NOT NULL
       ORDER BY s.started_at DESC LIMIT 5`
    )
    .all(user.id) as Array<{
    id: number;
    day_label: string | null;
    started_at: number;
    completed_at: number | null;
    set_count: number;
  }>;

  // "Co dziś" - następny dzień po ostatniej zakończonej sesji (rotacja).
  let suggestedDay: string | null = null;
  if (days.length > 0) {
    if (recentSessions.length === 0) {
      suggestedDay = days[0].label;
    } else {
      const last = recentSessions[0].day_label;
      const idx = days.findIndex((d) => d.label === last);
      if (idx === -1 || idx === days.length - 1) {
        suggestedDay = days[0].label;
      } else {
        suggestedDay = days[idx + 1].label;
      }
    }
  }

  return {
    user,
    plan,
    days,
    recentSessions,
    suggestedDay
  };
};
