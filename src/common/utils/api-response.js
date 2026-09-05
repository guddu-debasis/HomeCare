class ApiResponse {
    // 200 OK - Standard successful response
    static success(res, message = "Success", data = null) {
        return res.status(200).json({
            success: true,
            message,
            data
        });
    }

    // 201 Created - Resource successfully generated
    static created(res, message = "Resource created successfully", data = null) {
        return res.status(201).json({
            success: true,
            message,
            data
        });
    }

    // 202 Accepted - Request received but still processing in background
    static accepted(res, message = "Request accepted and processing") {
        return res.status(202).json({
            success: true,
            message
        });
    }

    // 204 No Content - Successful action, completely empty response body
    static noContent(res) {
        return res.status(204).send();
    }

    // 200 OK with Pagination Metadata - Best practice for listing arrays of items
    static paginated(res, message = "Data retrieved successfully", data = [], pagination = {}) {
        return res.status(200).json({
            success: true,
            message,
            data,
            pagination: {
                page: pagination.page || 1,
                limit: pagination.limit || 10,
                totalItems: pagination.totalItems || 0,
                totalPages: pagination.totalPages || 1,
                hasNextPage: pagination.hasNextPage || false,
                hasPrevPage: pagination.hasPrevPage || false
            }
        });
    }
}

export default ApiResponse;
