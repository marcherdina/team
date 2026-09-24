import jsPDF from 'jspdf';
import { TeamAnalytics, AiActionPlan } from '../types';
import { WeekFactors } from './algorithm';

export function generateTeamPdfReport(
  analytics: TeamAnalytics,
  weekFactors: WeekFactors,
  aiPlan?: AiActionPlan | null
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.getImageProperties ? 210 : 210;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // 1. Top Header Accent (Dark Bar)
  doc.setFillColor(0, 0, 0); // Modern Black #000000
  doc.rect(margin, y, contentWidth, 2, 'F');
  y += 8;

  // 2. Title & Metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('TEAM PULSE • TEAMRUNDE AGIL & ANONYM', margin, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(`KW ${weekFactors.kw} / ${weekFactors.year}`, pageWidth - margin, y, { align: 'right' });
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text('Team-Puls Auswertung', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Erstellt am ${new Date().toLocaleDateString('de-DE')} • ${analytics.count} anonyme Teilnehmer • Woche ab ${weekFactors.mondayFullDate}`,
    margin,
    y
  );
  y += 8;

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // 3. Summary Score Box
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, y, contentWidth, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(`${analytics.overallPercentage}%`, margin + 8, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text('GESAMT-TEAM-PULS', margin + 8, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(`Ø ${analytics.averageScore} / 5.0`, margin + 65, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text('DURCHSCHNITTS-SCORE', margin + 65, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(241, 2, 2);
  doc.text(analytics.healthVerdict.title.toUpperCase(), pageWidth - margin - 8, y + 15, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text('STIMMUNGS-STATUS', pageWidth - margin - 8, y + 7, { align: 'right' });

  y += 30;

  // 4. Questions Breakdown Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('1. Detail-Auswertung nach Fragen (ID-Zuordnung)', margin, y);
  y += 6;

  // Table header
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, contentWidth, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  doc.text('ID', margin + 3, y + 4.2);
  doc.text('THEMA & FRAGETITEL', margin + 14, y + 4.2);
  doc.text('KATEGORIE', margin + 115, y + 4.2);
  doc.text('SCORE', pageWidth - margin - 22, y + 4.2);
  doc.text('PULS', pageWidth - margin - 3, y + 4.2, { align: 'right' });
  y += 8;

  // Table rows
  analytics.questionStats.forEach((qs, i) => {
    if (y > 265) {
      doc.addPage();
      y = 20;
    }

    const isEven = i % 2 === 0;
    if (isEven) {
      doc.setFillColor(252, 252, 252);
      doc.rect(margin, y - 3, contentWidth, 6, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text(`#${qs.questionId < 10 ? '0' + qs.questionId : qs.questionId}`, margin + 3, y + 1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(20, 20, 20);
    const shortTitle = qs.title.length > 55 ? qs.title.slice(0, 52) + '...' : qs.title;
    doc.text(shortTitle, margin + 14, y + 1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(qs.tag, margin + 115, y + 1);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(qs.averageScore >= 3.8 ? 0 : 200, qs.averageScore < 3.0 ? 0 : 0, 0);
    doc.text(`Ø ${qs.averageScore.toFixed(1)}`, pageWidth - margin - 22, y + 1);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(qs.percentage >= 75 ? 0 : 241, qs.percentage >= 75 ? 0 : 2, qs.percentage >= 75 ? 0 : 2);
    doc.text(`${qs.percentage}%`, pageWidth - margin - 3, y + 1, { align: 'right' });

    y += 5.5;
  });

  y += 4;

  // 5. Custom Question Section (if available)
  if (analytics.customQuestionStats && analytics.customQuestionStats.count > 0) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('2. Custom Frage (Teams-Spontanabstimmung)', margin, y);
    y += 6;

    doc.setFillColor(248, 248, 248);
    doc.rect(margin, y, contentWidth, 14, 'F');
    doc.setDrawColor(225, 225, 225);
    doc.rect(margin, y, contentWidth, 14, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(
      `Ergebnis: Ø ${analytics.customQuestionStats.averageScore} / 5.0 (${analytics.customQuestionStats.percentage}%) • ${analytics.customQuestionStats.count} Stimmen`,
      margin + 4,
      y + 5
    );

    const commentsList = analytics.customQuestionStats.comments.length > 0
      ? analytics.customQuestionStats.comments.map((c) => `"${c}"`).join('  •  ')
      : 'Keine Kommentare';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text(`Kommentare (max. 10 Zeichen): ${commentsList}`, margin + 4, y + 10);

    y += 20;
  }

  // 6. Action Plan / AI Hebel to reach > 80%
  if (aiPlan) {
    if (y > 220) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('3. Maßnahmenplan: KI-Empfehlungen für Stimmungsbild > 80%', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Aktuell: ${aiPlan.currentPercentage}%  ->  Ziel: ${aiPlan.targetPercentage}% • ${aiPlan.summary}`,
      margin,
      y
    );
    y += 6;

    aiPlan.actions.forEach((act) => {
      if (y > 265) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(230, 230, 230);
      doc.rect(margin, y, contentWidth, 13, 'S');

      // Red small tag
      doc.setFillColor(241, 2, 2);
      doc.rect(margin, y, 2, 13, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(`Priorität ${act.priority}: ${act.title}`, margin + 5, y + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(80, 80, 80);
      const rec = act.recommendation.length > 95 ? act.recommendation.slice(0, 92) + '...' : act.recommendation;
      doc.text(rec, margin + 5, y + 9);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      doc.text(act.potentialImpact, pageWidth - margin - 4, y + 4.5, { align: 'right' });

      y += 15;
    });
  }

  // 7. Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(
      'TEAM PULSE • Vertraulicher Teamrunden-Report • Anonymisiert & DSGVO-konform',
      margin,
      288
    );
    doc.text(`Seite ${i} von ${totalPages}`, pageWidth - margin, 288, { align: 'right' });
  }

  // Save the PDF
  doc.save(`Team-Puls-KW${weekFactors.kw}-${weekFactors.year}.pdf`);
}
