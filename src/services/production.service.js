// src/services/production.service.js

import { supabase } from "../config/supabase";

class ProductionService {
    // ============================================
    // PRODUCTION LINE SERVICES
    // ============================================

    /**
     * Create new production line with resources
     */
    async createProductionLine(data, userId) {
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
                resources // Array of resources
            } = data;

            // Verify business ownership
            const { data: business, error: businessError } = await supabase
                .from('businesses')
                .select('id')
                .eq('id', businessId)
                .eq('owner_id', userId)
                .single();

            if (businessError || !business) {
                throw new Error('Business not found or access denied');
            }

            // Verify product exists and belongs to business
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('id, name')
                .eq('id', itemId)
                .eq('business_id', businessId)
                .single();

            if (productError || !product) {
                throw new Error('Product not found or does not belong to this business');
            }

            // Prepare resources for stored procedure
            const resourcesJson = JSON.stringify(resources.map(r => ({
                resource_item_id: r.resourceItemId,
                resource_category_id: r.resourceCategoryId || null,
                resource_name: r.resourceName,
                actual_needed_quantity: r.actualNeededQuantity,
                unit_of_measure: r.unitOfMeasure,
                notes: r.notes || null
            })));

            // Call stored procedure
            const { data: result, error } = await supabase.rpc(
                'create_production_line_with_resources',
                {
                    p_item_id: itemId,
                    p_item_category_id: itemCategoryId || null,
                    p_business_id: businessId,
                    p_actual_items_number: actualItemsNumber,
                    p_description: description || null,
                    p_name: name,
                    p_manager: manager,
                    p_item_fpo: itemFpo || null,
                    p_resources: resourcesJson
                }
            );

            if (error) throw error;

            // Fetch the created production line with details
            const productionLine = await this.getProductionLineById(
                result[0].production_line_id,
                businessId
            );

            return productionLine;
        } catch (error) {
            console.error('Create production line error:', error);
            throw error;
        }
    }

    /**
     * Get production line by ID
     */
    async getProductionLineById(productionLineId, businessId) {
        try {
            // Get production line
            const { data: productionLine, error: plError } = await supabase
                .from('production_lines')
                .select(`
          *,
          product:item_id (id, name, quantity),
          category:item_category_id (id, name),
          business:business_id (id, name)
        `)
                .eq('id', productionLineId)
                .eq('business_id', businessId)
                .single();

            if (plError) throw plError;
            if (!productionLine) throw new Error('Production line not found');

            // Get resources
            const { data: resources, error: resourcesError } = await supabase
                .from('production_resources_used')
                .select(`
          *,
          resource:resource_item_id (id, name, quantity)
        `)
                .eq('production_line_id', productionLineId)
                .order('created_at', { ascending: true });

            if (resourcesError) throw resourcesError;

            // Get request lines
            const { data: requests, error: requestsError } = await supabase
                .from('production_request_lines')
                .select(`
          *,
          material:item_id (id, name),
          user:user_id (id, name)
        `)
                .eq('production_line_id', productionLineId)
                .order('day_number', { ascending: true });

            if (requestsError) throw requestsError;

            // Calculate summary
            const totalRequests = requests?.length || 0;
            const fulfilledRequests = requests?.filter(r => r.status === 'FULFILLED').length || 0;
            const pendingRequests = requests?.filter(r => r.status === 'PENDING').length || 0;

            return {
                ...productionLine,
                resources: resources || [],
                requests: requests || [],
                summary: {
                    totalRequests,
                    fulfilledRequests,
                    pendingRequests,
                    totalResources: resources?.length || 0
                }
            };
        } catch (error) {
            console.error('Get production line error:', error);
            throw error;
        }
    }

    /**
     * Get all production lines for a business
     */
    async getAllProductionLines(businessId, filters = {}) {
        try {
            const {
                status,
                page = 1,
                limit = 10,
                sortBy = 'created_at',
                sortOrder = 'desc'
            } = filters;

            let query = supabase
                .from('production_lines')
                .select(`
          *,
          product:item_id (id, name),
          category:item_category_id (id, name),
          business:business_id (id, name)
        `, { count: 'exact' })
                .eq('business_id', businessId);

            // Apply filters
            if (status) {
                query = query.eq('status', status);
            }

            // Apply sorting
            query = query.order(sortBy, { ascending: sortOrder === 'asc' });

            // Apply pagination
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;

            return {
                data: data || [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('Get production lines error:', error);
            throw error;
        }
    }

    /**
     * Update production line
     */
    async updateProductionLine(productionLineId, businessId, updates) {
        try {
            // Verify ownership
            const { data: existing, error: checkError } = await supabase
                .from('production_lines')
                .select('id, status')
                .eq('id', productionLineId)
                .eq('business_id', businessId)
                .single();

            if (checkError || !existing) {
                throw new Error('Production line not found or access denied');
            }

            // Prevent updates to completed production
            if (existing.status === 'COMPLETED' && updates.status !== 'COMPLETED') {
                throw new Error('Cannot modify completed production line');
            }

            const { data, error } = await supabase
                .from('production_lines')
                .update(updates)
                .eq('id', productionLineId)
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Update production line error:', error);
            throw error;
        }
    }

    /**
     * Start production (change status to IN_PROGRESS)
     */
    async startProductionLine(productionLineId, businessId) {
        try {
            const { data, error } = await supabase
                .from('production_lines')
                .update({ status: 'IN_PROGRESS' })
                .eq('id', productionLineId)
                .eq('business_id', businessId)
                .eq('status', 'PENDING')
                .select()
                .single();

            if (error) throw error;
            if (!data) throw new Error('Production line not found or already started');

            return data;
        } catch (error) {
            console.error('Start production error:', error);
            throw error;
        }
    }

    /**
     * Complete production line
     */
    async completeProductionLine(productionLineId, businessId, finalItemsProduced, userId) {
        try {
            // Verify ownership
            const { data: production, error: checkError } = await supabase
                .from('production_lines')
                .select('id, status')
                .eq('id', productionLineId)
                .eq('business_id', businessId)
                .single();

            if (checkError || !production) {
                throw new Error('Production line not found or access denied');
            }

            if (production.status !== 'IN_PROGRESS') {
                throw new Error('Production line must be in progress to complete');
            }

            // Call stored procedure
            const { data: result, error } = await supabase.rpc(
                'complete_production_line',
                {
                    p_production_line_id: productionLineId,
                    p_final_items_produced: finalItemsProduced,
                    p_user_id: userId
                }
            );

            if (error) throw error;

            // Get updated production line
            const updatedProduction = await this.getProductionLineById(
                productionLineId,
                businessId
            );

            return {
                ...result[0],
                production: updatedProduction
            };
        } catch (error) {
            console.error('Complete production error:', error);
            throw error;
        }
    }

    /**
     * Delete production line (only if PENDING)
     */
    async deleteProductionLine(productionLineId, businessId) {
        try {
            const { data, error } = await supabase
                .from('production_lines')
                .delete()
                .eq('id', productionLineId)
                .eq('business_id', businessId)
                .eq('status', 'PENDING')
                .select();

            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error('Production line not found or cannot be deleted');
            }

            return { success: true, message: 'Production line deleted successfully' };
        } catch (error) {
            console.error('Delete production line error:', error);
            throw error;
        }
    }

    // ============================================
    // PRODUCTION RESOURCES SERVICES
    // ============================================

    /**
     * Add resource to production line
     */
    async addResourceToProduction(productionLineId, businessId, resourceData) {
        try {
            // Verify production line exists and belongs to business
            const { data: production, error: plError } = await supabase
                .from('production_lines')
                .select('id, business_id, status')
                .eq('id', productionLineId)
                .eq('business_id', businessId)
                .single();

            if (plError || !production) {
                throw new Error('Production line not found or access denied');
            }

            if (production.status === 'COMPLETED') {
                throw new Error('Cannot add resources to completed production');
            }

            const { data, error } = await supabase
                .from('production_resources_used')
                .insert({
                    production_line_id: productionLineId,
                    resource_item_id: resourceData.resourceItemId,
                    resource_category_id: resourceData.resourceCategoryId || null,
                    resource_name: resourceData.resourceName,
                    actual_needed_quantity: resourceData.actualNeededQuantity,
                    unit_of_measure: resourceData.unitOfMeasure,
                    notes: resourceData.notes || null
                })
                .select(`
          *,
          resource:resource_item_id (id, name, quantity)
        `)
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Add resource error:', error);
            throw error;
        }
    }

    /**
     * Get resources by production line
     */
    async getResourcesByProduction(productionLineId, businessId) {
        try {
            // Verify ownership
            const { data: production, error: plError } = await supabase
                .from('production_lines')
                .select('id')
                .eq('id', productionLineId)
                .eq('business_id', businessId)
                .single();

            if (plError || !production) {
                throw new Error('Production line not found or access denied');
            }

            const { data, error } = await supabase
                .from('production_resources_used')
                .select(`
          *,
          resource:resource_item_id (id, name, quantity, price)
        `)
                .eq('production_line_id', productionLineId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Get resources error:', error);
            throw error;
        }
    }

    /**
     * Update resource
     */
    async updateResource(resourceId, businessId, updates) {
        try {
            // Verify ownership through production line
            const { data: resource, error: checkError } = await supabase
                .from('production_resources_used')
                .select(`
          id,
          production_line:production_line_id (business_id, status)
        `)
                .eq('id', resourceId)
                .single();

            if (checkError || !resource) {
                throw new Error('Resource not found');
            }

            if (resource.production_line.business_id !== businessId) {
                throw new Error('Access denied');
            }

            if (resource.production_line.status === 'COMPLETED') {
                throw new Error('Cannot modify resources of completed production');
            }

            const { data, error } = await supabase
                .from('production_resources_used')
                .update(updates)
                .eq('id', resourceId)
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Update resource error:', error);
            throw error;
        }
    }

    /**
     * Delete resource (only if no requests exist)
     */
    async deleteResource(resourceId, businessId) {
        try {
            // Check for existing requests
            const { data: requests, error: requestError } = await supabase
                .from('production_request_lines')
                .select('id')
                .eq('resource_used_id', resourceId)
                .limit(1);

            if (requestError) throw requestError;

            if (requests && requests.length > 0) {
                throw new Error('Cannot delete resource with existing requests');
            }

            // Verify ownership
            const { data: resource, error: checkError } = await supabase
                .from('production_resources_used')
                .select(`
          id,
          production_line:production_line_id (business_id)
        `)
                .eq('id', resourceId)
                .single();

            if (checkError || !resource) {
                throw new Error('Resource not found');
            }

            if (resource.production_line.business_id !== businessId) {
                throw new Error('Access denied');
            }

            const { error } = await supabase
                .from('production_resources_used')
                .delete()
                .eq('id', resourceId);

            if (error) throw error;

            return { success: true, message: 'Resource deleted successfully' };
        } catch (error) {
            console.error('Delete resource error:', error);
            throw error;
        }
    }

    // ============================================
    // PRODUCTION REQUEST SERVICES
    // ============================================

    /**
     * Create production request
     */
    async createProductionRequest(productionLineId, businessId, requestData, userId) {
        try {
            // Verify production line
            const { data: production, error: plError } = await supabase
                .from('production_lines')
                .select('id, business_id, status')
                .eq('id', productionLineId)
                .eq('business_id', businessId)
                .single();

            if (plError || !production) {
                throw new Error('Production line not found or access denied');
            }

            if (production.status === 'COMPLETED') {
                throw new Error('Cannot create requests for completed production');
            }

            // Verify resource exists
            const { data: resource, error: resourceError } = await supabase
                .from('production_resources_used')
                .select('id, resource_item_id, unit_of_measure')
                .eq('id', requestData.resourceUsedId)
                .eq('production_line_id', productionLineId)
                .single();

            if (resourceError || !resource) {
                throw new Error('Resource not found in this production line');
            }

            const { data, error } = await supabase
                .from('production_request_lines')
                .insert({
                    production_line_id: productionLineId,
                    resource_used_id: requestData.resourceUsedId,
                    item_id: resource.resource_item_id,
                    item_category_id: requestData.itemCategoryId || null,
                    user_id: userId,
                    day_number: requestData.dayNumber,
                    requested_quantity: requestData.requestedQuantity,
                    unit_of_measure: resource.unit_of_measure,
                    material_description: requestData.materialDescription || null,
                    status: 'PENDING'
                })
                .select(`
          *,
          material:item_id (id, name, quantity),
          resource:resource_used_id (id, resource_name)
        `)
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Create production request error:', error);
            throw error;
        }
    }

    /**
     * Get requests by production line
     */
    async getRequestsByProduction(productionLineId, businessId, filters = {}) {
        try {
            // Verify ownership
            const { data: production, error: plError } = await supabase
                .from('production_lines')
                .select('id')
                .eq('id', productionLineId)
                .eq('business_id', businessId)
                .single();

            if (plError || !production) {
                throw new Error('Production line not found or access denied');
            }

            let query = supabase
                .from('production_request_lines')
                .select(`
          *,
          material:item_id (id, name, quantity),
          resource:resource_used_id (id, resource_name),
          user:user_id (id, name)
        `)
                .eq('production_line_id', productionLineId);

            // Apply filters
            if (filters.status) {
                query = query.eq('status', filters.status);
            }

            if (filters.resourceUsedId) {
                query = query.eq('resource_used_id', filters.resourceUsedId);
            }

            // Apply sorting
            query = query.order('day_number', { ascending: true });

            const { data, error } = await query;

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Get requests error:', error);
            throw error;
        }
    }

    /**
     * Fulfill production request
     */
    async fulfillProductionRequest(requestId, businessId, userId) {
        try {
            // Verify ownership
            const { data: request, error: checkError } = await supabase
                .from('production_request_lines')
                .select(`
          id,
          status,
          production_line:production_line_id (business_id)
        `)
                .eq('id', requestId)
                .single();

            if (checkError || !request) {
                throw new Error('Request not found');
            }

            if (request.production_line.business_id !== businessId) {
                throw new Error('Access denied');
            }

            if (request.status !== 'PENDING') {
                throw new Error('Request is not pending');
            }

            // Call stored procedure
            const { data: result, error } = await supabase.rpc(
                'fulfill_production_request',
                {
                    p_request_id: requestId,
                    p_user_id: userId
                }
            );

            if (error) throw error;

            return result[0];
        } catch (error) {
            console.error('Fulfill request error:', error);
            throw error;
        }
    }

    /**
     * Cancel production request
     */
    async cancelProductionRequest(requestId, businessId) {
        try {
            // Verify ownership
            const { data: request, error: checkError } = await supabase
                .from('production_request_lines')
                .select(`
          id,
          status,
          production_line:production_line_id (business_id)
        `)
                .eq('id', requestId)
                .single();

            if (checkError || !request) {
                throw new Error('Request not found');
            }

            if (request.production_line.business_id !== businessId) {
                throw new Error('Access denied');
            }

            if (request.status !== 'PENDING') {
                throw new Error('Only pending requests can be cancelled');
            }

            const { data, error } = await supabase
                .from('production_request_lines')
                .update({ status: 'CANCELLED' })
                .eq('id', requestId)
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Cancel request error:', error);
            throw error;
        }
    }

    /**
     * Delete production request (only if PENDING)
     */
    async deleteProductionRequest(requestId, businessId) {
        try {
            // Verify ownership
            const { data: request, error: checkError } = await supabase
                .from('production_request_lines')
                .select(`
          id,
          status,
          production_line:production_line_id (business_id)
        `)
                .eq('id', requestId)
                .single();

            if (checkError || !request) {
                throw new Error('Request not found');
            }

            if (request.production_line.business_id !== businessId) {
                throw new Error('Access denied');
            }

            if (request.status !== 'PENDING') {
                throw new Error('Only pending requests can be deleted');
            }

            const { error } = await supabase
                .from('production_request_lines')
                .delete()
                .eq('id', requestId);

            if (error) throw error;

            return { success: true, message: 'Request deleted successfully' };
        } catch (error) {
            console.error('Delete request error:', error);
            throw error;
        }
    }

    // ============================================
    // ANALYTICS SERVICES
    // ============================================

    /**
     * Get production summary
     */
    async getProductionSummary(businessId, filters = {}) {
        try {
            let query = supabase
                .from('production_lines')
                .select('*', { count: 'exact' })
                .eq('business_id', businessId);

            // Apply date filters
            if (filters.startDate && filters.endDate) {
                query = query
                    .gte('created_at', filters.startDate)
                    .lte('created_at', filters.endDate);
            }

            const { data, error, count } = await query;

            if (error) throw error;

            // Calculate statistics
            const summary = {
                totalProductions: count,
                completed: data.filter(p => p.status === 'COMPLETED').length,
                inProgress: data.filter(p => p.status === 'IN_PROGRESS').length,
                pending: data.filter(p => p.status === 'PENDING').length,
                cancelled: data.filter(p => p.status === 'CANCELLED').length,
                totalItemsProduced: data
                    .filter(p => p.final_items_produced)
                    .reduce((sum, p) => sum + p.final_items_produced, 0),
                totalItemsPlanned: data.reduce((sum, p) => sum + p.actual_items_number, 0),
                averageVariance: 0
            };

            // Calculate average variance
            const completedProductions = data.filter(
                p => p.status === 'COMPLETED' && p.final_items_produced
            );

            if (completedProductions.length > 0) {
                const totalVariance = completedProductions.reduce(
                    (sum, p) => sum + (p.final_items_produced - p.actual_items_number),
                    0
                );
                summary.averageVariance = totalVariance / completedProductions.length;
            }

            return summary;
        } catch (error) {
            console.error('Get production summary error:', error);
            throw error;
        }
    }

    /**
     * Get production efficiency metrics
     */
    async getProductionEfficiency(businessId) {
        try {
            const { data, error } = await supabase
                .from('production_lines')
                .select(`
          id,
          name,
          manager,
          actual_items_number,
          final_items_produced,
          status,
          created_at,
          completed_date
        `)
                .eq('business_id', businessId)
                .eq('status', 'COMPLETED')
                .not('final_items_produced', 'is', null)
                .order('completed_date', { ascending: false });

            if (error) throw error;

            // Calculate efficiency metrics
            const metrics = data.map(production => {
                const efficiency = (production.final_items_produced / production.actual_items_number) * 100;
                const variance = production.final_items_produced - production.actual_items_number;
                const variancePercentage = (variance / production.actual_items_number) * 100;

                // Calculate production duration
                let duration = null;
                if (production.completed_date && production.created_at) {
                    const start = new Date(production.created_at);
                    const end = new Date(production.completed_date);
                    duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)); // days
                }

                return {
                    ...production,
                    efficiency: parseFloat(efficiency.toFixed(2)),
                    variance,
                    variancePercentage: parseFloat(variancePercentage.toFixed(2)),
                    duration
                };
            });

            return metrics;
        } catch (error) {
            console.error('Get production efficiency error:', error);
            throw error;
        }
    }

    /**
     * Get resource variance report
     */
    async getResourceVarianceReport(productionLineId, businessId) {
        try {
            // Verify ownership
            const { data: production, error: plError } = await supabase
                .from('production_lines')
                .select('id, name, status')
                .eq('id', productionLineId)
                .eq('business_id', businessId)
                .single();

            if (plError || !production) {
                throw new Error('Production line not found or access denied');
            }

            // Call stored procedure
            const { data, error } = await supabase.rpc(
                'get_production_variance_report',
                { p_production_line_id: productionLineId }
            );

            if (error) throw error;

            return {
                productionLine: production,
                variances: data || []
            };
        } catch (error) {
            console.error('Get variance report error:', error);
            throw error;
        }
    }
}

module.exports = new ProductionService();