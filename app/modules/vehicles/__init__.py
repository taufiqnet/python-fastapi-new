"""Vehicle & Fleet Management Module (VMS)."""
from app.modules.vehicles.models import (
    Driver,
    FuelLog,
    IncidentReport,
    MaintenanceSchedule,
    TelematicsEvent,
    TireLog,
    TripLog,
    Vehicle,
    VehicleRequisition,
    WorkOrder,
)

__all__ = [
    "Vehicle",
    "Driver",
    "VehicleRequisition",
    "TripLog",
    "FuelLog",
    "MaintenanceSchedule",
    "WorkOrder",
    "TireLog",
    "IncidentReport",
    "TelematicsEvent",
]
