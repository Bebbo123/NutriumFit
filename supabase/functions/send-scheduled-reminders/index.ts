// Supabase Edge Function: send-scheduled-reminders
// Deploy with: supabase functions deploy send-scheduled-reminders

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webPush from "npm:web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDnA45A-8_aW773cZ0g9g-383-w';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || 'S_YOUR_VAPID_PRIVATE_KEY_HERE';
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@nutriumfit.app';

    // Set VAPID details for Web Push
    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch active user notification settings with subscriptions
    const { data: notifications, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('enabled', true)
      .not('subscription', 'is', null);

    if (error) {
      throw error;
    }

    const now = new Date();
    const currentHourMin = now.toISOString().substring(11, 16); // "HH:MM" UTC

    let sentCount = 0;
    const results = [];

    for (const item of notifications) {
      if (!item.subscription) continue;

      const breakfastTime = item.breakfast_time ? item.breakfast_time.substring(0, 5) : '08:30';
      const lunchTime = item.lunch_time ? item.lunch_time.substring(0, 5) : '13:00';
      const dinnerTime = item.dinner_time ? item.dinner_time.substring(0, 5) : '20:00';

      let notificationTitle = '';
      let notificationBody = '';

      if (currentHourMin === breakfastTime) {
        notificationTitle = '🍳 Promemoria Colazione';
        notificationBody = 'Buongiorno! Ricordati di registrare la tua colazione su NutriumFit.';
      } else if (currentHourMin === lunchTime) {
        notificationTitle = '🥗 Promemoria Pranzo';
        notificationBody = 'È ora di pranzo! Registra i tuoi macronutrienti.';
      } else if (currentHourMin === dinnerTime) {
        notificationTitle = '🥩 Promemoria Cena';
        notificationBody = 'È ora di cena! Completa il diario alimentare di oggi.';
      } else if (item.workout_reminder_enabled && currentHourMin === '17:00') {
        notificationTitle = '🏋️‍♂️ Promemoria Workout';
        notificationBody = 'Pronto per l\'allenamento di oggi? Registra le tue serie su NutriumFit!';
      }

      // If a match was found, trigger web push payload
      if (notificationTitle) {
        const payload = JSON.stringify({
          title: notificationTitle,
          body: notificationBody,
          url: '/diary',
          tag: 'nutriumfit-scheduled-reminder'
        });

        try {
          await webPush.sendNotification(item.subscription, payload);
          sentCount++;
          results.push({ userId: item.user_id, status: 'sent', title: notificationTitle });
        } catch (pushErr) {
          console.error(`Error sending push to ${item.user_id}:`, pushErr);
          results.push({ userId: item.user_id, status: 'failed', error: String(pushErr) });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: notifications.length, sentCount, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err) {
    console.error('Edge Function error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
