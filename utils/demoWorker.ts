import { parseDemoJson } from './demoParser';

self.onmessage = async (e: MessageEvent) => {
    try {
        const { file } = e.data;
        
        // Read file contents as text
        const text = await file.text();
        
        // Parse JSON
        const json = JSON.parse(text);
        
        // Parse Match
        const match = parseDemoJson(json, file.lastModified, e.data.keepRaw);
        
        // Send result back
        self.postMessage({ success: true, match });
    } catch (err: any) {
        self.postMessage({ success: false, error: err.message || 'Unknown Error in Worker' });
    }
};
