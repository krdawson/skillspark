import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';
import { isAuthorizedCron } from '../_auth.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

webPush.setVapidDetails(
  process.env.VAPID_CONTACT!,
  process.env.VITE_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorizedCron(req)) return res.status(401).end();

  const familyId = process.env.VITE_FAMILY_ID!;

  // Load settings — check notifications are enabled and not already sent today
  const { data: settings } = await supabase
    .from('settings')
    .select('notification_enabled, last_reminder_sent')
    .eq('family_id', familyId)
    .single();

  if (!settings?.notification_enabled) {
    return res.status(200).json({ skipped: 'notifications disabled' });
  }

  // Guard against duplicate sends (e.g. manual trigger)
  const todayUTC = new Date().toISOString().slice(0, 10);
  if (settings.last_reminder_sent === todayUTC) {
    return res.status(200).json({ skipped: 'already sent today' });
  }

  // Get all kid subscriptions
  const { data: kidProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('family_id', familyId)
    .eq('role', 'kid');

  const kidIds = kidProfiles?.map(p => p.id) ?? [];
  if (!kidIds.length) return res.status(200).json({ sent: 0 });

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('family_id', familyId)
    .in('profile_id', kidIds);

  const payload = JSON.stringify({
    title: 'SkillSpark ⚡',
    body: "Time to do today's drills! Let's go!",
  });

  let sent = 0;
  await Promise.allSettled(
    (subs ?? []).map(async (row) => {
      try {
        await webPush.sendNotification(row.subscription, payload);
        sent++;
      } catch (err: any) {
        if (err.statusCode === 410) {
          await supabase.from('push_subscriptions')
            .delete()
            .eq('family_id', familyId)
            .eq('endpoint', row.endpoint);
        }
      }
    })
  );

  await supabase.from('settings')
    .update({ last_reminder_sent: todayUTC })
    .eq('family_id', familyId);

  console.log(`[daily-reminder] sent ${sent} notifications`);
  return res.status(200).json({ sent });
}
