
/**
 * Reads an image file and returns it as a Base64 string (Data URL).
 * No compression is applied as per new requirements.
 */
export const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const result = event.target?.result as string;
            if (result) {
                resolve(result);
            } else {
                reject(new Error("Failed to read file"));
            }
        };
        reader.onerror = (err) => reject(err);
    });
};
