// src/controllers/production.controller.js

import ProductionService from '../services/production.service.js';

class ProductionController {
    // ============================================
    // PRODUCTION LINE CONTROLLERS
    // ============================================

    /**
     * Create new production line with resources
     * POST /api/production-lines
     */
    static async createProductionLine(req, res) {
        try {
            const {
                itemId,
                itemCategoryId,
                businessId,
                actualItemsNumber,
                description,
                name,
                manager,
                itemFpo,
                resources
            } = req.body;

            // Validation
            if (!itemId || !businessId || !actualItemsNumber || !name || !manager) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'itemId, businessId, actualItemsNumber, name, and manager are required'
                });
            }

            if (!resources || !Array.isArray(resources) || resources.length === 0) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'At least one resource is required'
                });
            }

            // Validate each resource
            for (const resource of resources) {
                if (!resource.resourceItemId || !resource.resourceName ||
                    !resource.actualNeededQuantity || !resource.unitOfMeasure) {
                    return res.status(400).json({
                        error: 'Validation Error',
                        message: 'Each resource must have resourceItemId, resourceName, actualNeededQuantity, and unitOfMeasure'
                    });
                }
            }

            const productionLine = await ProductionService.createProductionLine(
                req.body,
                req.user.id
            );

            res.status(201).json({
                success: true,
                message: 'Production line created successfully',
                data: productionLine
            });
        } catch (error) {
            console.error('Create production line controller error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message
            });
        }
    }

    /**
     * Get all production lines for a business
     * GET /api/production-lines?businessId=xxx&status=xxx&page=1&limit=10
     */
    static async getProductionLines(req, res) {
        try {
            const { businessId, status, page, limit, sortBy, sortOrder } = req.query;

            if (!businessId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'businessId is required'
                });
            }

            const result = await ProductionService.getAllProductionLines(businessId, {
                status,
                page: page || 1,
                limit: limit || 10,
                sortBy: sortBy || 'created_at',
                sortOrder: sortOrder || 'desc'
            });

            res.status(200).json({
                success: true,
                data: result.data,
                pagination: result.pagination
            });
        } catch (error) {
            console.error('Get production lines controller error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message
            });
        }
    }

    /**
     * Get single production line by ID
     * GET /api/production-lines/:id?businessId=xxx
     */
    static async getProductionLineById(req, res) {
        try {
            const { id } = req.params;
            const { businessId } = req.query;

            if (!businessId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'businessId is required'
                });
            }

            const productionLine = await ProductionService.getProductionLineById(
                id,
                businessId
            );

            res.status(200).json({
                success: true,
                data: productionLine
            });
        } catch (error) {
            console.error('Get production line by ID controller error:', error);
            const statusCode = error.message.includes('not found') ? 404 : 500;
            res.status(statusCode).json({
                error: statusCode === 404 ? 'Not Found' : 'Server Error',
                message: error.message
            });
        }
    }

    /**
     * Update production line
     * PUT /api/production-lines/:id
     */
    static async updateProductionLine(req, res) {
        try {
            const { id } = req.params;
            const { businessId, ...updates } = req.body;

            if (!businessId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'businessId is required'
                });
            }

            // Prevent updating computed fields
            delete updates.id;
            delete updates.created_at;
            delete updates.updated_at;

            const updatedProduction = await ProductionService.updateProductionLine(
                id,
                businessId,
                updates
            );

            res.status(200).json({
                success: true,
                message: 'Production line updated successfully',
                data: updatedProduction
            });
        } catch (error) {
            console.error('Update production line controller error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message
            });
        }
    }

    /**
     * Start production (change status to IN_PROGRESS)
     * PUT /api/production-lines/:id/start
     */
    static async startProduction(req, res) {
        try {
            const { id } = req.params;
            const { businessId } = req.body;

            if (!businessId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'businessId is required'
                });
            }

            const production = await ProductionService.startProductionLine(
                id,
                businessId
            );

            res.status(200).json({
                success: true,
                message: 'Production started successfully',
                data: production
            });
        } catch (error) {
            console.error('Start production controller error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message
            });
        }
    }

    /**
     * Complete production line
     * PUT /api/production-lines/:id/complete
     */
    static async completeProduction(req, res) {
        try {
            const { id } = req.params;
            const { businessId, finalItemsProduced } = req.body;

            if (!businessId || !finalItemsProduced) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'businessId and finalItemsProduced are required'
                });
            }

            if (finalItemsProduced < 0) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'finalItemsProduced must be a positive number'
                });
            }

            const result = await ProductionService.completeProductionLine(
                id,
                businessId,
                finalItemsProduced,
                req.user.id
            );

            res.status(200).json({
                success: true,
                message: 'Production completed successfully',
                data: result
            });
        } catch (error) {
            console.error('Complete production controller error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message
            });
        }
    }

    /**
     * Delete production line
     * DELETE /api/production-lines/:id
     */
    static async deleteProductionLine(req, res) {
        try {
            const { id } = req.params;
            const { businessId } = req.query;

            if (!businessId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'businessId is required'
                });
            }

            const result = await ProductionService.deleteProductionLine(
                id,
                businessId
            );

            res.status(200).json(result);
        } catch (error) {
            console.error('Delete production line controller error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message
            });
        }
    }

    // ============================================
    // PRODUCTION RESOURCES CONTROLLERS
    // ============================================

    /**
     * Add resource to production line
     * POST /api/production-lines/:id/resources
     */
    static async addResource(req, res) {
        try {
            const { id } = req.params;
            const { businessId, ...resourceData } = req.body;

            if (!businessId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'businessId is required'
                });
            }

            // Validate resource data
            if (!resourceData.resourceItemId || !resourceData.resourceName ||
                !resourceData.actualNeededQuantity || !resourceData.unitOfMeasure) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'resourceItemId, resourceName, actualNeededQuantity, and unitOfMeasure are required'
                });
            }

            const resource = await ProductionService.addResourceToProduction(
                id,
                businessId,
                resourceData
            );

            res.status(201).json({
                success: true,
                message: 'Resource added successfully',
                data: resource
            });
        } catch (error) {
            console.error('Add resource controller error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message
            });
        }
    }

    /**
     * Get resources for a production line
     * GET /api/production-lines/:id/resources?businessId=xxx
     */
    static async getResources(req, res) {
        try {
            const { id } = req.params;
            const { businessId } = req.query;

            if (!businessId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'businessId is required'
                });
            }

            const resources = await ProductionService.getResourcesByProduction(
                id,
                businessId
            );

            res.status(200).json({
                success: true,
                data: resources
            });
        } catch (error) {
            console.error('Get resources controller error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message
            });
        }
    }

    /**
     * Update resource
     * PUT /api/production-resources/:id
     */
    static async updateResource(req, res) {
        try {
            const { id } = req.params;
            const { businessId, ...updates } = req.body;

            if (!businessId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'businessId is required'
                });
            }

            // Prevent updating computed fields
            delete updates.id;
            delete updates.variance;
            delete updates.variance_percentage;
            delete updates.created_at;
            delete updates.updated_at;

            const resource = await ProductionService.updateResource(
                id,
                businessId,
                updates
            );

            res.status(200).json({
                success: true,
                message: 'Resource updated successfully',
                data: resource
            });
        } catch (error) {
            console.error('Update resource controller error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message
            });
        }
    }

    /**
     * Delete resource
     * DELETE /api/production-resources/:id
     */
    static async deleteResource(req, res) {
        try {
            const { id } = req.params;
            const { businessId } = req.query;

            if (!businessId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'businessId is required'
                });
            }

            const result = await ProductionService.deleteResource(id, businessId);

            res.status(200).json(result);
        } catch (error) {
            console.error('Delete resource controller error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message
            });
        }
    }

    // ============================================
    // PRODUCTION REQUEST CONTROLLERS
    // ============================================

    /**
     * Create production request
     * POST /api/production-lines/:id/requests
     */
    static async createRequest(req, res) {
        try {
            const { id } = req.params;
            const { businessId, ...requestData } = req.body;

            if (!businessId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'businessId is required'
                });
            }

            // Validate request data
            if (!requestData.resourceUsedId || !requestData.dayNumber ||
                !requestData.requestedQuantity) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'resourceUsedId, dayNumber, and requestedQuantity are required'
                });
            }

            const request = await ProductionService.createProductionRequest(
                id,
                businessId,
                requestData,
                req.user.id
            );

            res.status(201).json({
                success: true,
                message: 'Production request created successfully',
                data: request
            });
        } catch (error) {
            console.error('Create request controller error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message
            });
        }
    }

    /**
     * Get requests for a production line
     * GET /api/production-lines/:id/requests?businessId=xxx&status=xxx
     */
    static async getRequests(req, res) {
        try {
            const { id } = req.params;
            const { businessId, status, resourceUsedId } = req.query;

            if (!businessId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'businessId is required'
                });
            }

            const requests = await ProductionService.getRequestsByProduction(
                id,
                businessId,
                { status, resourceUsedId }
            );

            res.status(200).json({
                success: true,
                data: requests
            });
        } catch (error) {
            console.error('Get requests controller error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message
            });
        }
    }

    /**
     * Fulfill production request
     * PUT /api/production-requests/:id/fulfill
     */
    static async fulfillRequest(req, res) {
        try {
            const { id } = req.params;
            const { businessId } = req.body;

            if (!businessId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'businessId is required'
                });
            }

            const result = await ProductionService.fulfillProductionRequest(
                id,
                businessId,
                req.user.id
            );

            res.status(200).json({
                success: true,
                message: 'Production request fulfilled successfully',
                data: result
            });
        } catch (error) {
            console.error('Fulfill request controller error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message
            });
        }
    }

    /**
     * Cancel production request
     * PUT /api/production-requests/:id/cancel
     */
    static async cancelRequest(req, res) {
        try {
            const { id } = req.params;
            const { businessId } = req.body;

            if (!businessId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'businessId is required'
                });
            }

            const request = await ProductionService.cancelProductionRequest(
                id,
                businessId
            );

            res.status(200).json({
                success: true,
                message: 'Production request cancelled successfully',
                data: request
            });
        } catch (error) {
            console.error('Cancel request controller error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message
            });
        }
    }

    /**
     * Delete production request
     * DELETE /api/production-requests/:id
     */
    static async deleteRequest(req, res) {
        try {
            const { id } = req.params;
            const { businessId } = req.query;

            if (!businessId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'businessId is required'
                });
            }

            const result = await ProductionService.deleteProductionRequest(
                id,
                businessId
            );

            res.status(200).json(result);
        } catch (error) {
            console.error('Delete request controller error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message
            });
        }
    }

    // ============================================
    // ANALYTICS CONTROLLERS
    // ============================================

    /**
     * Get production summary
     * GET /api/production/analytics/summary?businessId=xxx&startDate=xxx&endDate=xxx
     */
    static async getProductionSummary(req, res) {
        try {
            const { businessId, startDate, endDate } = req.query;

            if (!businessId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'businessId is required'
                });
            }

            const summary = await ProductionService.getProductionSummary(businessId, {
                startDate,
                endDate
            });

            res.status(200).json({
                success: true,
                data: summary
            });
        } catch (error) {
            console.error('Get production summary controller error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message
            });
        }
    }

    /**
     * Get production efficiency metrics
     * GET /api/production/analytics/efficiency?businessId=xxx
     */
    static async getProductionEfficiency(req, res) {
        try {
            const { businessId } = req.query;

            if (!businessId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'businessId is required'
                });
            }

            const efficiency = await ProductionService.getProductionEfficiency(businessId);

            res.status(200).json({
                success: true,
                data: efficiency
            });
        } catch (error) {
            console.error('Get production efficiency controller error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message
            });
        }
    }

    /**
     * Get resource variance report
     * GET /api/production/:id/variance?businessId=xxx
     */
    static async getResourceVariance(req, res) {
        try {
            const { id } = req.params;
            const { businessId } = req.query;

            if (!businessId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'businessId is required'
                });
            }

            const report = await ProductionService.getResourceVarianceReport(
                id,
                businessId
            );

            res.status(200).json({
                success: true,
                data: report
            });
        } catch (error) {
            console.error('Get resource variance controller error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message
            });
        }
    }
}

export default ProductionController;