#!/usr/bin/env python3
"""
Lakebase PostgreSQL Setup Script for Spirit Airlines BI Agent
This script creates the necessary tables and indexes in the Lakebase PostgreSQL database
"""

import os
import sys
import logging
import asyncio
import asyncpg
from typing import Dict, Any, List
from datetime import datetime

# Add the src directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from data.database_manager import chat_db
from data.connection_factory import ConnectionFactory

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class LakebaseSetup:
    """Handles Lakebase PostgreSQL database setup and initialization"""
    
    def __init__(self):
        self.db_manager = None
        self.connection = None
    
    async def initialize_connection(self):
        """Initialize database connection"""
        try:
            # Create configuration from environment
            config = ConnectionFactory.create_config_from_env()
            
            # Create database manager
            self.db_manager = await ConnectionFactory.create_database_manager(config)
            await self.db_manager.connect()
            
            logger.info("✅ Database connection initialized")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize database connection: {e}")
            return False
    
    async def create_tables(self):
        """Create all necessary tables"""
        try:
            # Create chat_sessions table
            await self._create_chat_sessions_table()
            
            # Create user_analytics table
            await self._create_user_analytics_table()
            
            # Create indexes
            await self._create_indexes()
            
            logger.info("✅ All tables created successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to create tables: {e}")
            return False
    
    async def _create_chat_sessions_table(self):
        """Create the chat_sessions table"""
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS chat_sessions (
            session_id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            messages JSONB,
            user_info JSONB,
            metadata JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        try:
            await self.db_manager.execute_query(create_table_sql)
            logger.info("✅ Created chat_sessions table")
        except Exception as e:
            logger.error(f"❌ Failed to create chat_sessions table: {e}")
            raise
    
    async def _create_user_analytics_table(self):
        """Create the user_analytics table"""
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS user_analytics (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            session_id VARCHAR(255),
            query_type VARCHAR(100),
            response_time INTEGER,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        try:
            await self.db_manager.execute_query(create_table_sql)
            logger.info("✅ Created user_analytics table")
        except Exception as e:
            logger.error(f"❌ Failed to create user_analytics table: {e}")
            raise
    
    async def _create_indexes(self):
        """Create indexes for better performance"""
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_chat_sessions_start_time ON chat_sessions(start_time);",
            "CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON user_analytics(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_user_analytics_session_id ON user_analytics(session_id);",
            "CREATE INDEX IF NOT EXISTS idx_user_analytics_timestamp ON user_analytics(timestamp);",
            "CREATE INDEX IF NOT EXISTS idx_user_analytics_query_type ON user_analytics(query_type);"
        ]
        
        try:
            for index_sql in indexes:
                await self.db_manager.execute_query(index_sql)
            logger.info("✅ Created all indexes")
        except Exception as e:
            logger.error(f"❌ Failed to create indexes: {e}")
            raise
    
    async def create_triggers(self):
        """Create triggers for automatic timestamp updates"""
        try:
            # Create trigger function for updating updated_at timestamp
            trigger_function_sql = """
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
            """
            
            await self.db_manager.execute_query(trigger_function_sql)
            
            # Create trigger for chat_sessions table
            trigger_sql = """
            CREATE TRIGGER update_chat_sessions_updated_at 
            BEFORE UPDATE ON chat_sessions 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
            """
            
            await self.db_manager.execute_query(trigger_sql)
            
            logger.info("✅ Created triggers")
        except Exception as e:
            logger.error(f"❌ Failed to create triggers: {e}")
            raise
    
    async def insert_sample_data(self):
        """Insert sample data for testing"""
        try:
            # Insert sample chat session
            sample_session = {
                "session_id": "sample_session_001",
                "user_id": "demo_user",
                "start_time": datetime.now().isoformat(),
                "messages": [
                    {
                        "role": "user",
                        "content": "Hello, I'd like to know about Spirit Airlines revenue performance",
                        "timestamp": datetime.now().isoformat()
                    },
                    {
                        "role": "assistant",
                        "content": "I'd be happy to help you with Spirit Airlines revenue performance data. Let me analyze the latest metrics for you.",
                        "timestamp": datetime.now().isoformat()
                    }
                ],
                "user_info": {
                    "display_name": "Demo User",
                    "email": "demo@spirit-airlines.com"
                },
                "metadata": {
                    "app_version": "2.0.0",
                    "platform": "chainlit",
                    "databricks_connected": True
                }
            }
            
            await self.db_manager.save_chat_session(sample_session)
            
            # Insert sample analytics data
            sample_analytics = {
                "user_id": "demo_user",
                "session_id": "sample_session_001",
                "query_type": "revenue_analysis",
                "response_time": 1500,
                "timestamp": datetime.now().isoformat()
            }
            
            # Note: This would need to be implemented in the database manager
            # await self.db_manager.save_user_analytics(sample_analytics)
            
            logger.info("✅ Inserted sample data")
        except Exception as e:
            logger.error(f"❌ Failed to insert sample data: {e}")
            raise
    
    async def verify_setup(self):
        """Verify that the setup was successful"""
        try:
            # Check if tables exist
            tables_query = """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('chat_sessions', 'user_analytics');
            """
            
            result = await self.db_manager.execute_query(tables_query)
            tables = [row[0] for row in result] if result else []
            
            if len(tables) == 2:
                logger.info("✅ All tables exist")
            else:
                logger.warning(f"⚠️ Expected 2 tables, found {len(tables)}: {tables}")
            
            # Check if indexes exist
            indexes_query = """
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename IN ('chat_sessions', 'user_analytics')
            AND indexname LIKE 'idx_%';
            """
            
            result = await self.db_manager.execute_query(indexes_query)
            indexes = [row[0] for row in result] if result else []
            
            logger.info(f"✅ Found {len(indexes)} indexes: {indexes}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to verify setup: {e}")
            return False
    
    async def cleanup(self):
        """Clean up database connection"""
        try:
            if self.db_manager:
                await self.db_manager.disconnect()
            logger.info("✅ Database connection closed")
        except Exception as e:
            logger.error(f"❌ Error closing database connection: {e}")

async def main():
    """Main setup function"""
    setup = LakebaseSetup()
    
    try:
        logger.info("🚀 Starting Lakebase setup...")
        
        # Initialize connection
        if not await setup.initialize_connection():
            logger.error("❌ Failed to initialize database connection")
            return 1
        
        # Create tables
        if not await setup.create_tables():
            logger.error("❌ Failed to create tables")
            return 1
        
        # Create triggers
        await setup.create_triggers()
        
        # Insert sample data (optional)
        if os.getenv('INSERT_SAMPLE_DATA', 'false').lower() == 'true':
            await setup.insert_sample_data()
        
        # Verify setup
        if not await setup.verify_setup():
            logger.error("❌ Setup verification failed")
            return 1
        
        logger.info("🎉 Lakebase setup completed successfully!")
        return 0
        
    except Exception as e:
        logger.error(f"❌ Setup failed: {e}")
        return 1
        
    finally:
        await setup.cleanup()

if __name__ == "__main__":
    # Run the setup
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
