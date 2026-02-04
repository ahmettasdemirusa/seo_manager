'use client';

import jsPDF from 'jspdf';
import { Site } from '@/types';

export const generatePdfReport = (site: Site) => {
  const doc = new jsPDF();
  const width = doc.internal.pageSize.getWidth();
  const today = new Date().toLocaleDateString();

  // --- HEADER & BRANDING ---
  doc.setFillColor(15, 23, 42); // Dark Blue Background
  doc.rect(0, 0, width, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('SEO Audit Report', 20, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(`Generated for: ${site.domain}`, 20, 28);
  doc.text(`Date: ${today}`, width - 50, 20);

  // --- SCORECARD ---
  const score = site.score;
  const scoreColor = score >= 80 ? [16, 185, 129] : score >= 50 ? [245, 158, 11] : [239, 68, 68];
  
  doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.circle(width - 30, 25, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(score.toString(), width - 33, 27);

  let y = 50;

  // --- EXECUTIVE SUMMARY ---
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.text('Executive Summary', 20, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const summaryLines = doc.splitTextToSize(site.aiAnalysis?.summary || 'No summary available.', width - 40);
  doc.text(summaryLines, 20, y);
  y += (summaryLines.length * 6) + 10;

  // --- CRITICAL METRICS ---
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.rect(20, y, width - 40, 30, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Performance', 30, y + 10);
  doc.text('SEO', 80, y + 10);
  doc.text('Accessibility', 130, y + 10);
  doc.text('Best Practices', 180, y + 10);

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(site.aiAnalysis?.data?.scores?.performance?.toString() || '0', 30, y + 20);
  doc.text(site.aiAnalysis?.data?.scores?.seo?.toString() || '0', 80, y + 20);
  doc.text(site.aiAnalysis?.data?.scores?.accessibility?.toString() || '0', 130, y + 20);
  doc.text(site.aiAnalysis?.data?.scores?.bestPractices?.toString() || '0', 180, y + 20);

  y += 45;

  // --- ACTION ITEMS ---
  doc.setFontSize(16);
  doc.text('Top Issues & Recommendations', 20, y);
  y += 10;

  if (site.aiAnalysis?.suggestions) {
    site.aiAnalysis.suggestions.slice(0, 5).forEach((issue: any) => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
        
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.rect(20, y, width - 40, 25); // Box
        
        // Priority Badge
        const pColor = issue.priority === 'Critical' ? [239, 68, 68] : [59, 130, 246];
        doc.setFillColor(pColor[0], pColor[1], pColor[2]);
        doc.rect(20, y, 2, 25, 'F'); // Left Border

        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(issue.title, 25, y + 8);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(issue.desc.substring(0, 90) + '...', 25, y + 15);
        
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(79, 70, 229); // Indigo
        doc.text(`Fix: ${issue.fix}`, 25, y + 22);

        y += 30;
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Powered by SEO AI Manager - Internal Use Only', width / 2, 290, { align: 'center' });

  doc.save(`${site.domain}-seo-report.pdf`);
};
