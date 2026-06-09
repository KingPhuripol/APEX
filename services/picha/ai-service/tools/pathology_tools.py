"""
Pathology tools — FunctionTool wrappers used by specialist agents.
"""
from autogen_core.tools import FunctionTool


def who_bilin_classification(grade: str) -> dict:
    """Return WHO BilIN criteria and hallmarks for a given grade.

    Accepts official names ('Normal', 'BilIN-1' … 'BilIN-3',
    'Well-differentiated CCA', 'Moderately differentiated CCA',
    'Poorly differentiated CCA') as well as common shorthand
    (G1→BilIN-1, G2→BilIN-2, G3→BilIN-3, low/intermediate/high grade, etc.).
    """
    _CRITERIA = {
        "Normal": {"description": "Single columnar layer, uniform nuclei 5-7μm, maintained polarity"},
        "BilIN-1": {"description": "Mild nuclear enlargement, preserved polarity, occasional stratification"},
        "BilIN-2": {"description": "Moderate atypia, nuclear stratification, N:C ratio increased, occasional mitoses"},
        "BilIN-3": {"description": "Severe atypia, loss of polarity, frequent mitoses, cribriform architecture"},
        "Well-differentiated CCA": {"description": "Invasive glands, desmoplastic stroma, well-formed tubules"},
        "Moderately differentiated CCA": {"description": "Irregular glands with partial solid component"},
        "Poorly differentiated CCA": {"description": "Solid sheets, minimal gland formation, marked pleomorphism"},
    }
    _ALIASES = {
        "normal": "Normal",
        "bilin1": "BilIN-1", "bilin-1": "BilIN-1", "g1": "BilIN-1", "grade 1": "BilIN-1",
        "low grade": "BilIN-1", "low-grade": "BilIN-1", "low grade dysplasia": "BilIN-1",
        "bilin2": "BilIN-2", "bilin-2": "BilIN-2", "g2": "BilIN-2", "grade 2": "BilIN-2",
        "intermediate grade": "BilIN-2", "moderate dysplasia": "BilIN-2",
        "bilin3": "BilIN-3", "bilin-3": "BilIN-3", "g3": "BilIN-3", "grade 3": "BilIN-3",
        "high grade": "BilIN-3", "high-grade": "BilIN-3", "high grade dysplasia": "BilIN-3",
        "well differentiated": "Well-differentiated CCA",
        "well-differentiated": "Well-differentiated CCA",
        "well differentiated cca": "Well-differentiated CCA",
        "moderately differentiated": "Moderately differentiated CCA",
        "moderately-differentiated": "Moderately differentiated CCA",
        "moderate": "Moderately differentiated CCA",
        "moderately differentiated cca": "Moderately differentiated CCA",
        "poorly differentiated": "Poorly differentiated CCA",
        "poorly-differentiated": "Poorly differentiated CCA",
        "poorly differentiated cca": "Poorly differentiated CCA",
        "undifferentiated": "Poorly differentiated CCA",
    }
    key = grade.strip().lower()
    resolved = _ALIASES.get(key, grade)
    result = _CRITERIA.get(resolved)
    if result:
        return result
    # Exact-case fallback
    result = _CRITERIA.get(grade)
    if result:
        return result
    return {"error": f"Unknown grade: {grade}. Valid values: {list(_CRITERIA.keys())}"}


def ajcc_pathologic_staging(subtype: str, t: str, n: str, m: str) -> dict:
    """Return AJCC 8th Edition pathologic stage for CCA."""
    # Simplified staging table — expand with full AJCC logic in production
    stages = {
        ("intrahepatic", "T1a", "N0", "M0"): "Stage IA",
        ("intrahepatic", "T1b", "N0", "M0"): "Stage IB",
        ("intrahepatic", "T2",  "N0", "M0"): "Stage II",
        ("intrahepatic", "T3",  "N0", "M0"): "Stage IIIA",
        ("intrahepatic", "T4",  "N0", "M0"): "Stage IIIB",
        ("intrahepatic", "T1a", "N1", "M0"): "Stage IIIB",
    }
    key = (subtype.lower(), t.upper(), n.upper(), m.upper())
    stage = stages.get(key, "Stage undetermined — verify with full AJCC table")
    return {"subtype": subtype, "T": t, "N": n, "M": m, "overall_stage": stage}


def survival_statistics(stage: str, subtype: str = "intrahepatic") -> dict:
    """Return population-based survival statistics for the given stage."""
    stats = {
        "Stage IA":   {"median_survival_months": 60, "5yr_survival_pct": 72},
        "Stage IB":   {"median_survival_months": 42, "5yr_survival_pct": 51},
        "Stage II":   {"median_survival_months": 28, "5yr_survival_pct": 30},
        "Stage IIIA": {"median_survival_months": 18, "5yr_survival_pct": 18},
        "Stage IIIB": {"median_survival_months": 14, "5yr_survival_pct": 12},
        "Stage IVA":  {"median_survival_months":  9, "5yr_survival_pct":  5},
        "Stage IVB":  {"median_survival_months":  6, "5yr_survival_pct":  2},
    }
    data = stats.get(stage, {"median_survival_months": "Unknown", "5yr_survival_pct": "Unknown"})
    data["stage"] = stage
    data["subtype"] = subtype
    data["source"] = "SEER 2010-2020, SEA-adjusted"
    return data


def ov_pathology_features(feature: str) -> dict:
    """Return morphological reference criteria for OV-associated pathology.

    Valid feature names: 'egg morphology', 'periductal fibrosis',
    'epithelial hyperplasia', 'goblet cell metaplasia'.
    Common aliases (egg, eggs, fibrosis, hyperplasia) are also accepted.
    Omit feature or pass 'all' to return the complete reference table.
    """
    _FEATURES = {
        "egg morphology": {
            "size_um": "26-30 × 11-15",
            "shape": "oval, operculated",
            "wall": "thick brownish shell",
            "operculum": "distinct, slightly raised shoulder",
            "differential": "Clonorchis sinensis (20-35 × 11-20μm, prominent shoulder)",
        },
        "periductal fibrosis": {
            "pattern": "concentric onion-skin fibrosis around bile ducts",
            "grade_0": "absent",
            "grade_1": "mild (<25% ductal circumference)",
            "grade_2": "moderate (25-75%)",
            "grade_3": "severe (>75%) — pathognomonic for OV",
        },
        "epithelial hyperplasia": {
            "pattern": "pseudostratified biliary epithelium, mucin hypersecretion",
            "nuclear_changes": "mild enlargement, maintained polarity",
            "clinical_relevance": "precursor lesion; BilIN-1 equivalent in chronic OV infection",
        },
        "goblet cell metaplasia": {
            "pattern": "intestinal-type goblet cells replacing biliary epithelium",
            "staining": "PAS/Alcian-blue positive",
            "clinical_relevance": "marker of chronic OV-driven inflammation",
        },
    }
    # Normalise / alias lookup
    _ALIASES = {
        "egg": "egg morphology",
        "eggs": "egg morphology",
        "egg size": "egg morphology",
        "ov egg": "egg morphology",
        "ov eggs": "egg morphology",
        "operculated egg": "egg morphology",
        "opisthorchis egg": "egg morphology",
        "fibrosis": "periductal fibrosis",
        "periductal": "periductal fibrosis",
        "ductal fibrosis": "periductal fibrosis",
        "hyperplasia": "epithelial hyperplasia",
        "epithelial hyperplasia": "epithelial hyperplasia",
        "biliary hyperplasia": "epithelial hyperplasia",
        "goblet": "goblet cell metaplasia",
        "metaplasia": "goblet cell metaplasia",
    }
    key = feature.strip().lower()
    resolved = _ALIASES.get(key, key)
    if resolved in ("all", ""):
        return _FEATURES
    result = _FEATURES.get(resolved)
    if result:
        return result
    # Fuzzy fallback — return full table so the LLM still has reference data
    return {"note": f"Feature '{feature}' not in index — returning full OV reference.", **_FEATURES}


def cca_differential_diagnosis(grade: str, features: list) -> dict:
    """Suggest differential diagnoses for a given grade and feature set."""
    return {
        "primary": "Cholangiocarcinoma" if "invasion" in features else "High-grade BilIN",
        "differentials": ["Metastatic adenocarcinoma", "Hepatocellular carcinoma", "Benign biliary epithelium"],
        "recommended_ihc": ["CK7", "CK20", "CDX2", "TTF-1", "AFP"],
    }


WHO_BILIN_TOOL      = FunctionTool(who_bilin_classification,  description="WHO BilIN criteria lookup")
AJCC_STAGING_TOOL   = FunctionTool(ajcc_pathologic_staging,   description="AJCC 8th Ed. pTNM staging")
SURVIVAL_STATS_TOOL = FunctionTool(survival_statistics,        description="Population survival stats by stage")
OV_PATHOLOGY_TOOL   = FunctionTool(ov_pathology_features,     description="OV morphology reference criteria")
CCA_DIFFERENTIAL_TOOL = FunctionTool(cca_differential_diagnosis, description="Differential diagnosis helper")
