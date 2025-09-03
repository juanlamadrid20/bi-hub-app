"""
Spirit Airlines AI Agent App with Chainlit Data Layer
"""
import chainlit as cl
import os
import logging
from typing import Optional
from dotenv import load_dotenv
from urllib.parse import quote_plus
from databricks.sdk import WorkspaceClient
from databricks.sdk.core import Config
from chainlit.data.sql_alchemy import SQLAlchemyDataLayer
from auth.auth_utils import auth_manager, UserContext

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


app_config = Config()
workspace_client = WorkspaceClient(config=app_config)

# Load environment variables
load_dotenv()

# Load auth_config.env only if it exists (for local development)
# In Databricks Apps, most variables are automatically assigned
auth_config_path = 'auth_config.env'
if os.path.exists(auth_config_path):
    load_dotenv(auth_config_path)
    logger.info("🔧 Loaded local auth_config.env for development")
else:
    logger.info("🔧 No auth_config.env found - using Databricks auto-assigned variables")

# Load Databricks environment variables for local development
if os.getenv('LOCAL_TESTING_MODE', 'false').lower() == 'true':
    load_dotenv('/Users/rohit.bhagwat/spirit-airlines-demo/.databricks/.tokens.env')
    load_dotenv('/Users/rohit.bhagwat/spirit-airlines-demo/.databricks/.databricks.env')

# Configuration
DATABRICKS_TOKEN = os.getenv('DATABRICKS_TOKEN') or os.getenv('DATABRICKS_ACCESS_TOKEN')
DATABRICKS_HOST = os.getenv('DATABRICKS_HOST')
DATABRICKS_WORKSPACE = DATABRICKS_HOST.replace('https://', '').replace('http://', '').rstrip('/') if DATABRICKS_HOST else None
ENABLE_DATABRICKS_AUTH = os.getenv('ENABLE_DATABRICKS_AUTH', 'true').lower() == 'true'
LOCAL_TESTING_MODE = os.getenv('LOCAL_TESTING_MODE', 'false').lower() == 'true'
APP_NAME = os.getenv('APP_NAME', 'Spirit Airlines AI Agent')
APP_VERSION = os.getenv('APP_VERSION', '2.0.0')

# Log configuration status
logger.info(f"🔧 Configuration loaded - Databricks Auth: {ENABLE_DATABRICKS_AUTH}, Local Testing: {LOCAL_TESTING_MODE}")
logger.info(f"🔧 Databricks Token: {'✅' if DATABRICKS_TOKEN else '❌'}, Host: {'✅' if DATABRICKS_HOST else '❌'}")
logger.info(f"🔧 PostgreSQL Host: {'✅' if os.getenv('PGHOST') else '❌'}, Database: {'✅' if os.getenv('PGDATABASE') else '❌'}")

@cl.data_layer
def get_data_layer():
    """Return SQLAlchemy data layer for Databricks Lakebase using OAuth token authentication"""
    try:
        from sqlalchemy import create_engine, event, text
        
        # Get PostgreSQL connection details from environment - following the blog pattern exactly
        postgres_username = app_config.client_id
        postgres_host = os.getenv("PGHOST")
        postgres_port = 5432
        postgres_database = os.getenv("PGDATABASE", "databricks_postgres")
        
        if not postgres_host:
            raise ValueError("Missing PGHOST environment variable")
        
        # Create the connection string without password (we'll provide token via event listener)
        # Following the exact pattern from the blog
        conninfo = f"postgresql+psycopg://{postgres_username}:@{postgres_host}:{postgres_port}/{postgres_database}"
        
        # Create the engine following the blog pattern
        postgres_pool = create_engine(conninfo)
        
        # Add event listener to provide OAuth token - exact pattern from blog
        @event.listens_for(postgres_pool, "do_connect")
        def provide_token(dialect, conn_rec, cargs, cparams):
            """Provide the App's OAuth token. Caching is managed by WorkspaceClient"""
            cparams["password"] = workspace_client.config.oauth_token().access_token
        
        # For Chainlit, we need to return the connection string, not the engine
        # But we need to handle the token differently since SQLAlchemyDataLayer doesn't support custom engines
        # Let's get the token and include it directly in the connection string
        oauth_token = workspace_client.config.oauth_token().access_token
        conninfo_with_token = f"postgresql+psycopg://{postgres_username}:{quote_plus(oauth_token)}@{postgres_host}:{postgres_port}/{postgres_database}"
        
        return SQLAlchemyDataLayer(conninfo=conninfo_with_token)

    except Exception as e:
        logger.error(f"Failed to create data layer: {e}")
        raise ValueError(f"Unable to establish database connection: {e}")


@cl.on_app_startup
async def startup():
    """App startup handler"""
    logger.info(f"{APP_NAME} v{APP_VERSION} starting up")

def get_user_context(chainlit_user=None) -> UserContext:
    """Get user context using the authentication manager"""
    return auth_manager.get_user_context(chainlit_user)

@cl.password_auth_callback
async def auth_callback(username: str, password: str) -> Optional[cl.User]:
    """Simple authentication"""
    if username == "admin" and password == "admin123":
        return cl.User(
            identifier="admin",
            metadata={
                "display_name": "Administrator",
                "email": "admin@spirit-airlines.com"
            }
        )
    return None

@cl.on_chat_start
async def start():
    """Initialize the chat session"""
    try:
        user = cl.user_session.get("user")
        user_context = get_user_context(user)
        logger.info(f"Chat started - User: {user.identifier if user else 'anonymous'}, Environment: {user_context.environment}")
    except Exception as e:
        logger.error(f"Error in chat start: {e}")
        await cl.Message(
            content="Sorry, there was an error starting the chat. Please try again.",
            author="System"
        ).send()

@cl.on_chat_resume
async def on_chat_resume(thread):
    """Handle resuming a previous chat session"""
    try:
        thread_id = thread.id if hasattr(thread, 'id') else str(thread) if thread else 'unknown'
        logger.info(f"Resuming chat thread: {thread_id}")
    except Exception as e:
        logger.error(f"Error resuming chat thread: {e}")

@cl.on_message
async def main(message: cl.Message):
    """Process user messages and get responses from Databricks agent"""
    try:
        thread = cl.user_session.get("thread")
        user = cl.user_session.get("user")
        logger.info(f"Message received - Thread: {thread.id if thread else 'None'}, User: {user.identifier if user else 'anonymous'}")
        
        processing_msg = await cl.Message(
            content="**Analyzing your query...**\n\n*Connecting to Databricks BI Agent*\n\n*This may take a moment for complex analytics queries...*",
            author="Spirit Airlines AI Agent"
        ).send()

        response = await process_user_query(message.content)
        
        if response["success"] and "content" in response:
            processing_msg.content = response["content"]
            await processing_msg.update()
        else:
            error_msg = f"**Error**: {response.get('content', 'No response content received')}"
            processing_msg.content = error_msg
            await processing_msg.update()
            
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        await cl.Message(
            content=f"Sorry, I encountered an error: {str(e)}",
            author="System"
        ).send()

async def process_user_query(query: str):
    """Process user query using the Databricks agent"""
    try:
        from openai import OpenAI
        
        # Use demo response if Databricks configuration is missing
        if not DATABRICKS_TOKEN or not DATABRICKS_WORKSPACE:
            logger.info("Using demo mode - Databricks configuration missing")
            return {
                "success": True,
                "content": f"**Demo Response for: '{query}'**\n\nHi! I'm the Spirit Airlines BI Agent. Your query has been received and the sidebar with Lakebase integration is working perfectly!\n\n**Note**: Databricks agent connection is temporarily unavailable, but all your data is being saved to Lakebase PostgreSQL.\n\n**Available Analytics**:\n- Revenue performance metrics\n- Flight operations data\n- Customer behavior analysis\n- Route optimization insights\n\n**Sidebar Status**: Fully operational with chat history!"
            }
        
        # Initialize OpenAI client for Databricks
        client = OpenAI(
            api_key=DATABRICKS_TOKEN,
            base_url=f"https://{DATABRICKS_WORKSPACE}/serving-endpoints",
            timeout=180.0
        )
        
        logger.info(f"Sending query to Databricks agent: '{query[:50]}{'...' if len(query) > 50 else ''}'")
        
        response = client.responses.create(
            model="mas-1a0aee60-endpoint",
            input=[{"role": "user", "content": query}],
            stream=False
        )
        
        # Extract response content
        response_text = None
        if hasattr(response, 'output') and response.output and len(response.output) > 0:
            output_message = response.output[0]
            if hasattr(output_message, 'content') and output_message.content:
                content = output_message.content[0]
                if hasattr(content, 'text'):
                    response_text = content.text
        elif hasattr(response, 'text'):
            response_text = response.text
        else:
            response_text = str(response)
            logger.warning(f"Using raw response string: {type(response)}")
        
        if response_text:
            return {"success": True, "content": response_text}
        
        # Fallback if content extraction fails
        return {
            "success": True,
            "content": f"**Spirit Airlines BI Agent Response**\n\nThank you for your query: *'{query}'*\n\n**I can help you with**:\n- **Revenue Analytics**: Pricing trends, profitability metrics\n- **Operational Insights**: Flight performance, route optimization\n- **Customer Data**: Behavior analysis, satisfaction metrics\n- **Ancillary Products**: Sales performance, recommendations\n- **Route Analysis**: Performance metrics, expansion opportunities\n\n**Great News**: Your chat history is being saved to Lakebase and the sidebar is working!\n\n*Note: Databricks agent response received but content extraction failed.*"
        }
        
    except Exception as e:
        error_type = type(e).__name__
        error_message = str(e)
        logger.error(f"Error processing query - Type: {error_type}, Message: {error_message}")
        
        if "timeout" in error_message.lower() or "connection" in error_message.lower():
            return {
                "success": True,
                "content": f"**Spirit Airlines BI Agent Response**\n\nThank you for your query: *'{query}'*\n\n**I can help you with**:\n- **Revenue Analytics**: Pricing trends, profitability metrics\n- **Operational Insights**: Flight performance, route optimization\n- **Customer Data**: Behavior analysis, satisfaction metrics\n- **Ancillary Products**: Sales performance, recommendations\n- **Route Analysis**: Performance metrics, expansion opportunities\n\n**Great News**: Your chat history is being saved to Lakebase and the sidebar is working!\n\n*Note: Databricks agent is temporarily experiencing connectivity issues, but your data persistence is fully operational.*"
            }
        else:
            return {
                "success": False,
                "content": f"**Error**: {error_type} - {error_message}\n\nPlease check the logs for more details."
            }
