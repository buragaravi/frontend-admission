import { notificationAPI } from './api';

let registration: ServiceWorkerRegistration | null = null;
let vapidPublicKey: string | null = null;

/**
 * Request notification permission from user
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    throw new Error('Notification permission was denied');
  }

  const permission = await Notification.requestPermission();
  return permission;
};

/**
 * Get VAPID public key from server
 */
export const getVapidPublicKey = async (): Promise<string> => {
  if (vapidPublicKey) {
    return vapidPublicKey;
  }

  try {
    const response = await notificationAPI.getVapidKey();
    vapidPublicKey = response.data?.publicKey || response.publicKey;
    if (!vapidPublicKey) {
      throw new Error('VAPID public key not found in response');
    }
    return vapidPublicKey;
  } catch (error: any) {
    console.error('Error getting VAPID key:', error);
    throw new Error(error.response?.data?.message || 'Failed to get VAPID public key');
  }
};

/**
 * Register service worker for push notifications
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser');
  }

  if (registration) {
    return registration;
  }

  try {
    registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[PushNotifications] Service worker registered:', registration.scope);
    return registration;
  } catch (error: any) {
    console.error('[PushNotifications] Error registering service worker:', error);
    throw new Error('Failed to register service worker');
  }
};

/**
 * Subscribe to push notifications
 */
export const subscribeToPushNotifications = async (): Promise<PushSubscription | null> => {
  try {
    // Request permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('[PushNotifications] Notification permission not granted');
      return null;
    }

    // Register service worker
    const swRegistration = await registerServiceWorker();

    // Get VAPID public key
    const publicKey = await getVapidPublicKey();

    // Convert VAPID key to Uint8Array
    const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    };

    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // Subscribe to push
    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    });

    // Send subscription to server
    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: arrayBufferToBase64(subscription.getKey('auth')!),
      },
    };

    await notificationAPI.subscribeToPush(subscriptionData);

    console.log('[PushNotifications] Successfully subscribed to push notifications');
    return subscription;
  } catch (error: any) {
    console.error('[PushNotifications] Error subscribing to push:', error);
    throw error;
  }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPushNotifications = async (): Promise<void> => {
  try {
    if (!registration) {
      registration = await navigator.serviceWorker.ready;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.log('[PushNotifications] No active subscription found');
      return;
    }

    // Unsubscribe from push
    await subscription.unsubscribe();

    // Notify server
    await notificationAPI.unsubscribeFromPush(subscription.endpoint);

    console.log('[PushNotifications] Successfully unsubscribed from push notifications');
  } catch (error: any) {
    console.error('[PushNotifications] Error unsubscribing from push:', error);
    throw error;
  }
};

/**
 * Check if user is subscribed to push notifications
 */
export const isSubscribedToPush = async (): Promise<boolean> => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    if (!registration) {
      registration = await navigator.serviceWorker.ready;
    }

    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    console.error('[PushNotifications] Error checking subscription:', error);
    return false;
  }
};

/**
 * Convert ArrayBuffer to base64 string
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

/**
 * Initialize push notifications (call this on app startup)
 */
export const initializePushNotifications = async (): Promise<void> => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[PushNotifications] Push notifications not supported');
      return;
    }

    // Register service worker
    await registerServiceWorker();

    // Check if already subscribed
    const isSubscribed = await isSubscribedToPush();
    if (isSubscribed) {
      console.log('[PushNotifications] Already subscribed to push notifications');
      return;
    }

    // Auto-subscribe if permission is already granted
    if (Notification.permission === 'granted') {
      await subscribeToPushNotifications();
    }
  } catch (error) {
    console.error('[PushNotifications] Error initializing push notifications:', error);
  }
};

