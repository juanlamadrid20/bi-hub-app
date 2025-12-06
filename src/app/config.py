from pydantic_settings import BaseSettings
from utils.logging import logger
from dotenv import load_dotenv
from typing import Optional, List, Dict

import os
load_dotenv()


class Settings(BaseSettings):
    enable_header_auth: bool = False
    enable_password_auth: bool = True

    # Lakebase
    pg_database_instance: Optional[str] = None
    pg_host: Optional[str] = None
    pg_port: int = 5432
    pg_user: Optional[str] = None
    pg_database: Optional[str] = None
    pg_sslmode: Optional[str] = "require"

    @property
    def pg_connection_string(self) -> str:
        return f"postgresql+psycopg://{self.pg_user}:@{self.pg_host}:{self.pg_port}/{self.pg_database}?sslmode={self.pg_sslmode}"

    @property
    def log_database_instance(self) -> str:
        logger.info(f"Database Instance: {self.pg_database_instance}")
        return self.pg_database_instance 

    # Workspace
    databricks_host: Optional[str] = None

    # Serving Endopints
    agent_endpoint: Optional[str] = None
    @property
    def agent_base_url(self) -> str:
        if self.databricks_host.startswith("https://"):
            return f"{self.databricks_host}/serving-endpoints"
        else:
            return f"https://{self.databricks_host}/serving-endpoints"
        return f"{self.databricks_host}/serving-endpoints"

    # Chat 
    history_max_turns: int = 10
    history_max_chars: int = 120000

    chat_starter_messages: List[Dict[str, str]] = [
        # --- Customer Behavior (Single-Domain) ---
        {"label": "Customer Behavior: VIP Analysis", "message": "How many VIP customers do we have and what is their average lifetime value compared to other segments?"},
        {"label": "Customer Behavior: Cart Abandonment", "message": "What is our cart abandonment rate and how much potential revenue are we leaving on the table?"},
        # {"label": "Customer Behavior: Churn Risk", "message": "Which customers are at risk of churning, and what can we do to retain them?"},
        # {"label": "Customer Behavior: Funnel Analysis", "message": "Where are customers dropping off in our purchase funnel?"},

        # --- Inventory Operations (Single-Domain) ---
        {"label": "Inventory Operations: Health Overview", "message": "What is our current inventory health status across all locations, and how much revenue are we losing to stockouts?"},
        {"label": "Inventory Operations: Reorder Priority", "message": "What products need immediate reordering across our flagship stores? Prioritize by lost sales impact."},
        # {"label": "Inventory Operations: Regional Investment", "message": "Compare inventory value and lost sales by region. Where should we prioritize inventory investment?"},

        # --- Voice of Customer (Single-Domain) ---
        # {"label": "Voice of Customer: Sentiment Themes", "message": "What are customers saying about our products? Show me the key themes from recent reviews."},
        {"label": "Voice of Customer: Return Patterns", "message": "What patterns do we see in return feedback? Which issues should we escalate to product teams?"},
        {"label": "Voice of Customer: Brand Love", "message": "What do customers love most about our brand? What themes emerge from 5-star reviews?"},
        # {"label": "Voice of Customer: Quality Alerts", "message": "Are there any emerging quality issues in recent customer feedback we should address?"},

        # --- Cross-Domain (Multi-Agent Coordination) ---
        # {"label": "Cross-Domain: VIP Stockout Impact", "message": "Are we losing VIP customers because products they want are out of stock? Show me the intersection of high-value customer demand and inventory gaps."},
        {"label": "Cross-Domain: Stockout Segments", "message": "Which of our top-selling product categories have stockout risk, and which customer segments are most affected?"},
        # {"label": "Cross-Domain: Affinity & Availability", "message": "For products with high customer affinity scores, what is the current inventory availability? Are we missing personalization opportunities due to stockouts?"},
        {"label": "Cross-Domain: Channel Migration", "message": "How do our customers migrate between channels, and does our inventory allocation match their channel preferences?"},
        {"label": "Cross-Domain: Seasonal Trends", "message": "What product categories are trending with our Loyal customers, and do we have adequate inventory coverage for the upcoming season?"},
        # {"label": "Strategic: Quarterly Actions", "message": "Give me a strategic summary: What are the top 3 actions we should take this quarter to maximize revenue by better aligning customer demand with inventory?"},

        # --- Triple-Agent (Reviews + Behavior + Inventory) ---
        # {"label": "Triple-Agent: Stockout Sentiment", "message": "For products with frequent stockouts, what are customers saying in their reviews? Are we losing brand goodwill due to availability issues?"},
        # {"label": "Triple-Agent: VIP Complaints", "message": "What do our VIP customers complain about most? Are these issues affecting their retention?"},
        {"label": "Triple-Agent: Quality & Retention", "message": "Combine customer sentiment, purchase behavior, and inventory data: What are the top 3 product quality issues affecting VIP customer retention, and do we have inventory coverage for better alternatives?"},
    ]

    # Local Only
    pat: Optional[str] = None

    @property
    def is_valid(self) -> bool:
        if self.enable_header_auth and self.enable_password_auth:
            logger.error(
                "Both header and password auth cannot be enabled simultaneously")
            return False
        if not self.enable_header_auth and not self.enable_password_auth:
            logger.error("At least one auth method must be enabled")
            return False
        return True

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.is_valid:
            raise ValueError(
                "Invalid auth configuration: Either enable_header_auth or enable_password_auth must be enabled, but not both"
            )


# Create settings instance with environment variables
env_vars = {
    'enable_header_auth': os.getenv("ENABLE_HEADER_AUTH"),
    'enable_password_auth': os.getenv("ENABLE_PASSWORD_AUTH"),
    'pg_database_instance': os.getenv("DATABASE_INSTANCE"),
    'pg_host': os.getenv("PGHOST"),
    'pg_port': int(os.getenv("PGPORT", 5432)),
    'pg_user': os.getenv("PGUSER"),
    'pg_database': os.getenv("PGDATABASE"),
    'pg_sslmode': os.getenv("PGSSLMODE", "require"),
    'databricks_host': os.getenv("DATABRICKS_HOST"),
    'agent_endpoint': os.getenv("SERVING_ENDPOINT"),
    # Local Only
    'pat': os.getenv("DATABRICKS_TOKEN"),
}

print(f"Environment Variables: {env_vars}")

# Filter out None values to use defaults
filtered_vars = {k: v for k, v in env_vars.items() if v is not None}

settings = Settings(
    **filtered_vars
)

logger.info(f"Settings: {settings}")