'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auth } from '@/lib/auth';
import { notificationAPI } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useDashboardHeader } from '@/components/layout/DashboardShell';
import { showToast } from '@/lib/toast';

type EmailChannel = 'brevo' | 'nodemailer' | 'both';

interface NotificationConfig {
  email_channel: EmailChannel;
  sms_channel: string;
  push_enabled: string;
}

export default function NotificationSettingsPage() {
  const { setHeaderContent, clearHeaderContent } = useDashboardHeader();
  const queryClient = useQueryClient();
  const [emailChannel, setEmailChannel] = useState<EmailChannel>('brevo');
  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<{
    brevo: { success: boolean; error: string | null };
    nodemailer: { success: boolean; error: string | null };
  } | null>(null);

  // Check if user is Super Admin
  useEffect(() => {
    const user = auth.getUser();
    if (!user || (user.roleName !== 'Super Admin' && user.roleName !== 'Sub Super Admin')) {
      window.location.href = '/superadmin/dashboard';
      return;
    }

    setHeaderContent({
      title: 'Notification Settings',
      subtitle: 'Configure email, SMS, and push notification channels',
    });

    return () => clearHeaderContent();
  }, [setHeaderContent, clearHeaderContent]);

  // Fetch current configuration
  const { data: config, isLoading } = useQuery({
    queryKey: ['notification-config'],
    queryFn: async () => {
      const response = await notificationAPI.getConfig();
      return response.data || response;
    },
  });

  // Update configuration when fetched
  useEffect(() => {
    if (config) {
      setEmailChannel(config.email_channel || 'brevo');
    }
  }, [config]);

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: Partial<NotificationConfig>) => {
      return await notificationAPI.updateConfig(newConfig);
    },
    onSuccess: () => {
      showToast.success('Notification settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['notification-config'] });
    },
    onError: (error: any) => {
      showToast.error(error.response?.data?.message || 'Failed to update settings');
    },
  });

  // Test email channels mutation
  const testEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      return await notificationAPI.testEmailChannels(email);
    },
    onSuccess: (data) => {
      setTestResults(data.data || data);
      showToast.success('Test emails sent. Check your inbox.');
    },
    onError: (error: any) => {
      showToast.error(error.response?.data?.message || 'Failed to send test emails');
      setTestResults(null);
    },
  });

  const handleSave = () => {
    updateConfigMutation.mutate({
      email_channel: emailChannel,
    });
  };

  const handleTestEmail = () => {
    if (!testEmail.trim()) {
      showToast.error('Please enter a test email address');
      return;
    }

    setIsTesting(true);
    setTestResults(null);
    testEmailMutation.mutate(testEmail.trim(), {
      onSettled: () => {
        setIsTesting(false);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Email Channel Configuration */}
        <Card>
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
              Email Channel Settings
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Choose which email service to use for sending notifications. You can use Brevo, NodeMailer (Gmail), or both.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Channel
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <input
                      type="radio"
                      name="emailChannel"
                      value="brevo"
                      checked={emailChannel === 'brevo'}
                      onChange={(e) => setEmailChannel(e.target.value as EmailChannel)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">Brevo</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Use Brevo (formerly Sendinblue) for sending emails
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <input
                      type="radio"
                      name="emailChannel"
                      value="nodemailer"
                      checked={emailChannel === 'nodemailer'}
                      onChange={(e) => setEmailChannel(e.target.value as EmailChannel)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">NodeMailer (Gmail)</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Use Gmail via NodeMailer for sending emails
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <input
                      type="radio"
                      name="emailChannel"
                      value="both"
                      checked={emailChannel === 'both'}
                      onChange={(e) => setEmailChannel(e.target.value as EmailChannel)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">Both Channels</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Send emails through both Brevo and NodeMailer for redundancy
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={handleSave}
                  disabled={updateConfigMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {updateConfigMutation.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Email Channel Testing */}
        <Card>
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
              Test Email Channels
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Send test emails to verify both Brevo and NodeMailer are configured correctly.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Test Email Address
                </label>
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full"
                />
              </div>

              <Button
                onClick={handleTestEmail}
                disabled={isTesting || !testEmail.trim()}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {isTesting ? 'Sending Test Emails...' : 'Send Test Emails'}
              </Button>

              {testResults && (
                <div className="mt-4 space-y-3">
                  <div className={`p-4 rounded-lg border ${
                    testResults.brevo.success
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-gray-100">Brevo</span>
                      <span className={`text-sm font-medium ${
                        testResults.brevo.success
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-red-700 dark:text-red-300'
                      }`}>
                        {testResults.brevo.success ? '✓ Success' : '✗ Failed'}
                      </span>
                    </div>
                    {testResults.brevo.error && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {testResults.brevo.error}
                      </p>
                    )}
                  </div>

                  <div className={`p-4 rounded-lg border ${
                    testResults.nodemailer.success
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-gray-100">NodeMailer (Gmail)</span>
                      <span className={`text-sm font-medium ${
                        testResults.nodemailer.success
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-red-700 dark:text-red-300'
                      }`}>
                        {testResults.nodemailer.success ? '✓ Success' : '✗ Failed'}
                      </span>
                    </div>
                    {testResults.nodemailer.error && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {testResults.nodemailer.error}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Information Card */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Configuration Requirements
            </h2>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Brevo:</strong> Requires{' '}
                <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">BREVO_API_KEY</code>,{' '}
                <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">BREVO_SENDER_EMAIL</code>, and{' '}
                <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">BREVO_SENDER_NAME</code> environment variables.
              </div>
              <div>
                <strong className="text-gray-900 dark:text-gray-100">NodeMailer (Gmail):</strong> Requires{' '}
                <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">GMAIL_USER</code> and{' '}
                <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">GMAIL_APP_PASSWORD</code> environment variables.
                You need to generate an App Password from your Google Account settings.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

