from typing import List, Optional, Literal
from pydantic import BaseModel, Field

class ApplianceSchema(BaseModel):
    id: str
    name: str
    powerKwh: float = Field(..., ge=0.1, le=20.0)
    isEnabled: bool = True
    icon: str = "custom"
    durationHours: int = 1
    color: Optional[str] = "#38bdf8"

class SystemConfigSchema(BaseModel):
    inverterModel: str = "Solarman"
    inverterConnected: bool = True
    panelCapacityKwp: float = 5.0
    location: str = "Hanoi"
    electricityPriceVnd: float = 3460.0

class ForecastRequest(BaseModel):
    appliances: List[ApplianceSchema]
    config: SystemConfigSchema
    scenarioId: Optional[str] = None

class HourlyPointSchema(BaseModel):
    hour: int
    label: str
    netLoad: float
    buyKwh: float
    surplusKwh: float
    weatherIcon: Literal["sun", "sun-cloud", "cloud", "rain"]
    temperature: int
    cloudCover: int
    ghi: int
    isInBestWindow: bool

class ScheduledApplianceSchema(BaseModel):
    applianceId: str
    name: str
    startHour: int
    endHour: int
    powerKwh: float
    savingsVnd: int

class ComparisonSchema(BaseModel):
    heuristicSavingsVnd: int
    percentGain: int
    avoidedCloudDrop: bool

class ForecastResponse(BaseModel):
    dateStr: str = "Tomorrow"
    bestWindowStart: int
    bestWindowEnd: int
    totalSurplusKwh: float
    hasEnoughSolar: bool
    warningMessage: Optional[str] = None
    totalSavingsVnd: int
    monthlyProjectedSavingsVnd: int
    scheduledAppliances: List[ScheduledApplianceSchema]
    hourlyPoints: List[HourlyPointSchema]
    comparison: ComparisonSchema
    isLiveModel: bool = True
    device: str = "cuda"
    inferenceTimeMs: float = 0.0
    modelParameters: int = 1705755
    scenarioUsed: str = "Live PyTorch TimeXer Model"

class StatusResponse(BaseModel):
    ready: bool
    model_name: str
    checkpoint_loaded: bool
    checkpoint_path: str
    device: str
    total_parameters: int

class ReminderRequest(BaseModel):
    applianceIds: List[str]
    startHours: List[int]

class ReminderResponse(BaseModel):
    success: bool
    scheduledCount: int
    message: str
