
import JSZip from 'jszip';
import { Tactic, Action } from '../types';

// Updated to accept Blob or File since we might fetch .tac files from the server
export const importTacticFromZip = async (file: Blob | File): Promise<Tactic> => {
  try {
    const zip = await JSZip.loadAsync(file);
    
    // 1. Read data.json
    const jsonFile = zip.file("data.json");
    if (!jsonFile) {
      throw new Error("Invalid Tactic Zip: data.json not found");
    }
    const jsonContent = await jsonFile.async("string");
    const tactic: Tactic = JSON.parse(jsonContent);

    // 2. Helper to replace paths with Blob URLs
    const replaceImagePaths = async (path: string): Promise<string> => {
      if (!path || !path.startsWith('./')) return path;
      
      // Remove './' and find file
      const cleanPath = path.replace('./', ''); 
      const imgFile = zip.file(cleanPath);
      
      if (imgFile) {
        const blob = await imgFile.async("blob");
        return URL.createObjectURL(blob);
      }
      return path;
    };

    // 3. Process Map Visual
    if (tactic.map_visual) {
      tactic.map_visual = await replaceImagePaths(tactic.map_visual);
    }

    // 4. Process Action Images
    if (tactic.actions) {
      tactic.actions = await Promise.all(tactic.actions.map(async (action: Action) => {
        if (action.image) {
           const newImage = await replaceImagePaths(action.image);
           return { ...action, image: newImage };
        }
        return action;
      }));
    }

    // 5. Ensure ID is string to prevent conflict logic errors
    tactic.id = String(tactic.id);

    return tactic;
  } catch (error) {
    console.error("Failed to import tactic:", error);
    throw error;
  }
};
