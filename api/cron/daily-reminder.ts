import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!,
);

webPush.setVapidDetails(
  process.env.VAPID_CONTACT!,
  process.env.VITE_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const familyId = process.env.VITE_FAMILY_ID!;

  // Load family settings
  const { data: settings } = await supabase
    .from('settings')
    .select('notification_time, notification_enabled, last_reminder_sent')
    .eq('family_id', familyId)
    .single();

  if (!settings?.notification_enabled) {
    return res.status(200).json({ skipped: 'notifications disabled' });
  }

  // Check current time in CT (handles DST automatically)
  const ctFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const ctNow = ctFormatter.format(new Date()); // e.g. "09:00"
  const configuredTime = settings.notification_time ?? '09:00';

  const todayCT = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2'); // yyyy-MM-dd

  // Only send if it's the right hour and not already sent today
  if (ctNow.slice(0, 5) !== configuredTime) {
    return res.status(200).json({ skipped: `not time yet (${ctNow} vs ${configuredTime})` });
  }
  if (settings.last_reminder_sent === todayCT) {
    return res.status(200).json({ skipped: 'already sent today' });
  }

  // Get all kid subscriptions for this family
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

  // Mark as sent today
  await supabase.from('settings')
    .update({ last_reminder_sent: todayCT })
    .eq('family_id', familyId);

  console.log(`[daily-reminder] sent ${sent} notifications at ${ctNow} CT`);
  return res.status(200).json({ sent, time: ctNow });
}
