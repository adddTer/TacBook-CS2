
import JSZip from 'jszip';
import { Tactic, Utility } from '../types';

/**
 * Exports a tactic or utility object to a .zip file (renamed as .tac or .json).
 */
export const exportTacticToZip = async (tactic: Tactic) => {
    const zip = new JSZip();
    const t = JSON.parse(JSON.stringify(tactic)); // Deep copy to modify

    // Helper to convert Base64 to Blob
    const base64ToBlob = async (base64: string) => {
        const res = await fetch(base64);
        return await res.blob();
    };

    // 1. Process Map Visual
    if (t.map_visual && t.map_visual.startsWith('data:image')) {
        const blob = await base64ToBlob(t.map_visual);
        const fileName = 'map_visual.jpg';
        zip.file(fileName, blob);
        t.map_visual = `./${fileName}`;
    }

    // 2. Process Action Images (New Array Support)
    if (t.actions) {
        for (let i = 0; i < t.actions.length; i++) {
            const action = t.actions[i];
            
            // Handle Legacy Single Image (convert to array structure usually, or just save it)
            if (action.image && action.image.startsWith('data:image')) {
                const blob = await base64ToBlob(action.image);
                const fileName = `action_${action.id}_legacy.jpg`;
                zip.file(fileName, blob);
                action.image = `./${fileName}`;
            }

            // Handle New Images Array
            if (action.images && action.images.length > 0) {
                for (let j = 0; j < action.images.length; j++) {
                    const img = action.images[j];
                    if (img.url && img.url.startsWith('data:image')) {
                        const blob = await base64ToBlob(img.url);
                        const fileName = `action_${action.id}_${j}.jpg`;
                        zip.file(fileName, blob);
                        img.url = `./${fileName}`;
                    }
                }
            }
        }
    }

    // 3. Add Data JSON
    zip.file("data.json", JSON.stringify(t, null, 2));

    // 4. Generate Zip
    const content = await zip.generateAsync({ type: "blob" });
    return content;
};
