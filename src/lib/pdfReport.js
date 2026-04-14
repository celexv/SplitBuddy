import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateGroupReport(group, expenses, balances, settlements) {
  const doc = new jsPDF('p', 'pt', 'a4');

  // Colors based on SplitBuddy theme
  const primaryColor = [124, 58, 237]; // #7c3aed
  const successColor = [34, 197, 94];  // #22c55e
  const dangerColor = [239, 68, 68];   // #ef4444

  // Helper to format Date
  function formatDateStr(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Safe formatting for jsPDF (avoids unicode ₹ and invisible spaces like \u202F)
  function formatPDFINR(amount) {
    return 'Rs. ' + Number(amount).toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }

  // Safe text cleaner to strip out any emojis or problematic unicode that might break jspdf layout
  function cleanText(text) {
    if (!text) return '';
    return String(text)
      .replace(/[\u00A0\u202F]/g, ' ') // non-breaking spaces
      .replace(/[^\x0A\x0D\x20-\x7E\xA0-\xFF]/g, ''); // Keep ascii + common western chars + newlines, strip emojis
  }

  // 1. Header
  doc.setFontSize(24);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`SplitBuddy Report`, 40, 60);

  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text(`Group: ${group.name}`, 40, 90);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 40, 110);
  doc.text(`Total Members: ${group.members?.length || 0}`, 40, 125);
  doc.text(`Total Expenses Logged: ${expenses.length}`, 40, 140);

  // 2. Member Balances Summary
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text('Member Balances Summary', 40, 180);

  const balancesBody = balances.map((b) => [
    cleanText(b.name),
    formatPDFINR(b.totalPaid),
    formatPDFINR(b.totalOwed),
    {
      content: (b.net > 0.01 ? '+' : '') + formatPDFINR(b.net),
      styles: {
        textColor: Math.abs(b.net) < 0.01 ? [100, 100, 100] : (b.net > 0 ? successColor : dangerColor),
        fontStyle: 'bold'
      }
    }
  ]);

  autoTable(doc, {
    startY: 195,
    head: [['Member', 'Total Lent (Paid)', 'Total Borrowed', 'Net Balance']],
    body: balancesBody,
    headStyles: { fillColor: primaryColor },
    theme: 'grid',
    styles: { fontSize: 10 }
  });

  let nextY = doc.lastAutoTable.finalY + 30;

  // 3. Final Settlement Plan
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text('Final Settlement Plan', 40, nextY);

  if (settlements.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(successColor[0], successColor[1], successColor[2]);
    doc.text('All Settled! Everyone is even - no payments needed.', 40, nextY + 25);
    nextY += 45;
  } else {
    const settlementsBody = settlements.map((s) => [
      cleanText(s.from),
      '->',
      cleanText(s.to),
      { content: formatPDFINR(s.amount), styles: { fontStyle: 'bold' } }
    ]);

    autoTable(doc, {
      startY: nextY + 15,
      head: [['Who pays', '', 'Who receives', 'Amount']],
      body: settlementsBody,
      headStyles: { fillColor: [80, 80, 80] },
      theme: 'grid',
      styles: { fontSize: 10, halign: 'center' },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold' },
        1: { halign: 'center' },
        2: { halign: 'left', fontStyle: 'bold' },
        3: { halign: 'right' }
      }
    });
    nextY = doc.lastAutoTable.finalY + 30;
  }

  // Check if we need to add a new page before expenses
  if (nextY > doc.internal.pageSize.getHeight() - 100) {
    doc.addPage();
    nextY = 60;
  }

  // 4. Detailed Expenses Log
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text('Detailed Expenses Log', 40, nextY);

  if (expenses.length > 0) {
    const expensesBody = expenses.map((exp) => {
      const type = exp.isSettlement ? 'Payment' : 'Expense';
      const desc = exp.isSettlement 
        ? `Payment: ${cleanText(exp.payers?.[0]?.name)} to ${cleanText(exp.splits?.[0]?.name)}` 
        : cleanText(exp.description);
      const payers = cleanText(exp.payers?.map(p => `${p.name} (${formatPDFINR(p.amount)})`).join('\n') || '');
      const amount = formatPDFINR(exp.totalAmount);
      
      let splitDetails = '';
      if (!exp.isSettlement) {
        splitDetails = cleanText(exp.splits?.map(s => `${s.name} (${formatPDFINR(s.amount)})`).join('\n') || '');
      } else {
        splitDetails = 'N/A';
      }

      return [
        formatDateStr(exp.createdAt),
        type,
        desc,
        payers,
        splitDetails,
        amount
      ];
    });

    autoTable(doc, {
      startY: nextY + 15,
      head: [['Date', 'Type', 'Description', 'Paid By', 'Split Details', 'Total']],
      body: expensesBody,
      headStyles: { fillColor: [100, 116, 139] },
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 55 }, // Date
        1: { cellWidth: 45 }, // Type
        // Description auto-sizes to fit remaining width
        3: { cellWidth: 130 }, // Paid By
        4: { cellWidth: 130 }, // Split Details
        5: { cellWidth: 60, halign: 'right', fontStyle: 'bold' } // Total
      }
    });
  } else {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('No expenses logged yet.', 40, nextY + 25);
  }

  // Save the PDF
  const filename = `SplitBuddy_Report_${group.name.replace(/[^a-z0-9]/gi, '_')}.pdf`;
  doc.save(filename);
}
