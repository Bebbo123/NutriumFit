import { supabase } from '../utils/supabaseClient';

export interface NotificationSettingsData {
  enabled: boolean;
  breakfast_time: string;
  lunch_time: string;
  dinner_time: string;
  workout_reminder_enabled: boolean;
}

export const notificationService = {
  /**
   * Checks current Notification permission status.
   */
  getPermissionStatus(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  },

  /**
   * Requests permission to send Web Push Notifications.
   */
  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notifications not supported in this browser.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return false;
    }
  },

  /**
   * Fetches user notification settings from Supabase.
   */
  async fetchSettings(userId: string): Promise<NotificationSettingsData | null> {
    if (!navigator.onLine) return null;

    const { data, error } = await supabase
      .from('user_notifications')
      .select('enabled, breakfast_time, lunch_time, dinner_time, workout_reminder_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching notification settings:', error);
      return null;
    }
    return data as NotificationSettingsData | null;
  },

  /**
   * Saves or updates notification preferences and optional PushSubscription in Supabase.
   */
  async saveSettings(userId: string, settings: Partial<NotificationSettingsData>, subscriptionJson?: any): Promise<boolean> {
    if (!navigator.onLine) return false;

    try {
      const payload: any = {
        user_id: userId,
        updated_at: new Date().toISOString(),
        ...settings
      };

      if (subscriptionJson) {
        payload.subscription = subscriptionJson;
      }

      const { error } = await supabase
        .from('user_notifications')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error saving notification settings:', err);
      return false;
    }
  },

  /**
   * Subscribes the client to Web Push via Service Worker PushManager.
   */
  async registerPushSubscription(userId: string): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported.');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Sample public VAPID key (or user provided key)
        const publicVapidKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDnA45A-8_aW773cZ0g9g-383-w';
        
        // Subscribe to push manager
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(publicVapidKey) as unknown as BufferSource
        });
      }

      // Save subscription payload to Supabase
      return await this.saveSettings(userId, { enabled: true }, subscription.toJSON());
    } catch (err) {
      console.error('Error registering push subscription:', err);
      return false;
    }
  },

  /**
   * Helper to convert VAPID base64 key to Uint8Array.
   */
  urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
};
