import * as XLSX from 'xlsx';

export interface ExportTableData {
  headers: string[];
  rows: (string | number)[][];
}

export function exportToExcelFile(tableId: string, data: ExportTableData, customFileName?: string) {
  const { headers, rows } = data;
  const fileName = customFileName || `${tableId}_${new Date().toISOString().split('T')[0]}.xlsx`;

  // Create worksheet with headers and rows
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  // Set automatic column widths
  const colWidths = headers.map((header, colIndex) => {
    let maxLength = header.length;
    rows.forEach(row => {
      const val = row[colIndex] ? String(row[colIndex]) : '';
      if (val.length > maxLength) maxLength = val.length;
    });
    return { wch: Math.min(Math.max(maxLength + 3, 10), 40) };
  });
  ws['!cols'] = colWidths;

  // Create workbook and append sheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, tableId.slice(0, 31)); // sheet names max 31 chars

  // Generate binary and download
  XLSX.writeFile(wb, fileName);
}

export function exportToCsvFile(tableId: string, data: ExportTableData, customFileName?: string) {
  const { headers, rows } = data;
  const fileName = customFileName || `${tableId}_${new Date().toISOString().split('T')[0]}.csv`;

  // Build CSV string with UTF-8 BOM for Excel compatibility
  const escapeCsv = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows: string[] = [];
  csvRows.push(headers.map(escapeCsv).join(','));
  
  rows.forEach(row => {
    csvRows.push(row.map(escapeCsv).join(','));
  });

  const csvContent = '\uFEFF' + csvRows.join('\n'); // UTF-8 BOM
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
