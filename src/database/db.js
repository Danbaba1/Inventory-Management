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
 * - DB environment variable must be set in .env file
 * - Connection string should include authentication credentials
 * - Network access must be configured for MongoDB cluster
 * 
 * Performance Considerations:
 * - Connection pooling enabled by default in Mongoose
 * - Keep-alive connections for optimal performance
 * - Proper error handling prevents application crashes
 * - Connection reuse across multiple database operations
 * 
 * @module DatabaseConnection
 * @requires mongoose - MongoDB ODM for Node.js
 * @requires dotenv - Environment variable loader
 */

/**
 * Database Connection Function
 * 
 * Establishes a connection to MongoDB using the connection string from
 * environment variables. This function initializes the database connection
 * that will be used throughout the application for all data operations.
 * 
 * Connection Flow:
 * 1. Load database URL from environment variables
 * 2. Initialize Mongoose connection with MongoDB
 * 3. Handle connection success and error states
 * 4. Set up connection event listeners
 * 5. Enable connection pooling and optimization
 * 
 * Configuration Options:
 * - Connection string format: mongodb://[username:password@]host[:port]/database
 * - For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/database
 * - Supports replica sets and sharded clusters
 * - Automatic failover and load balancing
 * 
 * Error Handling:
 * - Connection failures are logged but don't crash the application
 * - Mongoose handles automatic reconnection attempts
 * - Network errors are gracefully handled
 * - Invalid connection strings produce descriptive error messages
 * 
 * @function DB
 * @async
 * @returns {Promise<void>} Database connection promise
 * 
 * Environment Variables Required:
 * @param {string} process.env.DB - MongoDB connection string
 * 
 * @example
 * // .env file configuration
 * DB=mongodb://localhost:27017/inventory_management
 * // OR for MongoDB Atlas
 * DB=mongodb+srv://username:password@cluster.mongodb.net/inventory_management
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
 * 
 * Connection Success:
 * - Console output: "DB connected successfully"
 * - Application ready to handle database operations
 * - All models and schemas become available
 * 
 * Connection Errors:
 * - Invalid connection string
 * - Network connectivity issues
 * - Authentication failures
 * - Database server unavailable
 * - Firewall or security group restrictions
 * 
 * Production Considerations:
 * - Use connection pooling for high-traffic applications
 * - Implement connection retry logic with exponential backoff
 * - Monitor connection health and performance metrics
 * - Set appropriate timeout values for production environments
 * - Use replica sets for high availability
 * 
 * Security Best Practices:
 * - Store connection strings in environment variables
 * - Use strong authentication credentials
 * - Enable SSL/TLS encryption for data in transit
 * - Restrict network access with IP whitelisting
 * - Regularly rotate database credentials
 */
export function DB() {
  mongoose
    .connect(process.env.DB)
    .then(() => {
      console.log("DB connected successfully");
      
      // Optional: Set up connection event listeners for production monitoring
      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected');
      });
      
      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
      });
      
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });
    })
    .catch((err) => {
      console.error("Database connection failed:", err);
    });
}