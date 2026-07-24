// Builds and downloads a PDF from Editor.js output. jsPDF is browser-only and
// ~350KB, so it's imported dynamically (only when the user clicks Export) to
// keep it out of the main bundle.

function strip(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

// @editorjs/list items can be plain strings or { content, items } objects.
function itemText(item) {
  if (typeof item === "string") return strip(item);
  return strip(item?.content ?? item?.text ?? "");
}

export async function downloadDocumentPdf(output, title = "Document") {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });

  const margin = 48;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (h) => {
    if (y + h > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const write = (
    text,
    { size = 11, style = "normal", font = "helvetica", indent = 0, color = [17, 17, 17], gapAfter = 6 } = {}
  ) => {
    pdf.setFont(font, style);
    pdf.setFontSize(size);
    pdf.setTextColor(color[0], color[1], color[2]);
    const lineHeight = size * 1.35;
    const lines = pdf.splitTextToSize(text || " ", contentWidth - indent);
    lines.forEach((line) => {
      ensureSpace(lineHeight);
      pdf.text(line, margin + indent, y);
      y += lineHeight;
    });
    y += gapAfter;
  };

  // Title
  write(title, { size: 22, style: "bold", gapAfter: 10 });

  const HEADER_SIZES = { 1: 18, 2: 16, 3: 14, 4: 12, 5: 12, 6: 12 };

  (output?.blocks ?? []).forEach((block) => {
    const d = block?.data ?? {};
    switch (block?.type) {
      case "header":
        write(strip(d.text), { size: HEADER_SIZES[d.level] || 14, style: "bold" });
        break;
      case "paragraph":
        write(strip(d.text));
        break;
      case "quote":
        write(strip(d.text), { style: "italic", indent: 16 });
        if (d.caption)
          write(`— ${strip(d.caption)}`, { size: 10, style: "italic", indent: 16, color: [110, 110, 110] });
        break;
      case "alert":
        write(`${String(d.type || "note").toUpperCase()}: ${strip(d.message)}`, { style: "bold" });
        break;
      case "code":
        write(String(d.code ?? ""), { size: 10, font: "courier" });
        break;
      case "list": {
        const ordered = d.style === "ordered";
        (d.items ?? []).forEach((item, i) =>
          write(`${ordered ? `${i + 1}.` : "•"}  ${itemText(item)}`, { indent: 14, gapAfter: 2 })
        );
        y += 4;
        break;
      }
      case "checklist":
        (d.items ?? []).forEach((item) =>
          write(`${item?.checked ? "[x]" : "[ ]"}  ${strip(item?.text)}`, { indent: 14, gapAfter: 2 })
        );
        y += 4;
        break;
      case "table":
        (d.content ?? []).forEach((row) =>
          write(row.map((c) => strip(c)).join("   |   "), { size: 10, gapAfter: 2 })
        );
        y += 4;
        break;
      case "delimiter":
        ensureSpace(20);
        pdf.setDrawColor(200);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 20;
        break;
      default:
        break;
    }
  });

  const safeName = (title || "document").replace(/[^\w.-]+/g, "_");
  pdf.save(`${safeName}.pdf`);
}
