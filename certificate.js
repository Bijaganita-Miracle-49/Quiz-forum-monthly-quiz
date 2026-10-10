/* Certificate PDF (landscape A4) built with jsPDF. All text is real, selectable PDF text. */
(function () {
  "use strict";

  var NAVY = [20, 33, 61], GOLD = [184, 144, 42], GOLD_L = [226, 196, 110], GREY = [90, 98, 112];

  function fitText(doc, text, maxWidth, startSize, minSize) {
    var size = startSize;
    doc.setFontSize(size);
    while (size > minSize && doc.getTextWidth(text) > maxWidth) {
      size -= 1;
      doc.setFontSize(size);
    }
    return size;
  }

  function centered(doc, text, y, size, font, style, color, charSpace) {
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(text, 148.5, y, { align: "center", charSpace: charSpace || 0 });
  }

  /**
   * data: { name, score, total, percentage, completedAt (Date), certId, edition,
   *         quizName, organizer, certificateTitle, coordinatorTitle, demo }
   * returns a jsPDF document
   */
  function buildCertificate(data) {
    var jsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDF) throw new Error("PDF library failed to load.");
    var doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" }); // 297 x 210

    // --- Border: navy outer, gold inner, corner squares ---
    doc.setFillColor(255, 253, 246); doc.rect(0, 0, 297, 210, "F");
    doc.setDrawColor.apply(doc, NAVY); doc.setLineWidth(2.2); doc.rect(8, 8, 281, 194);
    doc.setDrawColor.apply(doc, GOLD); doc.setLineWidth(0.8); doc.rect(12, 12, 273, 186);
    doc.setDrawColor.apply(doc, GOLD_L); doc.setLineWidth(0.3); doc.rect(14, 14, 269, 182);
    doc.setFillColor.apply(doc, GOLD);
    [[12, 12], [285, 12], [12, 198], [285, 198]].forEach(function (c) {
      doc.rect(c[0] - 3, c[1] - 3, 6, 6, "F");
    });

    // --- Header ---
    centered(doc, (data.organizer || "Quiz Forum").toUpperCase(), 34, 15, "helvetica", "bold", NAVY, 0);
    doc.setDrawColor.apply(doc, GOLD); doc.setLineWidth(0.6); doc.line(118, 38, 179, 38);
    centered(doc, data.certificateTitle || "Certificate of Participation", 56, 34, "times", "bold", NAVY);

    centered(doc, "This certificate is proudly presented to", 72, 13, "helvetica", "normal", GREY);

    // --- Participant name (shrinks to fit; never an image) ---
    var name = String(data.name || "");
    doc.setFont("times", "bolditalic");
    var size = fitText(doc, name, 220, 40, 14);
    doc.setTextColor.apply(doc, [138, 106, 16]);
    doc.setFontSize(size);
    doc.text(name, 148.5, 92, { align: "center" });
    doc.setDrawColor.apply(doc, GOLD); doc.setLineWidth(0.5); doc.line(48, 97, 249, 97);

    centered(doc, "for taking part in the", 109, 13, "helvetica", "normal", GREY);
    var quizName = data.quizName || "Monthly General Knowledge & Current Affairs Quiz";
    doc.setFont("helvetica", "bold");
    var qs = fitText(doc, quizName, 230, 20, 12);
    doc.setTextColor.apply(doc, NAVY); doc.setFontSize(qs);
    doc.text(quizName, 148.5, 121, { align: "center" });
    centered(doc, (data.edition || "") + " Edition", 130, 14, "helvetica", "normal", NAVY);

    centered(doc, "Score: " + data.score + " / " + data.total + "   (" + data.percentage + "%)", 143, 16, "helvetica", "bold", [138, 106, 16]);

    // --- Footer columns ---
    var dateStr = (data.completedAt instanceof Date ? data.completedAt : new Date(data.completedAt))
      .toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    doc.setDrawColor.apply(doc, NAVY); doc.setLineWidth(0.4);
    doc.line(30, 175, 90, 175);       // date line
    doc.line(207, 175, 267, 175);     // signature line
    centered2(doc, dateStr, 60, 171, 12, "helvetica", "bold", NAVY);
    centered2(doc, "Date of completion", 60, 180, 9, "helvetica", "normal", GREY);
    centered2(doc, data.coordinatorTitle || "Quiz Forum Coordinator", 237, 180, 9, "helvetica", "normal", GREY);
    centered2(doc, "Signature", 237, 185, 8, "helvetica", "italic", GREY);

    centered2(doc, "Certificate ID", 148.5, 166, 9, "helvetica", "normal", GREY);
    centered2(doc, String(data.certId), 148.5, 173, 13, "courier", "bold", NAVY);

    centered(doc, "This is a Quiz Forum participation certificate. It is not an accredited qualification.", 192, 8, "helvetica", "italic", GREY);

    if (data.demo) {
      doc.setTextColor(200, 40, 40); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text("DEMO COPY - result was not recorded by the organiser", 148.5, 20, { align: "center" });
    }

    doc.setProperties({
      title: (data.certificateTitle || "Certificate of Participation") + " - " + name,
      subject: quizName + " - " + (data.edition || ""),
      creator: data.organizer || "Quiz Forum"
    });
    return doc;
  }

  function centered2(doc, text, x, y, size, font, style, color) {
    doc.setFont(font, style); doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(text, x, y, { align: "center" });
  }

  function fileName(data) {
    var safe = String(data.name).replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "Participant";
    return "QuizForum_Certificate_" + safe + ".pdf";
  }

  window.QFCertificate = { build: buildCertificate, fileName: fileName };
})();
