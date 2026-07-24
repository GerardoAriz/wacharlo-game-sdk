/**
 * ISocialManager
 *
 * Interface for user-facing platform social actions (`sdk.social`).
 * Strictly reserved for user-facing social actions such as inviting friends or sharing room links.
 */
export interface ISocialManager {
    /**
     * Triggers the host platform UI/dialog to invite a friend to a multiplayer room.
     *
     * @param roomId  The target room identifier
     * @param payload Optional additional metadata (e.g., custom invitation message, game mode)
     *
     * @example
     *   await sdk.social.inviteFriend('room_12345');
     */
    inviteFriend(roomId: string, payload?: Record<string, unknown>): Promise<void>;
    /**
     * Triggers the host platform share dialog/native share sheet to share a room link or join code.
     *
     * @param roomId  The target room identifier
     * @param payload Optional additional metadata
     *
     * @example
     *   await sdk.social.shareRoom('room_12345');
     */
    shareRoom(roomId: string, payload?: Record<string, unknown>): Promise<void>;
}
//# sourceMappingURL=ISocialManager.d.ts.map