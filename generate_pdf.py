import pymupdf
import os
import re

md_path = "/Users/macm2/.gemini/antigravity/scratch/blood-bank-management-system/docs/SRS_Blood_Bank_Management_System.md"
pdf_path = "/Users/macm2/.gemini/antigravity/scratch/blood-bank-management-system/docs/SRS_Blood_Bank_Management_System.pdf"

with open(md_path, "r", encoding="utf-8") as f:
    text = f.read()

# Build formatted HTML representation for PyMuPDF Story
def md_to_html(md_text):
    html = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@page {
    size: A4;
    margin: 36pt 40pt;
}
body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 9.5pt;
    line-height: 1.45;
    color: #1e293b;
}
h1 {
    font-size: 20pt;
    font-weight: 800;
    color: #991b1b;
    border-bottom: 2pt solid #b91c1c;
    padding-bottom: 6px;
    margin-top: 15px;
    margin-bottom: 8px;
}
h2 {
    font-size: 14pt;
    font-weight: 700;
    color: #1e293b;
    border-bottom: 1pt solid #cbd5e1;
    padding-bottom: 4px;
    margin-top: 18px;
    margin-bottom: 6px;
}
h3 {
    font-size: 11.5pt;
    font-weight: 700;
    color: #334155;
    margin-top: 12px;
    margin-bottom: 4px;
}
h4 {
    font-size: 10pt;
    font-weight: 600;
    color: #475569;
    margin-top: 8px;
    margin-bottom: 3px;
}
p {
    margin: 4px 0;
}
ul, ol {
    margin: 4px 0;
    padding-left: 18px;
}
li {
    margin-bottom: 2px;
}
table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 8.5pt;
}
th, td {
    border: 1px solid #cbd5e1;
    padding: 5px 7px;
    text-align: left;
}
th {
    background-color: #f1f5f9;
    font-weight: 700;
    color: #0f172a;
}
tr:nth-child(even) {
    background-color: #f8fafc;
}
.title-box {
    text-align: center;
    background: #fef2f2;
    border: 2px solid #b91c1c;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
}
.title-box h1 {
    border-bottom: none;
    margin: 0 0 6px 0;
    color: #991b1b;
}
.title-box p {
    margin: 3px 0;
    color: #4b5563;
    font-size: 10pt;
}
code {
    background-color: #f1f5f9;
    padding: 1px 4px;
    border-radius: 3px;
    font-family: monospace;
    font-size: 8.5pt;
    color: #0f172a;
}
pre {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 8px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 8pt;
    overflow-x: auto;
}
.badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 7.5pt;
    font-weight: bold;
}
</style>
</head>
<body>
"""
    # Simple converter for common markdown elements
    lines = md_text.split('\n')
    in_table = False
    table_rows = []
    in_code = False
    code_lines = []

    for line in lines:
        line_str = line.strip()
        
        # Handle code blocks
        if line_str.startswith('```'):
            if in_code:
                html += "<pre><code>" + "\n".join(code_lines) + "</code></pre>\n"
                code_lines = []
                in_code = False
            else:
                in_code = True
            continue
        if in_code:
            code_lines.append(line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))
            continue

        # Handle tables
        if line_str.startswith('|') and line_str.endswith('|'):
            if not in_table:
                in_table = True
                table_rows = []
            if '---' in line_str:
                continue
            cells = [c.strip() for c in line_str[1:-1].split('|')]
            table_rows.append(cells)
            continue
        elif in_table:
            # End of table
            html += "<table>\n"
            for r_idx, row in enumerate(table_rows):
                html += "<tr>"
                tag = "th" if r_idx == 0 else "td"
                for cell in row:
                    # formatting within cell
                    cell_fmt = cell.replace('**', '<b>', 1)
                    while '**' in cell_fmt:
                        cell_fmt = cell_fmt.replace('**', '</b>', 1).replace('**', '<b>', 1)
                    cell_fmt = cell_fmt.replace('`', '<code>', 1)
                    while '`' in cell_fmt:
                        cell_fmt = cell_fmt.replace('`', '</code>', 1).replace('`', '<code>', 1)
                    html += f"<{tag}>{cell_fmt}</{tag}>"
                html += "</tr>\n"
            html += "</table>\n"
            in_table = False
            table_rows = []

        # Headings
        if line_str.startswith('# '):
            html += f"<h1>{line_str[2:]}</h1>\n"
        elif line_str.startswith('## '):
            html += f"<h2>{line_str[3:]}</h2>\n"
        elif line_str.startswith('### '):
            html += f"<h3>{line_str[4:]}</h3>\n"
        elif line_str.startswith('#### '):
            html += f"<h4>{line_str[5:]}</h4>\n"
        elif line_str.startswith('- '):
            # formatting
            c_line = line_str[2:]
            c_line = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', c_line)
            c_line = re.sub(r'`(.*?)`', r'<code>\1</code>', c_line)
            html += f"<ul><li>{c_line}</li></ul>\n"
        elif line_str == '---':
            html += "<hr style='border: none; border-top: 1px solid #e2e8f0; margin: 12px 0;'>\n"
        elif line_str:
            c_line = line_str
            c_line = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', c_line)
            c_line = re.sub(r'`(.*?)`', r'<code>\1</code>', c_line)
            html += f"<p>{c_line}</p>\n"

    html += "</body></html>"
    return html

html_doc = md_to_html(text)

story = pymupdf.Story(html_doc)
def rectfn(rect_num, filled):
    mediabox = pymupdf.Rect(0, 0, 595, 842) # A4
    rect = pymupdf.Rect(36, 36, 559, 806)
    return mediabox, rect, pymupdf.Identity

doc = story.write_with_links(rectfn=rectfn)
doc.save(pdf_path)
print(f"✅ Generated PDF at: {pdf_path} ({len(doc)} pages)")
