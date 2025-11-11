'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { auth } from '@/lib/auth';
import { leadAPI } from '@/lib/api';
import { LeadUploadData, BulkUploadResponse, BulkUploadInspectResponse } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

export default function BulkUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkUploadResponse | null>(null);
  const [source, setSource] = useState('Bulk Upload');
  const [error, setError] = useState<string | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [sheetPreviews, setSheetPreviews] = useState<Record<string, LeadUploadData[]>>({});
  const [fileType, setFileType] = useState<'excel' | 'csv' | null>(null);
  const [uploadToken, setUploadToken] = useState<string | null>(null);
  const [analysisInfo, setAnalysisInfo] = useState<{ previewAvailable: boolean; previewDisabledReason?: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearProgressInterval = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const clearProgressResetTimeout = () => {
    if (progressResetTimeoutRef.current) {
      clearTimeout(progressResetTimeoutRef.current);
      progressResetTimeoutRef.current = null;
    }
  };

  type PreviewRow = LeadUploadData & { __sheetName?: string };

  const toggleSheetSelection = (sheet: string) => {
    setSelectedSheets((prev) =>
      prev.includes(sheet) ? prev.filter((name) => name !== sheet) : [...prev, sheet]
    );
  };

  const selectAllSheets = () => {
    setSelectedSheets(sheetNames);
  };

  const clearAllSheets = () => {
    setSelectedSheets([]);
  };

  const previewRows = useMemo<PreviewRow[]>(() => {
    if (fileType === 'excel') {
      return selectedSheets.flatMap((sheet) =>
        (sheetPreviews[sheet] || []).map((row) => ({ ...row, __sheetName: sheet }))
      );
    }

    return Object.entries(sheetPreviews).flatMap(([sheet, rows]) =>
      rows.map((row) => ({ ...row, __sheetName: sheet }))
    );
  }, [fileType, selectedSheets, sheetPreviews]);

  const limitedPreviewRows = useMemo<PreviewRow[]>(() => previewRows.slice(0, 10), [previewRows]);

  useEffect(() => {
    const currentUser = auth.getUser();
    if (!currentUser || currentUser.roleName !== 'Super Admin') {
      router.push('/auth/login');
      return;
    }
  }, [router]);

  useEffect(() => {
    return () => {
      clearProgressInterval();
      clearProgressResetTimeout();
    };
  }, []);

  useEffect(() => {
    if (isUploading) {
      clearProgressResetTimeout();
      setUploadProgress((prev) => (prev > 5 ? prev : 5));
      clearProgressInterval();
      progressIntervalRef.current = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 92) {
            return prev;
          }
          const increment = Math.random() * 6 + 3;
          return Math.min(prev + increment, 92);
        });
      }, 500);
    } else {
      clearProgressInterval();
      setUploadProgress((prev) => {
        if (prev === 0) {
          return 0;
        }
        if (prev < 100) {
          return 100;
        }
        return prev;
      });
      clearProgressResetTimeout();
      progressResetTimeoutRef.current = setTimeout(() => {
        setUploadProgress(0);
      }, 800);
    }

    return () => {
      clearProgressInterval();
    };
  }, [isUploading]);

  const analyzeFile = async (selectedFile: File) => {
    setIsAnalyzing(true);
    setAnalysisInfo(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const analysis = (await leadAPI.inspectBulkUpload(formData)) as BulkUploadInspectResponse | undefined;

      if (!analysis) {
        throw new Error('No analysis data received');
      }

      setUploadToken(analysis.uploadToken);
      setFileType(analysis.fileType);
      setSheetNames(analysis.sheetNames || []);
      setSelectedSheets(analysis.sheetNames || []);
      setSheetPreviews(analysis.previewAvailable ? analysis.previews ?? {} : {});
      setAnalysisInfo({
        previewAvailable: analysis.previewAvailable,
        previewDisabledReason: analysis.previewDisabledReason,
      });
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to analyze file. Please try again.';
      setError(message);
      setFile(null);
      setUploadToken(null);
      setSheetNames([]);
      setSelectedSheets([]);
      setSheetPreviews({});
      setFileType(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setUploadResult(null);
    setSheetNames([]);
    setSelectedSheets([]);
    setSheetPreviews({});
    setUploadToken(null);
    setFileType(null);
    setAnalysisInfo(null);
    setFile(selectedFile);

    await analyzeFile(selectedFile);
  };

  const handleBulkUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    if (isAnalyzing) {
      setError('File analysis in progress. Please wait.');
      return;
    }

    if (fileType === 'excel' && selectedSheets.length === 0) {
      setError('Select at least one worksheet to include in the upload.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      if (uploadToken) {
        formData.append('uploadToken', uploadToken);
      } else {
        formData.append('file', file);
      }
      formData.append('source', source || 'Bulk Upload');

      if (fileType === 'excel') {
        formData.append('selectedSheets', JSON.stringify(selectedSheets));
      }

      const response = (await leadAPI.bulkUpload(formData)) as BulkUploadResponse | undefined;
      if (!response) {
        throw new Error('Upload response was empty');
      }
      setUploadResult(response);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Upload failed. Please try again.';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = (format: 'csv' | 'excel') => {
    // Template data with sample row
    // Note: enquiryNumber is auto-generated, not included in template
    const templateData = [
      {
        hallTicketNumber: 'HT123456',
        name: 'John Doe',
        phone: '9876543210',
        email: 'john@example.com',
        fatherName: 'Father Name',
        fatherPhone: '9876543211',
        motherName: 'Mother Name',
        gender: 'Male',
        village: 'Village Name',
        district: 'District Name',
        courseInterested: 'Engineering',
        interCollege: 'ABC Junior College',
        rank: 125,
        mandal: 'Mandal Name',
        state: 'State Name',
        quota: 'Not Applicable',
        applicationStatus: 'Qualified',
      },
    ];

    if (format === 'csv') {
      // Create CSV
      const headers = [
        'hallTicketNumber',
        'name',
        'phone',
        'email',
        'fatherName',
        'fatherPhone',
        'motherName',
        'gender',
        'village',
        'district',
        'courseInterested',
        'interCollege',
        'rank',
        'mandal',
        'state',
        'quota',
        'applicationStatus',
      ];
      
      const csvContent = [
        headers.join(','),
        ...templateData.map((row) =>
          headers.map((header) => {
            const value = row[header as keyof typeof row] || '';
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        ),
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'lead_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Create Excel
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
      
      // Download Excel
      XLSX.writeFile(workbook, 'lead_template.xlsx');
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background gradient effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 pointer-events-none"></div>
      
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Bulk Upload Leads</h1>
                <p className="text-sm text-gray-600">Upload Excel or CSV files with lead data</p>
              </div>
              <Button variant="outline" onClick={() => router.push('/superadmin/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Upload File</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadTemplate('csv')}
                  className="group"
                >
                  <span className="group-hover:scale-105 transition-transform inline-block">Download CSV Template</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadTemplate('excel')}
                  className="group"
                >
                  <span className="group-hover:scale-105 transition-transform inline-block">Download Excel Template</span>
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <Input
                label="Source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g., Website, Campaign, Walk-in"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File (Excel or CSV)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose File
                  </Button>
                  {file && (
                    <span className="flex items-center text-sm text-gray-600">
                      {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-4 bg-gradient-to-r from-red-50 to-red-100/50 border-2 border-red-200 rounded-xl shadow-sm">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}

              {isAnalyzing && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-600 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                  <span>Analyzing workbook… please wait.</span>
                </div>
              )}

              {analysisInfo?.previewAvailable === false && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  {analysisInfo.previewDisabledReason || 'Preview disabled for this file. Data will still be processed on upload.'}
                </div>
              )}

              {fileType === 'excel' && sheetNames.length > 0 && (
                <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-white/60">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">Worksheets detected ({sheetNames.length})</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllSheets}
                        disabled={sheetNames.length === 0 || isAnalyzing || isUploading}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAllSheets}
                        disabled={selectedSheets.length === 0 || isAnalyzing || isUploading}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sheetNames.map((sheet) => (
                      <label
                        key={sheet}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition ${selectedSheets.includes(sheet) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700'}`}
                      >
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={selectedSheets.includes(sheet)}
                          onChange={() => toggleSheetSelection(sheet)}
                          disabled={isAnalyzing || isUploading}
                        />
                        <span className="text-xs font-medium">{sheet}</span>
                      </label>
                    ))}
                  </div>
                  {selectedSheets.length === 0 && !isAnalyzing && (
                    <p className="text-xs text-red-600 mt-2">Select at least one worksheet to include in the upload.</p>
                  )}
                </div>
              )}

              {analysisInfo?.previewAvailable !== false && limitedPreviewRows.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Preview (first 10 rows):
                  </p>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Worksheet</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Name</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Phone</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Mandal</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">State</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white/50 divide-y divide-gray-200">
                        {limitedPreviewRows.map((lead: PreviewRow, index) => (
                          <tr key={index} className="hover:bg-blue-50/50">
                            <td className="px-4 py-2 text-sm text-gray-500">{lead.__sheetName || (fileType === 'excel' ? '-' : 'CSV')}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{lead.name || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{lead.phone || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{lead.mandal || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{lead.state || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Note: Enquiry numbers will be auto-generated in format ENQ{new Date().getFullYear().toString().slice(-2)}000001
                  </p>
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                onClick={handleBulkUpload}
                isLoading={isUploading}
                disabled={!file || isAnalyzing || (fileType === 'excel' && selectedSheets.length === 0) || isUploading}
                className="w-full"
              >
                {isUploading
                  ? `Uploading… ${Math.min(100, Math.max(5, Math.round(uploadProgress)))}%`
                  : `Upload ${file ? file.name : 'File'}`}
              </Button>
              {uploadProgress > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{isUploading ? 'Processing file…' : 'Finalizing results…'}</span>
                    <span>{Math.min(100, Math.max(1, Math.round(uploadProgress)))}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-200/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.round(uploadProgress))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {uploadResult && (
            <Card>
              <h3 className="text-lg font-semibold mb-4">Upload Results</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-blue-600">{uploadResult.total}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Success</p>
                    <p className="text-2xl font-bold text-green-600">{uploadResult.success}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-gray-600">Errors</p>
                    <p className="text-2xl font-bold text-red-600">{uploadResult.errors}</p>
                  </div>
                </div>

                {typeof uploadResult.durationMs === 'number' && (
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">Processing Time</p>
                    <p className="text-lg font-semibold text-purple-700">{(uploadResult.durationMs / 1000).toFixed(1)} s</p>
                  </div>
                )}

                {uploadResult.sheetsProcessed && uploadResult.sheetsProcessed.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Worksheets processed</p>
                    <p className="text-sm font-medium text-gray-900">
                      {uploadResult.sheetsProcessed.join(', ')}
                    </p>
                  </div>
                )}

                {uploadResult.errorDetails && uploadResult.errorDetails.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Error Details (first 100):</p>
                    <div className="max-h-60 overflow-y-auto border rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Worksheet</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Row</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Error</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {uploadResult.errorDetails.map((error, index) => (
                            <tr key={index} className="hover:bg-red-50/50">
                              <td className="px-4 py-2 text-sm text-gray-600">{error.sheet || '-'}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{error.row}</td>
                              <td className="px-4 py-2 text-sm text-red-600">{error.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <Button
                  variant="primary"
                  onClick={() => router.push('/superadmin/leads')}
                >
                  View All Leads
                </Button>
              </div>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

