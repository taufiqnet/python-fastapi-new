"""
Asset Management module.
Handles asset categories, physical assets inventory, employee custody allocations, and maintenance/damage logs.
"""
from app.modules.assets.router import router

__all__ = ["router"]
