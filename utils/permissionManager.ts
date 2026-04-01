export type ActionType = 'add' | 'edit' | 'delete' | 'view';
export type DataType = 'match' | 'tournament' | 'bon' | 'group' | 'player' | 'tactic' | 'utility';

export interface PermissionRequest {
    action: ActionType;
    dataType: DataType;
    dataId?: string;
    groupId?: string;
}

class PermissionManager {
    private static instance: PermissionManager;

    private constructor() {}

    public static getInstance(): PermissionManager {
        if (!PermissionManager.instance) {
            PermissionManager.instance = new PermissionManager();
        }
        return PermissionManager.instance;
    }

    /**
     * Check if the current user has permission to perform an action on a specific data type.
     * In the future, this will integrate with the Copilot and backend roles.
     * For now, it provides a centralized place to manage these checks.
     */
    public can(request: PermissionRequest): boolean {
        // Default allow for now, but this is the central point for future logic
        // e.g., checking if the user is an admin, or if they own the group
        
        // If it's a view action, generally allow
        if (request.action === 'view') {
            return true;
        }

        // For other actions, we might want to check group ownership or global admin status
        // Currently, we'll just return true to not break existing functionality,
        // but this sets up the architecture for the Copilot feature.
        return true;
    }

    /**
     * Enforce permission. Throws an error if permission is denied.
     */
    public enforce(request: PermissionRequest): void {
        if (!this.can(request)) {
            throw new Error(`Permission denied: Cannot ${request.action} ${request.dataType}`);
        }
    }
}

export const permissionManager = PermissionManager.getInstance();
