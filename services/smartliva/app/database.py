"""
SmartLiva — SQLite Database Layer
==================================
Zero-infrastructure persistence using SQLite + SQLAlchemy.
One file DB (smartliva.db) lives next to this module.
Easily upgradeable to PostgreSQL by swapping DATABASE_URL.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

# ---------------------------------------------------------------------------
# Database URL — default SQLite, override with DATABASE_URL env var
# ---------------------------------------------------------------------------
_DB_DIR = Path(__file__).resolve().parent.parent  # backend/
_DEFAULT_URL = f"sqlite:///{_DB_DIR / 'smartliva.db'}"
DATABASE_URL = os.getenv("DATABASE_URL", _DEFAULT_URL)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
    echo=False,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ---------------------------------------------------------------------------
# Base + Models
# ---------------------------------------------------------------------------
class Base(DeclarativeBase):
    pass


class PatientDB(Base):
    __tablename__ = "patients"

    id          = Column(Integer, primary_key=True, index=True)
    hn          = Column(String(50), index=True, unique=True, nullable=False)
    name        = Column(String(200), nullable=False)
    date_of_birth = Column(String(20), nullable=True)
    gender      = Column(String(10), nullable=True)
    phone       = Column(String(30), nullable=True)
    email       = Column(String(200), nullable=True)
    # Clinical context (used to improve AI analysis)
    bmi         = Column(Float, nullable=True)
    alcohol_use = Column(String(30), nullable=True)  # none / occasional / heavy
    ast_ul      = Column(Float, nullable=True)   # AST U/L
    alt_ul      = Column(Float, nullable=True)   # ALT U/L
    medical_history     = Column(Text, nullable=True)
    current_medications = Column(Text, nullable=True)
    allergies   = Column(Text, nullable=True)
    created_at  = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at  = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                         onupdate=lambda: datetime.now(timezone.utc))


class StudyDB(Base):
    __tablename__ = "studies"

    id              = Column(Integer, primary_key=True, index=True)
    patient_hn      = Column(String(50), index=True, nullable=True)  # FK-like, nullable for anonymous
    patient_name    = Column(String(200), nullable=True)
    audit_id        = Column(String(50), unique=True, index=True)
    study_date      = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    # Core AI outputs
    fibrosis_stage  = Column(String(5))
    fibrosis_conf   = Column(Float)
    te_kpa          = Column(Float)
    risk_level      = Column(String(30))
    lesion_label    = Column(String(100), nullable=True)
    parasite_label  = Column(String(100))
    requires_review = Column(Boolean, default=False)
    image_quality   = Column(String(30))
    # Full JSON response (for PDF regeneration + trend analysis)
    result_json     = Column(Text)  # JSON string of full PredictionResponse
    # Clinical inputs used at time of analysis
    bmi_at_study    = Column(Float, nullable=True)
    alcohol_at_study = Column(String(30), nullable=True)
    ast_at_study    = Column(Float, nullable=True)
    alt_at_study    = Column(Float, nullable=True)
    clinical_notes  = Column(Text, nullable=True)
    model_version   = Column(String(100))
    created_at      = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Initialise tables
# ---------------------------------------------------------------------------
def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def get_db() -> Session:
    """FastAPI dependency — yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def save_study(
    db: Session,
    result: dict,
    audit_id: str,
    patient_hn: str = "",
    patient_name: str = "",
    bmi: float | None = None,
    alcohol_use: str | None = None,
    ast_ul: float | None = None,
    alt_ul: float | None = None,
    clinical_notes: str = "",
) -> StudyDB:
    study = StudyDB(
        patient_hn      = patient_hn or None,
        patient_name    = patient_name or None,
        audit_id        = audit_id,
        fibrosis_stage  = result.get("fibrosis_stage", ""),
        fibrosis_conf   = result.get("fibrosis_conf", 0.0),
        te_kpa          = result.get("te_kpa", 0.0),
        risk_level      = result.get("risk_level", ""),
        lesion_label    = result.get("lesion_label"),
        parasite_label  = result.get("parasite_label", "Normal"),
        requires_review = result.get("requires_review", False),
        image_quality   = result.get("image_quality", "adequate"),
        result_json     = json.dumps(result),
        bmi_at_study    = bmi,
        alcohol_at_study = alcohol_use,
        ast_at_study    = ast_ul,
        alt_at_study    = alt_ul,
        clinical_notes  = clinical_notes,
        model_version   = result.get("model_version", "SmartLiva-VisionAPI-v3"),
    )
    # Upsert patient record if HN provided
    if patient_hn:
        existing = db.query(PatientDB).filter(PatientDB.hn == patient_hn).first()
        if not existing:
            patient = PatientDB(
                hn=patient_hn,
                name=patient_name or "Unknown",
                bmi=bmi,
                alcohol_use=alcohol_use,
                ast_ul=ast_ul,
                alt_ul=alt_ul,
            )
            db.add(patient)
        else:
            # Update latest clinical context
            if bmi:
                existing.bmi = bmi
            if alcohol_use:
                existing.alcohol_use = alcohol_use
            if ast_ul:
                existing.ast_ul = ast_ul
            if alt_ul:
                existing.alt_ul = alt_ul
            if patient_name:
                existing.name = patient_name

    db.add(study)
    db.commit()
    db.refresh(study)
    return study
