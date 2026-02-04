
import JSZip from 'jszip';
import { Tactic } from '../types';

/**
 * Exports a tactic object to a .zip file (renamed as .tac).
 * 
 * Logic:
 * 1. Base64 images are extracted from the JSON.
 * 2. Images are saved as binary files inside the zip (e.g., 'map.jpg', 'action_1.jpg').
 * 3. The JSON references are updated to point to these relative paths (e.g., './map.jpg').
 * 4. This ensures the JSON is lightweight and images are portable.
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
        const fileName = 'map_visual.jpg'; // We assume jpeg from our compressor
        zip.file(fileName, blob);
        t.map_visual = `./${fileName}`;
    }

    // 2. Process Action Images
    if (t.actions) {
        for (let i = 0; i < t.actions.length; i++) {
            const action = t.actions[i];
            if (action.image && action.image.startsWith('data:image')) {
                const blob = await base64ToBlob(action.image);
                const fileName = `action_${action.id}.jpg`;
                zip.file(fileName, blob);
                action.image = `./${fileName}`;
            }
        }
    }

    // 3. Add Data JSON
    zip.file("data.json", JSON.stringify(t, null, 2));

    // 4. Generate Zip
    const content = await zip.generateAsync({ type: "blob" });
    return content;
};
