const fs = require('fs');
let code = fs.readFileSync('components/TacticEditor.tsx', 'utf8');
const searchStr = `{/* Tags */}`;
const replaceStr = `                                <div>
                                    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">战术参考 (链接)</label>
                                    <input
                                         type="url"
                                         value={formData.referenceLink || ''}
                                         onChange={e => updateField('referenceLink', e.target.value)}
                                         className="w-full bg-neutral-50 dark:bg-neutral-800 px-3 py-2 rounded-xl text-sm font-medium dark:text-white border border-neutral-100 dark:border-neutral-700 focus:border-blue-500 outline-none transition-colors"
                                         placeholder="https://..."
                                    />
                                </div>
                                {/* Tags */}`;
if(code.includes(searchStr)) {
    code = code.replace(searchStr, replaceStr);
    fs.writeFileSync('components/TacticEditor.tsx', code);
    console.log("Patched TacticEditor.tsx successfully.");
} else {
    console.log("Could not find search string.");
}
