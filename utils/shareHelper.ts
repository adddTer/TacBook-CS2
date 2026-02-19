
/**
 * Triggers a browser download for the given blob.
 */
export const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Attempts to share the content using the Native Share API (Mobile/Modern Browsers).
 * Returns true if sharing was initiated (or at least attempted/supported), false if not supported.
 */
export const shareFile = async (blob: Blob, filename: string, title: string, text: string): Promise<boolean> => {
    // Check if the browser supports file sharing
    if (navigator.canShare && navigator.share) {
        const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
        const shareData = {
            files: [file],
            title: title,
            text: text
        };

        if (navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
                return true;
            } catch (e: any) {
                // Ignore AbortError (User cancelled the share sheet), but return true as "supported"
                if (e.name === 'AbortError') {
                    return true;
                }
                console.warn("Share failed:", e);
                return false;
            }
        }
    }
    return false;
};

/**
 * Legacy wrapper: Tries to share, falls back to download.
 */
export const shareContent = async (blob: Blob, filename: string, title: string, text: string) => {
    const supported = await shareFile(blob, filename, title, text);
    if (!supported) {
        downloadBlob(blob, filename);
    }
};
