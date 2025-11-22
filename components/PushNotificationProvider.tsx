'use client';

import { useEffect, useState } from 'react';
import { initializePushNotifications } from '@/lib/pushNotifications';
import { auth } from '@/lib/auth';

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Check if user is authenticated
        const user = auth.getUser();
        if (!user) {
          return;
        }

        // Check if browser supports push notifications
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          console.log('[PushNotifications] Browser does not support push notifications');
          return;
        }

        // Initialize push notifications (automatically requests permission and subscribes)
        await initializePushNotifications();
        setIsInitialized(true);
      } catch (error) {
        console.error('[PushNotifications] Error initializing:', error);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      init();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return <>{children}</>;
}

