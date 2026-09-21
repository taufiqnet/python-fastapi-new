import io
from typing import Any

import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

try:
    import weasyprint
except ImportError:
    weasyprint = None

try:
    from xhtml2pdf import pisa
except ImportError:
    pisa = None


class ExcelExporter:
    """
    Scaffolds an export provider using openpyxl with styled table headers,
    autofit column widths, freeze-panes, and native calculation formulas.
    """

    @staticmethod
    def export_sheet(
        title: str,
        headers: list[str],
        data_rows: list[list[Any]],
        summary_formula_cols: list[int] | None = None,
    ) -> bytes:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = title[:31]  # Excel worksheet title max 31 chars

        # Freeze panes (keep title and header fixed)
        ws.freeze_panes = "A3"

        # Styles
        title_font = Font(name="Calibri", size=14, bold=True, color="1F2937")
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        header_fill = PatternFill(
            start_color="3B82F6", end_color="3B82F6", fill_type="solid"
        )
        data_font = Font(name="Calibri", size=10, color="374151")
        summary_font = Font(name="Calibri", size=11, bold=True, color="1F2937")
        thin_border = Border(
            left=Side(style="thin", color="E5E7EB"),
            right=Side(style="thin", color="E5E7EB"),
            top=Side(style="thin", color="E5E7EB"),
            bottom=Side(style="thin", color="E5E7EB"),
        )
        top_thick_bottom_double = Border(
            top=Side(style="thin", color="1F2937"),
            bottom=Side(style="double", color="1F2937"),
        )

        # Title Row
        ws.cell(row=1, column=1, value=title).font = title_font

        # Header Row
        for col_idx, header in enumerate(headers, start=1):
            cell = ws.cell(row=2, column=col_idx, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = thin_border

        # Data Rows
        current_row = 3
        for row_data in data_rows:
            for col_idx, val in enumerate(row_data, start=1):
                cell = ws.cell(row=current_row, column=col_idx, value=val)
                cell.font = data_font
                cell.border = thin_border
                if isinstance(val, (int, float)):
                    cell.alignment = Alignment(horizontal="right")
                elif isinstance(val, str) and val.startswith("="):
                    cell.alignment = Alignment(horizontal="right")
                else:
                    cell.alignment = Alignment(horizontal="left")
            current_row += 1

        # Native Summary Formulas Row
        if summary_formula_cols and data_rows:
            ws.cell(row=current_row, column=1, value="Total").font = summary_font
            ws.cell(row=current_row, column=1).border = top_thick_bottom_double

            for col_idx in summary_formula_cols:
                col_letter = get_column_letter(col_idx)
                formula = f"=SUM({col_letter}3:{col_letter}{current_row - 1})"
                cell = ws.cell(row=current_row, column=col_idx, value=formula)
                cell.font = summary_font
                cell.border = top_thick_bottom_double
                cell.alignment = Alignment(horizontal="right")

        # Autofit Columns
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                val_str = str(cell.value or "")
                if len(val_str) > max_len:
                    max_len = len(val_str)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output.getvalue()


class PdfExporter:
    """
    Printable HTML-to-PDF renderer using Jinja2 templates processed via
    WeasyPrint (with xhtml2pdf / raw HTML fallback).
    """

    @staticmethod
    def render_pdf_from_html(html_content: str) -> bytes:
        if weasyprint is not None:
            return weasyprint.HTML(string=html_content).write_pdf()

        if pisa is not None:
            pdf_buffer = io.BytesIO()
            pisa_status = pisa.CreatePDF(html_content, dest=pdf_buffer)
            if not pisa_status.err:
                pdf_buffer.seek(0)
                return pdf_buffer.getvalue()

        # Fallback to UTF-8 bytes if PDF engine is missing
        return html_content.encode("utf-8")
