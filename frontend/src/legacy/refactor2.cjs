const fs = require('fs');
const path = require('path');

const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.jsx'));

const uiImports = `import React, { useState, useEffect, useRef, useMemo, useCallback, useContext } from 'react';
import { Icon, MODULES, Badge, SectionLabel, Stat, ProgressBar, RadialGauge, Sparkline, Btn, Kbd, Card, StatusDot, KV, PageHeader, PatientStrip, PatientPhoto, applyAccent, Tip, InfoTip, AIOverride, Modal, MfaInput, ToastProvider, useToasts, fmtTime, FLAG_DEFS } from './ui.jsx';
`;

files.forEach(file => {
  let content = fs.readFileSync(path.join(__dirname, file), 'utf8');

  // Remove previous script artifacts
  content = content.replace(/import React.*?from 'react';/g, '');
  content = content.replace(/import \{.*?\} from '\.\/ui\.jsx';/g, '');
  content = content.replace(/Object\.assign\(window,\s*\{([^}]+)\}\s*\);/g, '');

  if (file !== 'ui.jsx' && file !== 'app.jsx') {
    content = uiImports + content;
  }

  fs.writeFileSync(path.join(__dirname, file), content, 'utf8');
  console.log(`Prepend imports to ${file}`);
});
