// ── Export to Excel ──────────────────────────────────
export async function exportToExcel(data: any[], fileName: string) {
  try {
    const { utils, writeFile } = await import("xlsx");
    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Sheet1");

    // Browser download
    writeFile(workbook, `${fileName}.xlsx`);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
  }
}

// ── Export to PDF ────────────────────────────────────
export async function exportToPDF(
  title: string,
  headers: string[],
  rows: any[][],
  fileName: string
) {
  try {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235); // Primary blue color
    doc.text(title, 14, 15);

    // Table
    autoTable(doc, {
      startY: 22,
      head: [headers],
      body: rows,
      theme: "striped",
      headStyles: {
        fillColor: [37, 99, 235], // Primary blue
        textColor: 255,
        fontSize: 9,
        halign: "left",
      },
      bodyStyles: {
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { top: 20, left: 14, right: 14 },
    });

    // Browser download
    doc.save(`${fileName}.pdf`);
  } catch (error) {
    console.error("Error exporting to PDF:", error);
  }
}
