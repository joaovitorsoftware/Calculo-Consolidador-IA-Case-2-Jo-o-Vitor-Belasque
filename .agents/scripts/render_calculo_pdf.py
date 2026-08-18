from pathlib import Path

import fitz


source = Path("attached_assets/aula_Calculo_caseIA_1787006905053.pdf")
output_dir = Path(".agents/outputs/calculo-pages")
output_dir.mkdir(parents=True, exist_ok=True)

document = fitz.open(source)
print(f"pages={document.page_count}")
print(f"metadata={document.metadata}")

for index, page in enumerate(document):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    destination = output_dir / f"page-{index + 1:02d}.png"
    pixmap.save(destination)
    print(destination)