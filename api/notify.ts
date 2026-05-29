import type { VercelRequest, VercelResponse } from '@vercel/node';
import webPush from 'web-push';
import { adminClient, requireUser } from './_auth.js';

const supabase = adminClient();

webPush.setVapidDetails(
  process.env.VAPID_CONTACT!,
  process.env.VITE_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await requireUser(req, res))) return;

  const { familyId, profileIds, targetAdmins, title, body } = req.body ?? {};
  if (!familyId || !title) return res.status(400).json({ error: 'Missing required fields' });

  // Build profile filter
  let query = supabase.from('push_subscriptions').select('*').eq('family_id', familyId);

  if (targetAdmins) {
    // Look up admin profile IDs first
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('family_id', familyId)
      .eq('role', 'admin');
    const adminIds = admins?.map(a => a.id) ?? [];
    if (!adminIds.length) return res.status(200).json({ sent: 0 });
    query = query.in('profile_id', adminIds);
  } else if (profileIds?.length) {
    query = query.in('profile_id', profileIds);
  }

  const { data: subs } = await query;
  if (!subs?.length) return res.status(200).json({ sent: 0 });

  const payload = JSON.stringify({ title, body });
  let sent = 0;

  await Promise.allSettled(
    subs.map(async (row) => {
      try {
        await webPush.sendNotification(row.subscription, payload);
        sent++;
      } catch (err: any) {
        // 410 = subscription expired — clean it up
        if (err.statusCode === 410) {
          await supabase.from('push_subscriptions')
            .delete()
            .eq('family_id', familyId)
            .eq('endpoint', row.endpoint);
        }
        console.error('[notify] send failed:', err.message);
      }
    })
  );

  console.log(`[notify] sent ${sent}/${subs.length} notifications`);
  return res.status(200).json({ sent });
}
