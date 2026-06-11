# APEX Clinical AI Platform — Full Audit Loop Prompt

## วิธีใช้
คัดลอก prompt นี้ไปใช้กับ AI Agent (เช่น Antigravity / Gemini) แล้ว Agent จะทำการตรวจสอบและแก้ไขวนซ้ำจนกว่าทุกอย่างจะผ่านหมด

---

## PROMPT (Copy ทั้งหมดด้านล่าง)

---

```
You are a Senior Full-Stack AI Engineer and QA Lead performing a comprehensive, iterative audit of the APEX Clinical AI Platform. Your job is to find ALL bugs, misconfigurations, and broken integrations — then FIX every single one before stopping. Do NOT stop until every check passes.

## PROJECT OVERVIEW
APEX Clinical AI Platform is a multi-module medical AI system located at:
/Users/king_phuripol/AI-Engineer/01_Projects/ML-DeepLearning/China/APEX Clinical AI Platform

### Architecture
- Frontend: React + Vite (port 5173) → /frontend/src/
- Backend Services (all local, no Docker):
  - Auth Service: Node.js (port 3000) → /services/auth/
  - Axia Service: Flask Python (port 5001) → /services/axia/
  - SmartLiva Service: FastAPI Python (port 8000) → /services/smartliva/
  - Picha Service: Flask Python (port 8005) → /services/picha/

### Required AI Models (NON-NEGOTIABLE)
- PRIMARY_VISION_API   = "gpt-5.5-2026-04-23"      ← Vision analysis (Axia, SmartLiva)
- CRITIQUE_VISION_API  = "gpt-5.4-mini-2026-03-17"  ← Critique/Formatter (Axia)
- FALLBACK_VISION_API  = "gpt-5.4-2026-03-05"       ← Fallback (Axia quality gate)
- OPENAI_VISION_MODEL  = "gpt-5.5-2026-04-23"       ← SmartLiva vision_analyzer.py
- OPENAI_MODEL         = "gpt-5.4-mini-2026-03-17"  ← SmartLiva chat

### Known gpt-5.x API Constraints
- Do NOT use `temperature` parameter (only default=1 supported)
- Do NOT use `max_tokens` parameter → use `max_completion_tokens` instead
- Pydantic response_format MUST have `model_config = ConfigDict(extra='forbid')`
- ALL Pydantic fields must be in `required` array (no fields with default values in strict schema)
- NO `Optional` fields → use concrete types with descriptive Field() descriptions

---

## AUDIT LOOP — Run the following checks in order, fix all failures, then re-run from Step 1

### ═══════════════════════════════════════════
### PHASE 1: ENVIRONMENT & CONFIGURATION
### ═══════════════════════════════════════════

**CHECK 1.1 — All .env files have correct API keys**
```bash
find "/Users/king_phuripol/AI-Engineer/01_Projects/ML-DeepLearning/China/APEX Clinical AI Platform" -name ".env" -not -path "*/.git/*" -not -path "*/node_modules/*" -not -path "*/venv/*"
```
→ Read each .env file found
→ Verify OPENAI_API_KEY is present, non-empty, starts with "sk-proj-", and NOT the old key ending in "E9EA"
→ If any service .env has a different key from root .env → sync them all

**CHECK 1.2 — All .env files have correct model names**
→ services/axia/.env must have:
  PRIMARY_VISION_API=gpt-5.5-2026-04-23
  CRITIQUE_VISION_API=gpt-5.4-mini-2026-03-17
  FALLBACK_VISION_API=gpt-5.4-2026-03-05

→ services/smartliva/.env must have:
  OPENAI_VISION_MODEL=gpt-5.5-2026-04-23
  OPENAI_MODEL=gpt-5.4-mini-2026-03-17

**CHECK 1.3 — No hardcoded old model names anywhere in Python/JS code**
```bash
grep -rn "gpt-4o\|gpt-4-\|gpt-3.5\|text-davinci" \
  services/axia services/smartliva services/picha frontend/src \
  --include="*.py" --include="*.js" --include="*.jsx" \
  | grep -v "__pycache__" | grep -v "node_modules"
```
→ Fix ALL occurrences found

### ═══════════════════════════════════════════
### PHASE 2: PYDANTIC SCHEMA VALIDATION (Axia)
### ═══════════════════════════════════════════

**CHECK 2.1 — All schemas are gpt-5.x strict-mode compatible**
```bash
python3 -c "
import sys
sys.path.insert(0, 'services/axia')
from pipeline.schemas import Stage4Formatter, Stage2Findings, Stage3Critique, QualityGateResult, PipelineResult
all_ok = True
for cls in [QualityGateResult, Stage2Findings, Stage3Critique, Stage4Formatter]:
    s = cls.model_json_schema()
    props = set(s.get('properties', {}).keys())
    req = set(s.get('required', []))
    ap = s.get('additionalProperties', 'MISSING')
    ok = props == req and ap == False
    all_ok = all_ok and ok
    status = '✅' if ok else '❌'
    print(f'{status} {cls.__name__}: all_required={ok}, additionalProperties={ap}')
    if not ok:
        print(f'   Missing from required: {props - req}')
        print(f'   Extra in required: {req - props}')
print()
print('RESULT: ALL VALID' if all_ok else 'RESULT: FIX NEEDED')
" 2>&1
```
→ If ANY schema fails: add `model_config = ConfigDict(extra='forbid')` and remove ALL default values from fields

**CHECK 2.2 — No `temperature`, `max_tokens` in any gpt-5.x API call**
```bash
grep -rn "temperature\|max_tokens" services/axia/llm/ services/smartliva/app/ \
  --include="*.py" | grep -v "__pycache__" | grep -v "max_completion_tokens"
```
→ Remove ALL `temperature=` kwargs in calls to gpt-5.x models
→ Replace ALL `max_tokens=` with `max_completion_tokens=`

**CHECK 2.3 — LLMClient temperature guard covers ALL gpt-5.x models**
→ Read services/axia/llm/client.py
→ The temperature exclusion check must be: `if not any(v in target_model for v in ["gpt-5.", "o1", "o3"]):`
→ NOT just checking for "5.5"

### ═══════════════════════════════════════════
### PHASE 3: BACKEND SERVICE HEALTH CHECKS
### ═══════════════════════════════════════════

**CHECK 3.1 — All services are running**
```bash
curl -s http://localhost:3000/health && echo " ← AUTH OK" || echo " ← AUTH FAILED"
curl -s http://localhost:5001/api/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'AXIA: {d}')" || echo "AXIA FAILED"
curl -s http://localhost:8000/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'SMARTLIVA: {d}')" || echo "SMARTLIVA FAILED"
curl -s http://localhost:8005/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'PICHA: {d}')" || echo "PICHA FAILED"
```
→ If any service is DOWN: read its log file (/tmp/apex-*.log) and fix the startup error

**CHECK 3.2 — SmartLiva health reports correct model**
→ `curl -s http://localhost:8000/health | jq .vision_model`
→ Must return "gpt-5.5-2026-04-23" (NOT "gpt-4o" or any other)

**CHECK 3.3 — Axia health reports correct models**
→ `curl -s http://localhost:5001/api/health | jq .`
→ Must show model names from gpt-5.x family

### ═══════════════════════════════════════════
### PHASE 4: REAL AI INFERENCE TESTS (No Mock)
### ═══════════════════════════════════════════

**CHECK 4.1 — SmartLiva Real AI Test**
```bash
curl -s -X POST http://localhost:8000/predict \
  -F "file=@frontend/dist/demo-dataset/smartliva/sample01.jpg" \
  -F "language=th" | python3 -c "
import sys, json
r = json.load(sys.stdin)
notes = r.get('analysis_notes', '')
is_mock = '[OFFLINE MOCK]' in notes
is_real = not is_mock and len(notes) > 30
print('✅ REAL AI' if is_real else '❌ MOCK DETECTED')
print(f'Stage: {r.get(\"fibrosis_stage\")} | Confidence: {r.get(\"fibrosis_confidence\")}')
print(f'Notes: {notes[:150]}...')
"
```
→ Must NOT contain "[OFFLINE MOCK]"
→ Must return medically meaningful text
→ If Mock: check /tmp/apex-smartliva.log for error, fix it

**CHECK 4.2 — Axia Real AI Test**
```bash
curl -s -X POST http://localhost:5001/api/classify \
  -F "files=@frontend/dist/demo-dataset/axia/sample01.png" | python3 -c "
import sys, json
r = json.load(sys.stdin)
summary = r.get('critique', {}).get('thai_summary', '')
is_mock = '(Mock)' in summary
is_real = not is_mock and len(summary) > 50
print('✅ REAL AI' if is_real else '❌ MOCK DETECTED')
print(f'Type: {r.get(\"type\")} | Confidence: {r.get(\"confidence\")}')
print(f'Summary: {summary[:200]}...')
insights = r.get('critique', {}).get('explainable_insights', [])
print(f'Insights count: {len(insights)}')
"
```
→ Must NOT contain "(Mock)" in summary
→ Must have at least 3 explainable_insights
→ If Mock: tail /tmp/apex-axia.log and fix the error

**CHECK 4.3 — Test Multiple Sample Images**
```bash
for i in 01 02 03; do
  echo "--- AXIA sample$i ---"
  curl -s -X POST http://localhost:5001/api/classify \
    -F "files=@frontend/dist/demo-dataset/axia/sample${i}.png" \
    | python3 -c "import sys,json; r=json.load(sys.stdin); print(f'type={r[\"type\"]} conf={r[\"confidence\"]} mock={(\"Mock\" in str(r))}')"
done
```
```bash
for i in 01 02 03; do
  echo "--- SMARTLIVA sample$i ---"
  curl -s -X POST http://localhost:8000/predict \
    -F "file=@frontend/dist/demo-dataset/smartliva/sample${i}.jpg" \
    | python3 -c "import sys,json; r=json.load(sys.stdin); print(f'stage={r[\"fibrosis_stage\"]} mock=(\"MOCK\" in str(r))')"
done
```
→ ALL samples must return Real AI results (not mock)

### ═══════════════════════════════════════════
### PHASE 5: FRONTEND CODE AUDIT
### ═══════════════════════════════════════════

**CHECK 5.1 — API endpoint URLs are correct**
→ Read frontend/src/modules/AxiaModule.jsx
→ Verify it calls: http://localhost:5001/api/classify and http://localhost:5001/api/predict
→ Read frontend/src/modules/SmartLivaModule.jsx
→ Verify it calls: http://localhost:8000/predict
→ Read frontend/src/modules/PichaModule.jsx
→ Verify it calls: http://localhost:8005/ endpoints

**CHECK 5.2 — Frontend displays real AI results correctly**
→ In AxiaModule.jsx: verify it reads `response.critique.thai_summary` for the summary field
→ In AxiaModule.jsx: verify it reads `response.critique.explainable_insights` for the insights list
→ In SmartLivaModule.jsx: verify it reads `response.analysis_notes` (not a mock-specific field)
→ No hardcoded mock data in JSX files

**CHECK 5.3 — Frontend error handling**
→ Each module must handle HTTP errors gracefully (try/catch or .catch())
→ Must show user-friendly error message when backend is unreachable
→ Must NOT silently fail or show raw JSON errors to users

**CHECK 5.4 — Frontend build has no errors**
```bash
cd frontend && npm run build 2>&1 | tail -20
```
→ Must complete with no ERROR (warnings are acceptable)
→ If errors exist: fix them

### ═══════════════════════════════════════════
### PHASE 6: END-TO-END INTEGRATION TEST
### ═══════════════════════════════════════════

**CHECK 6.1 — Full Axia Pipeline Test (all 4 stages)**
```bash
curl -s -X POST http://localhost:5001/api/predict \
  -F "files=@frontend/dist/demo-dataset/axia/sample01.png" \
  | python3 -c "
import sys, json
r = json.load(sys.stdin)
print('stage1_quality_gate:', r.get('stage1_quality_gate', {}).get('passed'))
print('type:', r.get('type'))
print('confidence:', r.get('confidence'))
critique = r.get('critique', {})
print('has_thai_summary:', bool(critique.get('thai_summary')))
print('insights_count:', len(critique.get('explainable_insights', [])))
print('has_recommendations:', bool(critique.get('actionable_recommendations')))
is_real = '(Mock)' not in str(r) and bool(critique.get('thai_summary'))
print('RESULT:', '✅ REAL AI' if is_real else '❌ MOCK')
"
```

**CHECK 6.2 — SmartLiva Chat Test**
```bash
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"history": [{"role": "user", "content": "ผลการตรวจตับของฉันเป็น F3 หมายความว่าอะไร?"}], "language": "th"}' \
  | python3 -c "
import sys, json
r = json.load(sys.stdin)
reply = r.get('reply', '')
print('Reply length:', len(reply))
print('Is meaningful:', len(reply) > 100)
print('Reply preview:', reply[:200])
"
```
→ Must return a meaningful Thai medical explanation (>100 chars)

**CHECK 6.3 — Auth Service Integration**
```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "
import sys, json
try:
    r = json.load(sys.stdin)
    print('Login result:', r.get('success') or r.get('token') or r)
except: print('Auth response error')
"
```

### ═══════════════════════════════════════════
### PHASE 7: SERVICE LOGS AUDIT
### ═══════════════════════════════════════════

**CHECK 7.1 — No ERROR-level logs in any service**
```bash
for svc in auth axia smartliva picha; do
  echo "=== $svc ==="
  grep -i "error\|traceback\|exception\|failed\|FALLBACK" /tmp/apex-${svc}.log 2>/dev/null | tail -5
done
```
→ For each error found: diagnose and fix
→ "OFFLINE MOCK Fallback" in SmartLiva = FAIL (API not working)
→ "LLM FALLBACK" in Axia = FAIL (Pipeline crashed)

**CHECK 7.2 — Audit logs show real inference (not mock)**
→ SmartLiva audit log must show real fibrosis scores (not same fixed 0.88 every time)
→ Axia must show varied confidence scores across different images

### ═══════════════════════════════════════════
### PHASE 8: CODE QUALITY CHECKS
### ═══════════════════════════════════════════

**CHECK 8.1 — No dead/bypass code in app.py**
```bash
grep -n "MODELS_LOADED\|bypass\|TODO\|FIXME\|HACK\|pass #" \
  services/axia/app.py services/smartliva/app/main.py 2>/dev/null
```
→ If `MODELS_LOADED = False` causes logic bypass AND there's no PT model: verify the LLM pipeline is the intended primary path
→ Document clearly with a comment if bypass is intentional

**CHECK 8.2 — Unused imports cleanup**
```bash
python3 -c "
import ast, os, sys
files = [
    'services/axia/pipeline/schemas.py',
    'services/axia/llm/client.py',
    'services/smartliva/app/vision_analyzer.py',
    'services/smartliva/app/main.py',
]
for f in files:
    try:
        with open(f) as fp: tree = ast.parse(fp.read())
        print(f'✅ Syntax OK: {f}')
    except SyntaxError as e:
        print(f'❌ Syntax Error in {f}: {e}')
"
```
→ Fix ALL syntax errors found

**CHECK 8.3 — requirements.txt is complete**
```bash
cd services/axia && python3 -c "
import pkg_resources, pathlib
reqs = pathlib.Path('requirements.txt').read_text().strip().split('\n')
for r in reqs:
    pkg = r.split('>=')[0].split('==')[0].split('[')[0].strip()
    try:
        pkg_resources.require(pkg)
        print(f'✅ {pkg}')
    except Exception as e:
        print(f'❌ MISSING: {pkg} — {e}')
"
```

### ═══════════════════════════════════════════
### FINAL VALIDATION — Must ALL Pass Before Stopping
### ═══════════════════════════════════════════

Run this final checklist. Stop ONLY when ALL items show ✅:

```bash
python3 << 'FINAL_CHECK'
import subprocess, json, sys, os

results = {}

def check(name, cmd, validator):
    try:
        out = subprocess.check_output(cmd, shell=True, stderr=subprocess.DEVNULL, timeout=30).decode()
        results[name] = validator(out)
    except Exception as e:
        results[name] = False

# 1. Env keys synced
check("env_keys_synced",
    "grep OPENAI_API_KEY services/axia/.env services/smartliva/.env | awk -F= '{print $2}' | sort -u | wc -l",
    lambda o: o.strip() == "1")

# 2. SmartLiva health uses correct model
check("smartliva_model",
    "curl -s http://localhost:8000/health",
    lambda o: "gpt-5.5-2026-04-23" in o)

# 3. SmartLiva returns real AI (no mock)
check("smartliva_real_ai",
    "curl -s -X POST http://localhost:8000/predict -F 'file=@frontend/dist/demo-dataset/smartliva/sample01.jpg' -F 'language=th'",
    lambda o: "OFFLINE MOCK" not in o and len(json.loads(o).get("analysis_notes","")) > 30)

# 4. Axia returns real AI (no mock)
check("axia_real_ai",
    "curl -s -X POST http://localhost:5001/api/classify -F 'files=@frontend/dist/demo-dataset/axia/sample01.png'",
    lambda o: "(Mock)" not in o and len(json.loads(o).get("critique",{}).get("thai_summary","")) > 30)

# 5. Axia schemas are strict
check("axia_schemas_strict", """python3 -c "
import sys; sys.path.insert(0,'services/axia')
from pipeline.schemas import Stage4Formatter, Stage2Findings, Stage3Critique, QualityGateResult
result = all(
    set(c.model_json_schema().get('properties',{}).keys()) == set(c.model_json_schema().get('required',[]))
    and c.model_json_schema().get('additionalProperties') == False
    for c in [QualityGateResult, Stage2Findings, Stage3Critique, Stage4Formatter]
)
print('OK' if result else 'FAIL')
" """, lambda o: "OK" in o)

# 6. No old model names
check("no_old_models",
    "grep -r 'gpt-4o\\|gpt-4-\\|gpt-3.5' services/ frontend/src/ --include='*.py' --include='*.jsx' 2>/dev/null | grep -v node_modules | wc -l",
    lambda o: o.strip() == "0")

# 7. All services up
for svc, url in [("auth","http://localhost:3000/health"), ("axia","http://localhost:5001/api/health"), ("smartliva","http://localhost:8000/health"), ("picha","http://localhost:8005/health")]:
    check(f"{svc}_up", f"curl -sf {url}", lambda o: len(o) > 2)

# Print results
print("\n" + "="*60)
print("APEX PLATFORM — FINAL AUDIT RESULTS")
print("="*60)
all_pass = True
for name, passed in results.items():
    icon = "✅" if passed else "❌"
    print(f"{icon} {name}")
    if not passed:
        all_pass = False

print()
if all_pass:
    print("🎯 ALL CHECKS PASSED — Platform is production-ready!")
else:
    print("⚠️  FAILURES DETECTED — Continue fixing and re-run audit")
    sys.exit(1)
FINAL_CHECK
```

---

## LOOP INSTRUCTION FOR AI AGENT

After running FINAL VALIDATION:
- If ALL ✅ → STOP and report success to user
- If ANY ❌ → Fix the failing item(s), then restart from PHASE 1
- Maximum iterations: 10 loops before reporting unresolvable issues
- After each fix: document what was changed and why in a summary

## Files to check if issues persist
- `/tmp/apex-axia.log` — Axia runtime errors
- `/tmp/apex-smartliva.log` — SmartLiva runtime errors  
- `/tmp/apex-auth.log` — Auth service errors
- `/tmp/apex-picha.log` — Picha service errors
- `services/axia/pipeline/schemas.py` — Pydantic schemas
- `services/axia/llm/client.py` — LLM API calls
- `services/smartliva/app/vision_analyzer.py` — Vision API calls
- `services/smartliva/app/main.py` — Chat API calls
- `services/axia/app.py` — Main Flask routes
```
