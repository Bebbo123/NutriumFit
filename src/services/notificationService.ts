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
        // Read VAPID public key from env with fallback
        const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BKL9CHxTKoVCxODkykDT_As8y6MRpgdvYxMtiR38VBJDug-vSd68Mj_HiRb819prz899LPMQeE1_Tm1HYlJs3Q0';
        
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
   * Force unsubscribes any old push subscription and registers a fresh one.
   */
  async renewPushSubscription(userId: string): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported.');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSub = await registration.pushManager.getSubscription();

      if (existingSub) {
        await existingSub.unsubscribe();
      }

      const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BKL9CHxTKoVCxODkykDT_As8y6MRpgdvYxMtiR38VBJDug-vSd68Mj_HiRb819prz899LPMQeE1_Tm1HYlJs3Q0';
      
      const newSub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicVapidKey) as unknown as BufferSource
      });

      return await this.saveSettings(userId, { enabled: true }, newSub.toJSON());
    } catch (err) {
      console.error('Error renewing push subscription:', err);
      return false;
    }
  },

  /**
   * Triggers an immediate test notification.
   */
  async sendTestNotification(userId: string): Promise<boolean> {
    if (Notification.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return false;
    }

    try {
      // First ensure subscription is fresh
      await this.renewPushSubscription(userId);

      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('🧪 Notifica di Prova NutriumFit', {
        body: 'Le notifiche push in background funzionano perfettamente!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url: '/' }
      });
      return true;
    } catch (err) {
      console.error('Error triggering test notification:', err);
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
