// src/routes/production.route.js

const express = require('express');
const router = express.Router();
const productionController = require('../controllers/production.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

// ============================================
// PRODUCTION LINE ROUTES
// ============================================

/**
 * @route   POST /api/production-lines
 * @desc    Create new production line with resources
 * @access  Private (requires authentication)
 * @body    {
 *   itemId: UUID,
 *   itemCategoryId: UUID (optional),
 *   businessId: UUID,
 *   actualItemsNumber: number,
 *   description: string (optional),
 *   name: string,
 *   manager: string,
 *   itemFpo: string (optional),
 *   resources: [{
 *     resourceItemId: UUID,
 *     resourceCategoryId: UUID (optional),
 *     resourceName: string,
 *     actualNeededQuantity: number,
 *     unitOfMeasure: string,
 *     notes: string (optional)
 *   }]
 * }
 */
router.post(
    '/production-lines',
    authenticateUser,
    productionController.createProductionLine
);

/**
 * @route   GET /api/production-lines
 * @desc    Get all production lines for a business
 * @access  Private
 * @query   businessId (required), status, page, limit, sortBy, sortOrder
 */
router.get(
    '/production-lines',
    authenticateUser,
    productionController.getProductionLines
);

/**
 * @route   GET /api/production-lines/:id
 * @desc    Get single production line by ID with all details
 * @access  Private
 * @query   businessId (required)
 */
router.get(
    '/production-lines/:id',
    authenticateUser,
    productionController.getProductionLineById
);

/**
 * @route   PUT /api/production-lines/:id
 * @desc    Update production line
 * @access  Private
 * @body    { businessId: UUID, ...updates }
 */
router.put(
    '/production-lines/:id',
    authenticateUser,
    productionController.updateProductionLine
);

/**
 * @route   PUT /api/production-lines/:id/start
 * @desc    Start production (PENDING -> IN_PROGRESS)
 * @access  Private
 * @body    { businessId: UUID }
 */
router.put(
    '/production-lines/:id/start',
    authenticateUser,
    productionController.startProduction
);

/**
 * @route   PUT /api/production-lines/:id/complete
 * @desc    Complete production and update inventory
 * @access  Private
 * @body    { businessId: UUID, finalItemsProduced: number }
 */
router.put(
    '/production-lines/:id/complete',
    authenticateUser,
    productionController.completeProduction
);

/**
 * @route   DELETE /api/production-lines/:id
 * @desc    Delete production line (only if PENDING)
 * @access  Private
 * @query   businessId (required)
 */
router.delete(
    '/production-lines/:id',
    authenticateUser,
    productionController.deleteProductionLine
);

// ============================================
// PRODUCTION RESOURCES ROUTES
// ============================================

/**
 * @route   POST /api/production-lines/:id/resources
 * @desc    Add resource to production line
 * @access  Private
 * @body    {
 *   businessId: UUID,
 *   resourceItemId: UUID,
 *   resourceCategoryId: UUID (optional),
 *   resourceName: string,
 *   actualNeededQuantity: number,
 *   unitOfMeasure: string,
 *   notes: string (optional)
 * }
 */
router.post(
    '/production-lines/:id/resources',
    authenticateUser,
    productionController.addResource
);

/**
 * @route   GET /api/production-lines/:id/resources
 * @desc    Get all resources for a production line
 * @access  Private
 * @query   businessId (required)
 */
router.get(
    '/production-lines/:id/resources',
    authenticateUser,
    productionController.getResources
);

/**
 * @route   PUT /api/production-resources/:id
 * @desc    Update resource
 * @access  Private
 * @body    { businessId: UUID, ...updates }
 */
router.put(
    '/production-resources/:id',
    authenticateUser,
    productionController.updateResource
);

/**
 * @route   DELETE /api/production-resources/:id
 * @desc    Delete resource (only if no requests exist)
 * @access  Private
 * @query   businessId (required)
 */
router.delete(
    '/production-resources/:id',
    authenticateUser,
    productionController.deleteResource
);

// ============================================
// PRODUCTION REQUEST ROUTES
// ============================================

/**
 * @route   POST /api/production-lines/:id/requests
 * @desc    Create material request for production
 * @access  Private
 * @body    {
 *   businessId: UUID,
 *   resourceUsedId: UUID,
 *   itemCategoryId: UUID (optional),
 *   dayNumber: number,
 *   requestedQuantity: number,
 *   materialDescription: string (optional)
 * }
 */
router.post(
    '/production-lines/:id/requests',
    authenticateUser,
    productionController.createRequest
);

/**
 * @route   GET /api/production-lines/:id/requests
 * @desc    Get all requests for a production line
 * @access  Private
 * @query   businessId (required), status, resourceUsedId
 */
router.get(
    '/production-lines/:id/requests',
    authenticateUser,
    productionController.getRequests
);

/**
 * @route   PUT /api/production-requests/:id/fulfill
 * @desc    Fulfill production request and deduct from inventory
 * @access  Private
 * @body    { businessId: UUID }
 */
router.put(
    '/production-requests/:id/fulfill',
    authenticateUser,
    productionController.fulfillRequest
);

/**
 * @route   PUT /api/production-requests/:id/cancel
 * @desc    Cancel production request
 * @access  Private
 * @body    { businessId: UUID }
 */
router.put(
    '/production-requests/:id/cancel',
    authenticateUser,
    productionController.cancelRequest
);

/**
 * @route   DELETE /api/production-requests/:id
 * @desc    Delete production request (only if PENDING)
 * @access  Private
 * @query   businessId (required)
 */
router.delete(
    '/production-requests/:id',
    authenticateUser,
    productionController.deleteRequest
);

// ============================================
// ANALYTICS ROUTES
// ============================================

/**
 * @route   GET /api/production/analytics/summary
 * @desc    Get production summary statistics
 * @access  Private
 * @query   businessId (required), startDate (optional), endDate (optional)
 */
router.get(
    '/production/analytics/summary',
    authenticateUser,
    productionController.getProductionSummary
);

/**
 * @route   GET /api/production/analytics/efficiency
 * @desc    Get production efficiency metrics
 * @access  Private
 * @query   businessId (required)
 */
router.get(
    '/production/analytics/efficiency',
    authenticateUser,
    productionController.getProductionEfficiency
);

/**
 * @route   GET /api/production/:id/variance
 * @desc    Get resource variance report for a production line
 * @access  Private
 * @query   businessId (required)
 */
router.get(
    '/production/:id/variance',
    authenticateUser,
    productionController.getResourceVariance
);

module.exports = router;