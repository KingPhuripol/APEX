"""
SmartLiva — Patient & Study Routes
====================================
REST endpoints for:
  GET  /patients                     — list patients
  POST /patients                     — create patient
  GET  /patients/{hn}/studies        — longitudinal history for one patient
  GET  /studies/recent               — recent studies (any patient)
  GET  /analysis/pending-review      — studies flagged for physician review
  GET  /dashboard/stats              — summary statistics
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import PatientDB, StudyDB, get_db

router = APIRouter(tags=["clinical"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class PatientCreate(BaseModel):
    hn:           str
    name:         str
    date_of_birth: str   | None = None
    gender:       str   | None = None
    phone:        str   | None = None
    email:        str   | None = None
    bmi:          float | None = None
    alcohol_use:  str   | None = None
    ast_ul:       float | None = None
    alt_ul:       float | None = None
    medical_history:      str | None = None
    current_medications:  str | None = None
    allergies:            str | None = None


class PatientOut(BaseModel):
    id:           int
    hn:           str
    name:         str
    date_of_birth: str | None
    gender:       str | None
    phone:        str | None
    bmi:          float | None
    alcohol_use:  str  | None
    ast_ul:       float | None
    alt_ul:       float | None
    created_at:   str

    class Config:
        from_attributes = True


class StudyOut(BaseModel):
    id:             int
    patient_hn:     str | None
    patient_name:   str | None
    audit_id:       str
    study_date:     str
    fibrosis_stage: str
    fibrosis_conf:  float
    te_kpa:         float
    risk_level:     str
    lesion_label:   str | None
    parasite_label: str
    requires_review: bool
    image_quality:  str
    model_version:  str
    result:         dict | None = None  # full JSON payload

    class Config:
        from_attributes = True


def _study_to_out(s: StudyDB, include_result: bool = False) -> dict:
    out: dict[str, Any] = {
        "id":             s.id,
        "patient_hn":     s.patient_hn,
        "patient_name":   s.patient_name,
        "audit_id":       s.audit_id,
        "study_date":     s.study_date.isoformat() if s.study_date else "",
        "fibrosis_stage": s.fibrosis_stage,
        "fibrosis_conf":  s.fibrosis_conf,
        "te_kpa":         s.te_kpa,
        "risk_level":     s.risk_level,
        "lesion_label":   s.lesion_label,
        "parasite_label": s.parasite_label,
        "requires_review": s.requires_review,
        "image_quality":  s.image_quality,
        "model_version":  s.model_version,
    }
    if include_result and s.result_json:
        try:
            out["result"] = json.loads(s.result_json)
        except Exception:
            out["result"] = None
    return out


# ---------------------------------------------------------------------------
# Patient endpoints
# ---------------------------------------------------------------------------
@router.get("/patients")
def list_patients(limit: int = 50, search: str = "", db: Session = Depends(get_db)):
    q = db.query(PatientDB).order_by(PatientDB.created_at.desc())
    if search:
        q = q.filter(
            (PatientDB.hn.ilike(f"%{search}%")) |
            (PatientDB.name.ilike(f"%{search}%"))
        )
    patients = q.limit(limit).all()
    return [
        {
            "id":           p.id,
            "hospital_number": p.hn,
            "first_name":   p.name.split(" ")[0] if p.name else "",
            "last_name":    " ".join(p.name.split(" ")[1:]) if p.name else "",
            "name":         p.name,
            "date_of_birth": p.date_of_birth,
            "gender":       p.gender,
            "phone":        p.phone,
            "bmi":          p.bmi,
            "alcohol_use":  p.alcohol_use,
            "ast_ul":       p.ast_ul,
            "alt_ul":       p.alt_ul,
            "created_at":   p.created_at.isoformat() if p.created_at else "",
        }
        for p in patients
    ]


@router.post("/patients", status_code=201)
def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    existing = db.query(PatientDB).filter(PatientDB.hn == patient.hn).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Patient HN {patient.hn} already exists.")
    p = PatientDB(
        hn                  = patient.hn,
        name                = patient.name,
        date_of_birth       = patient.date_of_birth,
        gender              = patient.gender,
        phone               = patient.phone,
        email               = patient.email,
        bmi                 = patient.bmi,
        alcohol_use         = patient.alcohol_use,
        ast_ul              = patient.ast_ul,
        alt_ul              = patient.alt_ul,
        medical_history     = patient.medical_history,
        current_medications = patient.current_medications,
        allergies           = patient.allergies,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "hospital_number": p.hn, "name": p.name, "created_at": p.created_at.isoformat()}


@router.get("/patients/{hn}")
def get_patient(hn: str, db: Session = Depends(get_db)):
    p = db.query(PatientDB).filter(PatientDB.hn == hn).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found.")
    return {
        "id": p.id, "hospital_number": p.hn, "name": p.name,
        "date_of_birth": p.date_of_birth, "gender": p.gender,
        "phone": p.phone, "bmi": p.bmi, "alcohol_use": p.alcohol_use,
        "ast_ul": p.ast_ul, "alt_ul": p.alt_ul,
        "medical_history": p.medical_history,
        "current_medications": p.current_medications,
        "created_at": p.created_at.isoformat() if p.created_at else "",
    }


@router.get("/patients/{hn}/studies")
def get_patient_studies(hn: str, db: Session = Depends(get_db)):
    """Longitudinal history — all studies for one patient, oldest first (for trend chart)."""
    studies = (
        db.query(StudyDB)
        .filter(StudyDB.patient_hn == hn)
        .order_by(StudyDB.study_date.asc())
        .all()
    )
    return [_study_to_out(s, include_result=True) for s in studies]


# ---------------------------------------------------------------------------
# Study endpoints
# ---------------------------------------------------------------------------
@router.get("/studies/recent")
def recent_studies(limit: int = 10, db: Session = Depends(get_db)):
    studies = (
        db.query(StudyDB)
        .order_by(StudyDB.study_date.desc())
        .limit(limit)
        .all()
    )
    return [_study_to_out(s) for s in studies]


@router.get("/analysis/pending-review")
def pending_reviews(db: Session = Depends(get_db)):
    studies = (
        db.query(StudyDB)
        .filter(StudyDB.requires_review == True)
        .order_by(StudyDB.study_date.desc())
        .limit(50)
        .all()
    )
    return [
        {
            **_study_to_out(s),
            "id": s.audit_id,
            "predicted_class":   s.fibrosis_stage,
            "confidence_score":  s.fibrosis_conf,
            "fibrosis_stage":    s.fibrosis_stage,
            "predicted_te_kpa":  s.te_kpa,
            "requires_review":   s.requires_review,
            "analysis_timestamp": s.study_date.isoformat() if s.study_date else "",
        }
        for s in studies
    ]


# ---------------------------------------------------------------------------
# Dashboard stats
# ---------------------------------------------------------------------------
@router.get("/dashboard/stats")
def dashboard_stats(db: Session = Depends(get_db)):
    total_patients  = db.query(PatientDB).count()
    total_studies   = db.query(StudyDB).count()
    high_risk       = db.query(StudyDB).filter(StudyDB.risk_level.in_(["High", "สูง"])).count()
    pending         = db.query(StudyDB).filter(StudyDB.requires_review == True).count()

    # Fibrosis distribution
    fib_dist: dict[str, int] = {}
    for s in db.query(StudyDB).all():
        fib_dist[s.fibrosis_stage] = fib_dist.get(s.fibrosis_stage, 0) + 1

    # Date range (last 30 days)
    now  = datetime.now(timezone.utc)
    from_ = now - timedelta(days=30)
    recent_count = (
        db.query(StudyDB)
        .filter(StudyDB.study_date >= from_)
        .count()
    )

    return {
        "total_patients":    total_patients,
        "total_studies":     total_studies,
        "completed_studies": total_studies,
        "completion_rate":   100.0 if total_studies > 0 else 0.0,
        "high_risk_cases":   high_risk,
        "pending_review":    pending,
        "recent_30_days":    recent_count,
        "analysis_distribution": [
            {"class": stage, "count": count, "avg_confidence": 0.85}
            for stage, count in fib_dist.items()
        ],
        "fibrosis_distribution": [
            {"stage": stage, "count": count}
            for stage, count in sorted(fib_dist.items())
        ],
        "period": {
            "from": from_.isoformat(),
            "to":   now.isoformat(),
        },
    }
