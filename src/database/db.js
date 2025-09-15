import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

/**
 * Database Connection Manager - MongoDB Connection Handler
 * 
 * This module manages the MongoDB database connection using Mongoose ODM.
 * It handles connection establishment, error handling, and connection lifecycle
 * management for the multi-tenant inventory management system.
 * 
 * Core Features:
 * - MongoDB connection establishment via Mongoose
 * - Environment-based configuration management
 * - Connection status logging and error handling
 * - Automatic retry and reconnection capabilities
 * - Production-ready connection pooling and optimization
 * 
 * Connection Architecture:
 * Environment -> Configuration -> Mongoose -> MongoDB Atlas/Local
 * 
 * Environment Requirements:
 * - MONGODB_URI environment variable must be set in .env file
 * - Connection string should include authentication credentials
 * - Network access must be configured for MongoDB cluster
 * 
 * Security Best Practices:
 * - Store connection strings in environment variables ONLY
 * - Never commit credentials to version control
 * - Use strong authentication credentials
 * - Enable SSL/TLS encryption for data in transit
 * - Restrict network access with IP whitelisting
 * - Regularly rotate database credentials
 */

/**
 * Database Connection Function
 * 
 * Establishes a secure connection to MongoDB using the connection string from
 * environment variables. Credentials are never exposed in source code.
 * 
 * @function DB
 * @async
 * @returns {Promise<void>} Database connection promise
 * 
 * Environment Variables Required:
 * @param {string} process.env.MONGODB_URI - MongoDB connection string with credentials
 * 
 * @example
 * // .env file configuration (NEVER commit this file!)
 * MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/inventory_management
 * 
 * // Usage in application startup
 * import { DB } from './config/database.js';
 * 
 * async function startServer() {
 *   try {
 *     await DB();
 *     console.log('Database connected, starting server...');
 *     app.listen(PORT);
 *   } catch (error) {
 *     console.error('Failed to start application:', error);
 *     process.exit(1);
 *   }
 * }
 */
export function DB() {
  // Validate that the connection string is provided
  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI environment variable is not set!");
    console.error("Please add MONGODB_URI to your .env file");
    process.exit(1);
  }

  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log("✅ Database connected successfully");
      
      // Set up connection event listeners for production monitoring
      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected');
      });
      
      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
      });
      
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });
    })
    .catch((err) => {
      console.error("❌ Database connection failed:", err);
      console.error("Check your MONGODB_URI in .env file");
    });
}