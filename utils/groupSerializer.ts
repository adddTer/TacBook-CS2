
import JSZip from 'jszip';
import { ContentGroup, Tactic, Utility, GroupMetadata, Match } from '../types';

// --- Export Logic ---

export const exportGroupToZip = async (group: ContentGroup): Promise<Blob> => {
    const zip = new JSZip();
    
    // 1. Manifest
    // Ensure we export the current state of metadata (which might have been updated in the export modal)
    zip.file("manifest.json", JSON.stringify(group.metadata, null, 2));

    // 2. Tactics Folder
    const tacticsFolder = zip.folder("tactics");
    if (tacticsFolder) {
        group.tactics.forEach(t => {
            // Clone to avoid mutating state
            const tacticCopy = JSON.parse(JSON.stringify(t)); 
            delete tacticCopy.groupId; // Don't export runtime IDs
            delete tacticCopy._isTemp;
            tacticsFolder.file(`${t.id}.json`, JSON.stringify(tacticCopy, null, 2));
        });
    }

    // 3. Utilities Folder
    const utilitiesFolder = zip.folder("utilities");
    if (utilitiesFolder) {
        group.utilities.forEach(u => {
            const utilCopy = JSON.parse(JSON.stringify(u));
            delete utilCopy.groupId;
            delete utilCopy._isTemp;
            utilitiesFolder.file(`${u.id}.json`, JSON.stringify(utilCopy, null, 2));
        });
    }

    // 4. Matches Folder
    const matchesFolder = zip.folder("matches");
    if (matchesFolder && group.matches) {
        group.matches.forEach(m => {
            const matchCopy = JSON.parse(JSON.stringify(m));
            delete matchCopy.groupId;
            matchesFolder.file(`${m.id}.json`, JSON.stringify(matchCopy, null, 2));
        });
    }

    return await zip.generateAsync({ type: "blob" });
};

// --- Import Logic ---

export const importGroupFromZip = async (file: File | Blob): Promise<ContentGroup> => {
    const zip = await JSZip.loadAsync(file);
    
    // 1. Read Manifest
    const manifestFile = zip.file("manifest.json");
    if (!manifestFile) throw new Error("无效的战术包：缺少 manifest.json");
    
    const manifestStr = await manifestFile.async("string");
    const metadata: GroupMetadata = JSON.parse(manifestStr);
    
    // UPDATE: Use the value from the file. If undefined, default to true (safe).
    if (metadata.isReadOnly === undefined) {
        metadata.isReadOnly = true; 
    }

    const tactics: Tactic[] = [];
    const utilities: Utility[] = [];
    const matches: Match[] = [];

    // 2. Read Tactics
    const tacticsFolder = zip.folder("tactics");
    if (tacticsFolder) {
        const tacticFiles = tacticsFolder.filter((path, file) => file.name.endsWith('.json'));
        for (const file of tacticFiles) {
            const content = await file.async("string");
            try {
                const t = JSON.parse(content);
                t.groupId = metadata.id; // Link to group
                tactics.push(t);
            } catch (e) { console.warn("Failed to parse tactic", file.name); }
        }
    }

    // 3. Read Utilities
    const utilitiesFolder = zip.folder("utilities");
    if (utilitiesFolder) {
        const utilFiles = utilitiesFolder.filter((path, file) => file.name.endsWith('.json'));
        for (const file of utilFiles) {
            const content = await file.async("string");
            try {
                const u = JSON.parse(content);
                u.groupId = metadata.id; // Link to group
                utilities.push(u);
            } catch (e) { console.warn("Failed to parse utility", file.name); }
        }
    }

    // 4. Read Matches
    const matchesFolder = zip.folder("matches");
    if (matchesFolder) {
        const matchFiles = matchesFolder.filter((path, file) => file.name.endsWith('.json'));
        for (const file of matchFiles) {
            const content = await file.async("string");
            try {
                const m = JSON.parse(content);
                m.groupId = metadata.id; // Link to group
                matches.push(m);
            } catch (e) { console.warn("Failed to parse match", file.name); }
        }
    }

    return {
        metadata,
        tactics,
        utilities,
        matches
    };
};
