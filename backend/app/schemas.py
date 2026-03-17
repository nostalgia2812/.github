from enum import Enum
from typing import List

from pydantic import BaseModel, Field, HttpUrl


class Severity(str, Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class Indicator(BaseModel):
    type: str
    value: str
    source: str
    severity: Severity


class Finding(BaseModel):
    rule: str
    severity: Severity
    score_delta: int
    reason: str
    evidence: List[str] = Field(default_factory=list)


class ScanRequest(BaseModel):
    skill_name: str = Field(min_length=1)
    publisher: str = Field(min_length=1)
    instruction_text: str = Field(min_length=1)
    urls: List[HttpUrl] = Field(default_factory=list)


class ScanResponse(BaseModel):
    skill_name: str
    publisher: str
    risk_score: int
    risk_level: Severity
    findings: List[Finding]


class Checklist(BaseModel):
    immediate_24h: List[str]
    architecture_1_2_weeks: List[str]
    advanced_1_month: List[str]
