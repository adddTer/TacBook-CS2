
import { shareFile, downloadBlob } from './shareHelper';

/**
 * Exports player statistics to a JSON file.
 * @param playerStats The array of calculated player statistics.
 * @returns A promise that resolves to a status string: 'shared', 'downloaded', or 'error'.
 */
export const exportPlayersToJson = async (playerStats: any[]): Promise<'shared' | 'downloaded' | 'error'> => {
    if (!playerStats || playerStats.length === 0) {
        alert("没有可导出的队员数据。");
        return 'error';
    }

    const dataToExport = {
        exportDate: new Date().toISOString(),
        players: playerStats
    };

    const json = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const filename = `players_export_${new Date().toISOString().split('T')[0]}.json`;

    try {
        const shared = await shareFile(blob, filename, "导出队员数据", "所有队员的统计数据");
        if (!shared) {
            console.log("Share API unavailable or failed, falling back to download.");
            downloadBlob(blob, filename);
            return 'downloaded';
        }
        return 'shared';
    } catch (e) {
        console.error("Export failed:", e);
        // Final fallback
        downloadBlob(blob, filename);
        return 'downloaded';
    }
};
