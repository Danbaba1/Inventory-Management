// src/validation/production.validation.js

import { supabase } from "../config/supabase.js";

/**
 * Validate production line creation data
 */
const validateProductionLineCreation = async (req, res, next) => {
    try {
        const {
            itemId,
            itemCategoryId,
            businessId,
            actualItemsNumber,
            name,
            manager,
            resources
        } = req.body;

        // Required fields validation
        if (!itemId) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'itemId is required'
            });
        }

        if (!businessId) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'businessId is required'
            });
        }

        if (!actualItemsNumber || actualItemsNumber <= 0) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'actualItemsNumber must be a positive number'
            });
        }

        if (!name || name.trim() === '') {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'name is required'
            });
        }

        if (!manager || manager.trim() === '') {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'manager is required'
            });
        }

        if (!resources || !Array.isArray(resources) || resources.length === 0) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'At least one resource is required'
            });
        }

        // Validate each resource
        for (let i = 0; i < resources.length; i++) {
            const resource = resources[i];

            if (!resource.resourceItemId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: `Resource ${i + 1}: resourceItemId is required`
                });
            }

            if (!resource.resourceName || resource.resourceName.trim() === '') {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: `Resource ${i + 1}: resourceName is required`
                });
            }

            if (!resource.actualNeededQuantity || resource.actualNeededQuantity <= 0) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: `Resource ${i + 1}: actualNeededQuantity must be a positive number`
                });
            }

            if (!resource.unitOfMeasure || resource.unitOfMeasure.trim() === '') {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: `Resource ${i + 1}: unitOfMeasure is required`
                });
            }
        }

        // Verify business ownership
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('id, owner_id')
            .eq('id', businessId)
            .single();

        if (businessError || !business) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Business not found'
            });
        }

        if (business.owner_id !== req.user.id) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to create production for this business'
            });
        }

        // Verify product exists and belongs to business
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('id, business_id, name')
            .eq('id', itemId)
            .single();

        if (productError || !product) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Product not found'
            });
        }

        if (product.business_id !== businessId) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Product does not belong to this business'
            });
        }

        // Verify all resource items exist and belong to business
        for (const resource of resources) {
            const { data: resourceItem, error: resourceError } = await supabase
                .from('products')
                .select('id, business_id, name')
                .eq('id', resource.resourceItemId)
                .single();

            if (resourceError || !resourceItem) {
                return res.status(404).json({
                    error: 'Not Found',
                    message: `Resource item '${resource.resourceName}' not found`
                });
            }

            if (resourceItem.business_id !== businessId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: `Resource '${resource.resourceName}' does not belong to this business`
                });
            }
        }

        next();
    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({
            error: 'Server Error',
            message: 'Error validating production line data'
        });
    }
};

/**
 * Validate resource creation data
 */
const validateResourceCreation = async (req, res, next) => {
    try {
        const {
            resourceItemId,
            resourceName,
            actualNeededQuantity,
            unitOfMeasure,
            businessId
        } = req.body;

        if (!resourceItemId) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'resourceItemId is required'
            });
        }

        if (!resourceName || resourceName.trim() === '') {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'resourceName is required'
            });
        }

        if (!actualNeededQuantity || actualNeededQuantity <= 0) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'actualNeededQuantity must be a positive number'
            });
        }

        if (!unitOfMeasure || unitOfMeasure.trim() === '') {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'unitOfMeasure is required'
            });
        }

        if (!businessId) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'businessId is required'
            });
        }

        // Verify resource item exists and belongs to business
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('id, business_id, name')
            .eq('id', resourceItemId)
            .single();

        if (productError || !product) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Resource item not found'
            });
        }

        if (product.business_id !== businessId) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Resource item does not belong to this business'
            });
        }

        next();
    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({
            error: 'Server Error',
            message: 'Error validating resource data'
        });
    }
};

/**
 * Validate request creation data
 */
const validateRequestCreation = async (req, res, next) => {
    try {
        const {
            resourceUsedId,
            dayNumber,
            requestedQuantity,
            businessId
        } = req.body;

        if (!resourceUsedId) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'resourceUsedId is required'
            });
        }

        if (!dayNumber || dayNumber <= 0) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'dayNumber must be a positive number'
            });
        }

        if (!requestedQuantity || requestedQuantity <= 0) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'requestedQuantity must be a positive number'
            });
        }

        if (!businessId) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'businessId is required'
            });
        }

        next();
    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({
            error: 'Server Error',
            message: 'Error validating request data'
        });
    }
};

/**
 * Validate production completion data
 */
const validateProductionCompletion = async (req, res, next) => {
    try {
        const { finalItemsProduced, businessId } = req.body;

        if (!finalItemsProduced && finalItemsProduced !== 0) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'finalItemsProduced is required'
            });
        }

        if (finalItemsProduced < 0) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'finalItemsProduced cannot be negative'
            });
        }

        if (!businessId) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'businessId is required'
            });
        }

        next();
    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({
            error: 'Server Error',
            message: 'Error validating completion data'
        });
    }
};

/**
 * Validate business ownership
 */
const validateBusinessOwnership = async (req, res, next) => {
    try {
        const businessId = req.body.businessId || req.query.businessId;

        if (!businessId) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'businessId is required'
            });
        }

        const { data: business, error } = await supabase
            .from('businesses')
            .select('id, owner_id')
            .eq('id', businessId)
            .single();

        if (error || !business) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Business not found'
            });
        }

        if (business.owner_id !== req.user.id) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to access this business'
            });
        }

        req.business = business;
        next();
    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({
            error: 'Server Error',
            message: 'Error validating business ownership'
        });
    }
};

/**
 * Validate inventory availability before fulfillment
 */
const validateInventoryAvailability = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Get request details
        const { data: request, error: requestError } = await supabase
            .from('production_request_lines')
            .select('id, item_id, requested_quantity, status')
            .eq('id', id)
            .single();

        if (requestError || !request) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Production request not found'
            });
        }

        if (request.status !== 'PENDING') {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Request is not pending'
            });
        }

        // Check inventory
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('id, name, quantity')
            .eq('id', request.item_id)
            .single();

        if (productError || !product) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Product not found'
            });
        }

        if (product.quantity < request.requested_quantity) {
            return res.status(400).json({
                error: 'Insufficient Inventory',
                message: `Insufficient stock for ${product.name}. Available: ${product.quantity}, Required: ${request.requested_quantity}`
            });
        }

        next();
    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({
            error: 'Server Error',
            message: 'Error validating inventory availability'
        });
    }
};

module.exports = {
    validateProductionLineCreation,
    validateResourceCreation,
    validateRequestCreation,
    validateProductionCompletion,
    validateBusinessOwnership,
    validateInventoryAvailability
};