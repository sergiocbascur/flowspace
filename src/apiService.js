// ... existing code ...

// ============ CHECKLISTS ============

export const apiChecklists = {
    async getByResource(resourceId, type) {
        return apiRequest(`/checklists/resource/${resourceId}/${type}`);
    },

    async addItem(checklistId, item) {
        return apiRequest(`/checklists/${checklistId}/items`, {
            method: 'POST',
            body: item
        });
    },

    async updateItem(checklistId, itemId, data) {
        return apiRequest(`/checklists/${checklistId}/items/${itemId}`, {
            method: 'PATCH',
            body: data
        });
    },

    async deleteItem(checklistId, itemId) {
        return apiRequest(`/checklists/${checklistId}/items/${itemId}`, {
            method: 'DELETE'
        });
    }
};