const fs = require('fs');
let code = fs.readFileSync('components/TacticDetailView.tsx', 'utf8');
const searchStr = `<h1 className="text-2xl font-black text-neutral-900 dark:text-white mb-2 leading-tight">{tactic.title || (tactic as any).name || '无标题战术'}</h1>`;
const replaceStr = `<h1 className="text-2xl font-black text-neutral-900 dark:text-white mb-2 leading-tight">{tactic.title || (tactic as any).name || '无标题战术'}</h1>
                
                {tactic.referenceLink && (
                    <div className="mb-3">
                        <a href={tactic.referenceLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 px-2.5 py-1.5 rounded-lg transition-colors w-fit">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            战术参考链接
                        </a>
                    </div>
                )}`;

if(code.includes(searchStr)) {
    code = code.replace(searchStr, replaceStr);
    fs.writeFileSync('components/TacticDetailView.tsx', code);
    console.log("Patched TacticDetailView.tsx successfully.");
} else {
    console.log("Could not find search string in TacticDetailView.");
}
