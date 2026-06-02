from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ProjectPaths:
    root: Path
    sales_data: Path
    inventory_data: Path
    recipe_mapping_data: Path
    supplier_contacts_data: Path
    output_dir: Path

    @classmethod
    def from_root(cls, root: str | Path) -> "ProjectPaths":
        root_path = Path(root).resolve()
        return cls(
            root=root_path,
            sales_data=root_path / "data" / "raw" / "restaurant_sales_data.csv",
            inventory_data=root_path / "data" / "raw" / "restaurant_inventory_2024_by_ingredients.csv",
            recipe_mapping_data=root_path / "data" / "reference" / "recipe_mapping.csv",
            supplier_contacts_data=root_path / "data" / "reference" / "supplier_contacts.csv",
            output_dir=root_path / "output" / "forecast",
        )
