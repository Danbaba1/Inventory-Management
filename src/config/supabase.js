/**
 * @fileoverview Supabase client configuration for server-side operations
 * 
 * This module initializes and exports a Supabase client configured for backend use
 * with service-level permissions. It uses environment variables for secure credential
 * management and includes proper error handling for missing configuration.
 * 
 * @author Daniel
 * @version 1.0.0
 * @since 2024
 */

// External dependencies
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

/**
 * Load environment variables from .env file into process.env
 * This must be called before accessing any environment variables
 */
dotenv.config();

/**
 * Supabase project URL from environment variables
 * Format: https://your-project-id.supabase.co
 * @type {string | undefined}
 */
const supabaseUrl = process.env.SUPABASE_URL;

/**
 * Supabase service role key from environment variables
 * This is a privileged key that bypasses Row Level Security (RLS)
 * Should only be used in secure server environments, never in client-side code
 * @type {string | undefined}
 */
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for backend

/**
 * Validate required environment variables
 * Exits the process if critical configuration is missing to prevent runtime errors
 */
if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase configuration missing. Check your environment variables.');
    console.error('Required variables: SUPABASE_URL, SUPABASE_SERVICE_KEY');
    process.exit(1);
}

/**
 * Supabase client instance configured for server-side operations
 * 
 * Configuration options:
 * - autoRefreshToken: false - Disables automatic token refresh (not needed for service key)
 * - persistSession: false - Disables session persistence (not applicable for service key)
 * 
 * The service key provides full database access and bypasses Row Level Security.
 * This client can perform any operation on your Supabase database.
 * 
 * @type {import('@supabase/supabase-js').SupabaseClient}
 * 
 * @example
 * // Query data
 * const { data, error } = await supabase
 *   .from('users')
 *   .select('*');
 * 
 * @example
 * // Insert data
 * const { data, error } = await supabase
 *   .from('users')
 *   .insert([{ name: 'John', email: 'john@example.com' }]);
 * 
 * @example
 * // Update data
 * const { data, error } = await supabase
 *   .from('users')
 *   .update({ name: 'Jane' })
 *   .eq('id', userId);
 * 
 * @example
 * // Delete data
 * const { data, error } = await supabase
 *   .from('users')
 *   .delete()
 *   .eq('id', userId);
 */
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        /**
         * Disable automatic token refresh
         * Service keys don't expire, so refresh is unnecessary
         */
        autoRefreshToken: false,

        /**
         * Disable session persistence
         * Service keys don't use sessions, so persistence is not applicable
         */
        persistSession: false
    }
});

/**
 * Environment Variables Required:
 * 
 * SUPABASE_URL - Your Supabase project URL
 * Example: https://abcdefghijklmnop.supabase.co
 * 
 * SUPABASE_SERVICE_KEY - Your Supabase service role key
 * This is found in your Supabase dashboard under Settings > API
 * Keep this secret and never expose it in client-side code
 * 
 * Security Notes:
 * - Service keys bypass Row Level Security (RLS)
 * - Only use service keys in secure server environments
 * - For client-side applications, use the anon key instead
 * - Store these keys securely and rotate them periodically
 */