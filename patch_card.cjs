const fs = require('fs');
let code = fs.readFileSync('components/TacticCard.tsx', 'utf8');
const searchStr = `<h3 className="text-lg font-bold leading-tight text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {tactic.title || (tactic as any).name || '无标题战术'}
                </h3>`;
const replaceStr = `<h3 className="text-lg font-bold leading-tight text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {tactic.title || (tactic as any).name || '无标题战术'}
                </h3>
                {tactic.referenceLink && (
                    <span className="mt-1 text-blue-500 flex-shrink-0" title="包含战术参考链接">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </span>
                )}`;

if(code.includes(searchStr)) {
    code = code.replace(searchStr, replaceStr);
    fs.writeFileSync('components/TacticCard.tsx', code);
    console.log("Patched TacticCard.tsx successfully.");
} else {
    console.log("Could not find search string in TacticCard.");
}
