import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Lead } from '@/types';

export const exportToExcel = (leads: Lead[], filename: string = 'leads') => {
  // Prepare data for export
  const exportData = leads.map((lead) => ({
    'Enquiry Number': lead.enquiryNumber || '',
    'Hall Ticket Number': lead.hallTicketNumber || '',
    'Name': lead.name,
    'Phone': lead.phone,
    'Email': lead.email || '',
    'Father Name': lead.fatherName,
    'Father Phone': lead.fatherPhone,
    'Mother Name': lead.motherName || '',
    'Village': lead.village,
    'District': lead.district,
    'Mandal': lead.mandal,
    'State': lead.state,
    'Gender': lead.gender || '',
    'Course Interested': lead.courseInterested || '',
    'Inter College': lead.interCollege || '',
    'Rank': lead.rank ?? '',
    'Quota': lead.quota,
    'Application Status': lead.applicationStatus || '',
    'Lead Status': lead.leadStatus || '',
    'Source': lead.source || '',
    'Created At': lead.createdAt ? new Date(lead.createdAt).toLocaleString() : '',
    'Updated At': lead.updatedAt ? new Date(lead.updatedAt).toLocaleString() : '',
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

  // Download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToCSV = (leads: Lead[], filename: string = 'leads') => {
  // Prepare data for export
  const exportData = leads.map((lead) => ({
    'Enquiry Number': lead.enquiryNumber || '',
    'Hall Ticket Number': lead.hallTicketNumber || '',
    'Name': lead.name,
    'Phone': lead.phone,
    'Email': lead.email || '',
    'Father Name': lead.fatherName,
    'Father Phone': lead.fatherPhone,
    'Mother Name': lead.motherName || '',
    'Village': lead.village,
    'District': lead.district,
    'Mandal': lead.mandal,
    'State': lead.state,
    'Gender': lead.gender || '',
    'Course Interested': lead.courseInterested || '',
    'Inter College': lead.interCollege || '',
    'Rank': lead.rank ?? '',
    'Quota': lead.quota,
    'Application Status': lead.applicationStatus || '',
    'Lead Status': lead.leadStatus || '',
    'Source': lead.source || '',
    'Created At': lead.createdAt ? new Date(lead.createdAt).toLocaleString() : '',
    'Updated At': lead.updatedAt ? new Date(lead.updatedAt).toLocaleString() : '',
  }));

  // Convert to CSV
  const csv = Papa.unparse(exportData);

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

