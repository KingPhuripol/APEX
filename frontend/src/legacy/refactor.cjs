const fs = require('fs');
const path = require('path');

const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  let content = fs.readFileSync(path.join(__dirname, file), 'utf8');

  // Fix React imports
  content = content.replace(/const\s+\{([^}]+)\}\s*=\s*React;/g, 'import React, { $1 } from "react";');

  if (file === 'ui.jsx') {
    content = content.replace(/Object\.assign\(window,\s*\{([^}]+)\}\s*\);/g, 'export { $1 };');
  } else {
    // Other files extract from window
    content = content.replace(/const\s+\{([^}]+)\}\s*=\s*window;/g, 'import { $1 } from "./ui.jsx";');
    
    // app.jsx specific fixes
    if (file === 'app.jsx') {
      content = content.replace(/const root = ReactDOM\.createRoot\(document\.getElementById\("root"\)\);/, 'import { createRoot } from "react-dom/client";\nconst root = createRoot(document.getElementById("root"));');
      content = `import Login from './login.jsx';\nimport Hub from './hub.jsx';\nimport AxiaApp from './axia.jsx';\nimport SmartLivaApp from './smartliva.jsx';\nimport PichaApp from './picha.jsx';\nimport Sidebar from './sidebar.jsx';\n` + content;
    }
  }

  // Export default for main components
  if (file === 'login.jsx') content += '\nexport default Login;';
  if (file === 'sidebar.jsx') content += '\nexport default Sidebar;';
  if (file === 'hub.jsx') content += '\nexport default Hub;';
  if (file === 'axia.jsx') content += '\nexport default AxiaApp;';
  if (file === 'smartliva.jsx') content += '\nexport default SmartLivaApp;';
  if (file === 'picha.jsx') content += '\nexport default PichaApp;';
  if (file === 'app.jsx') content += '\nexport default App;';

  // Fix lucide Icon component inside ui.jsx
  if (file === 'ui.jsx') {
    // Instead of window.lucide, we should use lucide-react dynamically, or just use simple SVG.
    // Actually, we can install lucide-react, but the Icon component expects dynamic names.
    // The easiest fix for Icon component without breaking old string-based names is to import icons from 'lucide-react'.
    content = `import * as LucideIcons from "lucide-react";\n` + content;
    content = content.replace(/const node = window\.lucide\?\.icons\?\.\[key\];/g, 'const node = null;');
    content = content.replace(/function Icon\(\{([^}]+)\}\) \{[\s\S]*?return <span ref=\{ref\}[^>]*\/>;\s*\}/, 
      `function Icon({ name, size = 16, className = "", strokeWidth = 1.75, style }) {
        const key = _pascal(name);
        const LucideIcon = LucideIcons[key];
        if (!LucideIcon) return <span className={className} style={{...style, width: size, height: size, display: 'inline-block'}} />;
        return <LucideIcon size={size} className={className} strokeWidth={strokeWidth} style={style} />;
      }`
    );
  }

  fs.writeFileSync(path.join(__dirname, file), content, 'utf8');
  console.log(`Refactored ${file}`);
});
