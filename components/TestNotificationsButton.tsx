'use client';

import { useState } from 'react';
import { notificationAPI } from '@/lib/api';
import { showToast } from '@/lib/toast';

type ButtonState = 'idle' | 'loading' | 'success' | 'error';

export function TestNotificationsButton() {
  const [state, setState] = useState<ButtonState>('idle');
  const [tooltip, setTooltip] = useState<string>('Test Push & Email Notifications to All Users');
  const [result, setResult] = useState<{
    pushSent?: number;
    pushFailed?: number;
    emailSent?: number;
    emailFailed?: number;
    error?: string;
  } | null>(null);

  const handleTest = async () => {
    setState('loading');
    setTooltip('Sending test notifications...');
    setResult(null);

    try {
      const response = await notificationAPI.sendTestNotificationsToAll();
      const data = response.data || response;

      const pushSent = data.push?.sent || data.summary?.pushSent || 0;
      const pushFailed = data.push?.failed || data.summary?.pushFailed || 0;
      const emailSent = data.email?.sent || data.summary?.emailSent || 0;
      const emailFailed = data.email?.failed || data.summary?.emailFailed || 0;

      setResult({
        pushSent,
        pushFailed,
        emailSent,
        emailFailed,
      });

      const successMessage = `Push: ${pushSent} sent, ${pushFailed} failed | Email: ${emailSent} sent, ${emailFailed} failed`;
      setTooltip(successMessage);
      setState('success');
      showToast.success(`Test notifications sent! ${successMessage}`);

      // Reset to idle after 5 seconds
      setTimeout(() => {
        setState('idle');
        setTooltip('Test Push & Email Notifications to All Users');
        setResult(null);
      }, 5000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send test notifications';
      setResult({ error: errorMessage });
      setTooltip(`Error: ${errorMessage}`);
      setState('error');
      showToast.error(errorMessage);

      // Reset to idle after 5 seconds
      setTimeout(() => {
        setState('idle');
        setTooltip('Test Push & Email Notifications to All Users');
        setResult(null);
      }, 5000);
    }
  };

  const getButtonColor = () => {
    switch (state) {
      case 'loading':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'success':
        return 'bg-green-500 hover:bg-green-600';
      case 'error':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return 'bg-indigo-500 hover:bg-indigo-600';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative group">
        {/* Tooltip - Always visible when there's a result, or on hover when idle */}
        {(result || state !== 'idle') ? (
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-lg shadow-lg pointer-events-none whitespace-normal max-w-xs z-10">
            <div className="font-semibold mb-1">
              {state === 'success' ? '✅ Success' : state === 'error' ? '❌ Error' : '⏳ Sending...'}
            </div>
            <div className="text-xs">{tooltip}</div>
            {result && state === 'success' && (
              <div className="mt-2 text-xs space-y-1">
                {result.pushSent !== undefined && (
                  <div>Push: {result.pushSent} sent, {result.pushFailed || 0} failed</div>
                )}
                {result.emailSent !== undefined && (
                  <div>Email: {result.emailSent} sent, {result.emailFailed || 0} failed</div>
                )}
              </div>
            )}
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
          </div>
        ) : (
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap max-w-xs z-10">
            {tooltip}
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
          </div>
        )}

        {/* Button */}
        <button
          onClick={handleTest}
          disabled={state === 'loading'}
          className={`
            ${getButtonColor()}
            text-white
            rounded-full
            p-4
            shadow-lg
            transition-all
            duration-300
            disabled:opacity-50
            disabled:cursor-not-allowed
            flex
            items-center
            justify-center
            w-14
            h-14
            hover:scale-110
            active:scale-95
          `}
          title={tooltip}
        >
          {state === 'loading' ? (
            <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : state === 'success' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : state === 'error' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

