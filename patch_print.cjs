const fs = require('fs');
let code = fs.readFileSync('components/TacticPrintPreview.tsx', 'utf8');
const searchStr = `{tactic.title && (
              <h2 className="text-2xl font-bold mt-1 uppercase tracking-wider">
                {tactic.title}
              </h2>
            )}`;
const replaceStr = `{tactic.title && (
              <h2 className="text-2xl font-bold mt-1 uppercase tracking-wider">
                {tactic.title}
              </h2>
            )}
            {tactic.referenceLink && (
              <p className="mt-2 text-sm text-neutral-600 font-mono font-medium">
                参考链接: {tactic.referenceLink}
              </p>
            )}`;

if(code.includes(searchStr)) {
    code = code.replace(searchStr, replaceStr);
    fs.writeFileSync('components/TacticPrintPreview.tsx', code);
    console.log("Patched TacticPrintPreview.tsx successfully.");
} else {
    console.log("Could not find search string in TacticPrintPreview.");
}
