import os

files_to_update = [
    r"frontend\src\app\dashboard\page.tsx",
    r"frontend\src\components\ai\AnomalyAlertPanel.tsx",
    r"frontend\src\components\analytics\CustomerSegmentTable.tsx",
    r"frontend\src\components\analytics\DocumentHealthBadge.tsx",
    r"frontend\src\components\analytics\LegalAnnexesTab.tsx",
    r"frontend\src\components\analytics\MonthlyCustomerChart.tsx",
    r"frontend\src\components\analytics\SegmentInsightPanel.tsx",
    r"frontend\src\components\analytics\TaxLiquidationCard.tsx",
    r"frontend\src\components\analytics\TopEntitiesChart.tsx"
]

base_path = r"c:\Desarrollo_Aplicaciones\ContabilidadArturo"

for rel_path in files_to_update:
    abs_path = os.path.join(base_path, rel_path)
    if os.path.exists(abs_path):
        with open(abs_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace bg-white with bg-[var(--color-surface-container-lowest)]
        new_content = content.replace('bg-white', 'bg-[var(--color-surface-container-lowest)]')
        
        if new_content != content:
            with open(abs_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {rel_path}")
        else:
            print(f"No changes needed for {rel_path}")
    else:
        print(f"File not found: {abs_path}")
