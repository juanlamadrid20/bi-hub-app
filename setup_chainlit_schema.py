#!/usr/bin/env python3
"""
Script to set up the official Chainlit SQLAlchemy schema
Based on: https://docs.chainlit.io/data-layers/sqlalchemy
"""

import os
import sys
import asyncio
from dotenv import load_dotenv

from databricks.sdk import WorkspaceClient
from databricks.sdk.core import Config

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Load environment variables
load_dotenv()
load_dotenv('src/auth_config.env')

from data.connection_factory import ConnectionFactory
from data.postgresql_manager import PostgreSQLManager

async def setup_chainlit_schema():
    """Set up the official Chainlit SQLAlchemy schema"""
    try:
        # Create database config
        config = ConnectionFactory.create_config_from_env()
        print(f"🔧 Using database: {config.host}:{config.port}")
        
        # Create database manager
        db_manager = PostgreSQLManager(config)
        
        # Connect to database
        print("🔌 Connecting to database...")
        await db_manager.connect()
        
        # Drop existing tables
        print("🗑️ Dropping existing tables...")
        async with db_manager.pool.acquire() as conn:
            await conn.execute('DROP TABLE IF EXISTS feedbacks CASCADE;')
            await conn.execute('DROP TABLE IF EXISTS elements CASCADE;')
            await conn.execute('DROP TABLE IF EXISTS steps CASCADE;')
            await conn.execute('DROP TABLE IF EXISTS threads CASCADE;')
            await conn.execute('DROP TABLE IF EXISTS users CASCADE;')
            await conn.execute('DROP TABLE IF EXISTS chat_sessions CASCADE;')
        print("✅ Dropped existing tables")
        
        # Create official Chainlit schema
        print("🔨 Creating official Chainlit schema...")
        schema_sql = '''
        CREATE TABLE users (
            "id" UUID PRIMARY KEY,
            "identifier" TEXT NOT NULL UNIQUE,
            "metadata" JSONB NOT NULL,
            "createdAt" TEXT
        );

        CREATE TABLE IF NOT EXISTS threads (
            "id" UUID PRIMARY KEY,
            "createdAt" TEXT,
            "name" TEXT,
            "userId" UUID,
            "userIdentifier" TEXT,
            "tags" TEXT[],
            "metadata" JSONB,
            FOREIGN KEY ("userId") REFERENCES users("id") ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS steps (
            "id" UUID PRIMARY KEY,
            "name" TEXT NOT NULL,
            "type" TEXT NOT NULL,
            "threadId" UUID NOT NULL,
            "parentId" UUID,
            "streaming" BOOLEAN NOT NULL,
            "waitForAnswer" BOOLEAN,
            "isError" BOOLEAN,
            "metadata" JSONB,
            "tags" TEXT[],
            "input" TEXT,
            "output" TEXT,
            "createdAt" TEXT,
            "command" TEXT,
            "start" TEXT,
            "end" TEXT,
            "generation" JSONB,
            "showInput" TEXT,
            "language" TEXT,
            "indent" INT,
            "defaultOpen" BOOLEAN,
            FOREIGN KEY ("threadId") REFERENCES threads("id") ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS elements (
            "id" UUID PRIMARY KEY,
            "threadId" UUID,
            "type" TEXT,
            "url" TEXT,
            "chainlitKey" TEXT,
            "name" TEXT NOT NULL,
            "display" TEXT,
            "objectKey" TEXT,
            "size" TEXT,
            "page" INT,
            "language" TEXT,
            "forId" UUID,
            "mime" TEXT,
            "props" JSONB,
            FOREIGN KEY ("threadId") REFERENCES threads("id") ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS feedbacks (
            "id" UUID PRIMARY KEY,
            "forId" UUID NOT NULL,
            "threadId" UUID NOT NULL,
            "value" INT NOT NULL,
            "comment" TEXT,
            FOREIGN KEY ("threadId") REFERENCES threads("id") ON DELETE CASCADE
        );
        '''
        
        async with db_manager.pool.acquire() as conn:
            await conn.execute(schema_sql)
        print("✅ Created official Chainlit schema")
        
        # Close connection
        await db_manager.disconnect()
        print("✅ Schema setup complete!")
        
    except Exception as e:
        print(f"❌ Error setting up schema: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(setup_chainlit_schema())
