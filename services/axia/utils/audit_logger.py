import sqlite3
import json
import uuid
import datetime
import os
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "audit_trail.db"

def _init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            timestamp TEXT,
            mrn TEXT,
            target_module TEXT,
            anon_image_id TEXT,
            ai_output_json TEXT,
            human_override_json TEXT,
            physician_id TEXT
        )
    """)
    conn.commit()
    conn.close()

def log_audit(mrn: str, target_module: str, anon_image_id: str, ai_output: dict, human_override: dict, physician_id: str = "unknown"):
    _init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    log_id = str(uuid.uuid4())
    timestamp = datetime.datetime.utcnow().isoformat()
    
    cursor.execute("""
        INSERT INTO audit_logs (id, timestamp, mrn, target_module, anon_image_id, ai_output_json, human_override_json, physician_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        log_id,
        timestamp,
        mrn,
        target_module,
        anon_image_id,
        json.dumps(ai_output),
        json.dumps(human_override),
        physician_id
    ))
    
    conn.commit()
    conn.close()
    
    return log_id
