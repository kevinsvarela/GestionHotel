import { Service } from '@angular/core';
import jsPDF from 'jspdf';
import { autoTable, CellInput } from 'jspdf-autotable';

export interface SeccionReporte {
  titulo: string;
  columnas: string[];
  filas: CellInput[][];
  pie?: CellInput[];
  derecha?: number[];
}

export interface DocumentoReporte {
  titulo: string;
  subtitulo: string;
  resumen: string[];
  secciones: SeccionReporte[];
  archivo?: string;
}

type DocumentoConTabla = jsPDF & { lastAutoTable?: { finalY: number } };

const VERDE: [number, number, number] = [21, 86, 0];
const TEXTO: [number, number, number] = [53, 45, 57];
const GRIS: [number, number, number] = [110, 104, 113];

function limpiar(valor: CellInput): CellInput {
  return typeof valor === 'string' ? valor.replace(/₡/g, '¢') : valor;
}

@Service()
export class PrintService {
  print(columnHeaders: string[], rows: CellInput[][], title: string, save = false): void {
    this.imprimir({ titulo: title, subtitulo: '', resumen: [], secciones: [{ titulo: '', columnas: columnHeaders, filas: rows }] }, save);
  }

  imprimir(reporte: DocumentoReporte, save = false): void {
    const doc: DocumentoConTabla = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'letter'});

    const ancho = doc.internal.pageSize.getWidth();
    const alto = doc.internal.pageSize.getHeight();
    const margen = 32;

    doc.setFillColor(...VERDE);
    doc.rect(0, 0, ancho, 6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...VERDE);
    doc.text('Gestión Hotel', margen, 28);

    doc.setFontSize(16);
    doc.setTextColor(...TEXTO);
    doc.text(reporte.titulo, margen, 46);

    let y = 60;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRIS);
    if (reporte.subtitulo !== '') {
      doc.text(reporte.subtitulo, margen, y);
      y += 14;
    }

    if (reporte.resumen.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEXTO);
      const lineas: string[] = doc.splitTextToSize(String(limpiar(reporte.resumen.join('     '))), ancho - margen * 2);
      doc.text(lineas, margen, y);
      y += lineas.length * 12 + 6;
    }

    for (const seccion of reporte.secciones) {
      if (y > alto - 90) {
        doc.addPage();
        y = 40;
      }

      if (seccion.titulo !== '') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...VERDE);
        doc.text(seccion.titulo, margen, y + 4);
        y += 12;
      }

      const columnStyles: Record<string, { halign: 'right' }> = {};
      for (const indice of seccion.derecha ?? []) {
        columnStyles[String(indice)] = { halign: 'right' };
      }

      const cuerpo: CellInput[][] = seccion.filas.length > 0
        ? seccion.filas.map((fila) => fila.map(limpiar))
        : [[{ content: 'Sin datos en este rango de fechas', colSpan: seccion.columnas.length, styles: { halign: 'center', textColor: GRIS } }]];

      autoTable(doc, {
        startY: y,
        head: [seccion.columnas],
        body: cuerpo,
        foot: seccion.pie && seccion.filas.length > 0 ? [seccion.pie.map(limpiar)] : undefined,
        showFoot: 'lastPage',
        margin: { left: margen, right: margen },
        styles: { fontSize: 8, cellPadding: 4, textColor: TEXTO },
        headStyles: { fillColor: VERDE, textColor: [255, 255, 255], fontStyle: 'bold' },
        footStyles: { fillColor: [238, 241, 236], textColor: TEXTO, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [247, 249, 246] },
        columnStyles,
      });

      y = (doc.lastAutoTable?.finalY ?? y) + 22;
    }

    const paginas = doc.getNumberOfPages();
    for (let pagina = 1; pagina <= paginas; pagina++) {
      doc.setPage(pagina);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...GRIS);
      doc.text(`Página ${pagina} de ${paginas}`, ancho - margen, alto - 16, { align: 'right' });
    }

    if (save) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      doc.save(`${reporte.archivo ?? 'reporte'}-${timestamp}.pdf`);
    } else {
      doc.output('dataurlnewwindow');
    }
  }
}
