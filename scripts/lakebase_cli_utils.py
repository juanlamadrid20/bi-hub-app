#!/usr/bin/env python3
"""
Lakebase CLI Utilities - Manage Databricks Lakebase instances.

Commands:
    check   - Check if a Lakebase instance exists and is running
    token   - Get instance details and generate a database credential token
    list    - List all Lakebase instances

Usage:
    python scripts/lakebase_cli_utils.py check <instance_name>
    python scripts/lakebase_cli_utils.py token <instance_name> [database] [options]
    python scripts/lakebase_cli_utils.py list [options]

Examples:
    python scripts/lakebase_cli_utils.py check bi-agent-chat-session
    python scripts/lakebase_cli_utils.py token bi-agent-chat-session databricks_postgres
    python scripts/lakebase_cli_utils.py token bi-agent-chat-session --output json
    python scripts/lakebase_cli_utils.py token bi-agent-chat-session --output env > .env
    python scripts/lakebase_cli_utils.py list
"""

import argparse
import json
import sys
import uuid
from dataclasses import dataclass
from typing import Optional

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.database import DatabaseInstanceState


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class LakebaseInstanceInfo:
    """Basic information about a Lakebase instance."""
    name: str
    uid: str
    state: str
    capacity: Optional[str]
    node_count: Optional[int]
    read_write_dns: Optional[str]
    read_only_dns: Optional[str]
    enable_readable_secondaries: Optional[bool]
    retention_window_days: Optional[int]
    creation_time: Optional[str]

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "uid": self.uid,
            "state": self.state,
            "capacity": self.capacity,
            "node_count": self.node_count,
            "read_write_dns": self.read_write_dns,
            "read_only_dns": self.read_only_dns,
            "enable_readable_secondaries": self.enable_readable_secondaries,
            "retention_window_days": self.retention_window_days,
            "creation_time": self.creation_time,
        }


@dataclass
class LakebaseConnectionInfo:
    """Connection information for a Lakebase instance with credentials."""
    instance_name: str
    instance_id: str
    state: str
    host: str
    read_only_host: Optional[str]
    port: int
    user: str
    database: str
    token: str
    sslmode: str
    connection_string: str

    def to_dict(self) -> dict:
        return {
            "instance_name": self.instance_name,
            "instance_id": self.instance_id,
            "state": self.state,
            "host": self.host,
            "read_only_host": self.read_only_host,
            "port": self.port,
            "user": self.user,
            "database": self.database,
            "token": self.token,
            "sslmode": self.sslmode,
            "connection_string": self.connection_string,
        }

    def to_env(self) -> str:
        """Return environment variable format."""
        lines = [
            f"LAKEBASE_INSTANCE_NAME={self.instance_name}",
            f"LAKEBASE_HOST={self.host}",
            f"LAKEBASE_PORT={self.port}",
            f"LAKEBASE_USER={self.user}",
            f"LAKEBASE_DATABASE={self.database}",
            f"LAKEBASE_PASSWORD={self.token}",
            f"LAKEBASE_SSLMODE={self.sslmode}",
            f"DATABASE_URL={self.connection_string}",
        ]
        return "\n".join(lines)


# =============================================================================
# Core Functions
# =============================================================================

def get_workspace_client() -> WorkspaceClient:
    """Get a Databricks WorkspaceClient instance."""
    return WorkspaceClient()


def is_instance_ready(state: DatabaseInstanceState) -> bool:
    """Check if instance state indicates it's ready to use."""
    return state == DatabaseInstanceState.AVAILABLE


def check_instance(instance_name: str) -> tuple[bool, Optional[LakebaseInstanceInfo]]:
    """
    Check if a Lakebase instance exists and get its status.
    
    Args:
        instance_name: Name of the Lakebase instance
        
    Returns:
        Tuple of (is_ready, instance_info)
    """
    wc = get_workspace_client()
    instance = wc.database.get_database_instance(name=instance_name)
    
    info = LakebaseInstanceInfo(
        name=instance_name,
        uid=instance.uid,
        state=str(instance.state),
        capacity=str(instance.capacity) if instance.capacity else None,
        node_count=instance.effective_node_count,
        read_write_dns=instance.read_write_dns,
        read_only_dns=instance.read_only_dns,
        enable_readable_secondaries=instance.enable_readable_secondaries,
        retention_window_days=instance.effective_retention_window_in_days,
        creation_time=str(instance.creation_time) if instance.creation_time else None,
    )
    
    is_ready = is_instance_ready(instance.state)
    return is_ready, info


def get_token(
    instance_name: str,
    database: str = "postgres",
    port: int = 5432,
    sslmode: str = "require",
) -> LakebaseConnectionInfo:
    """
    Get Lakebase instance details and generate a database credential token.
    
    Args:
        instance_name: Name of the Lakebase database instance
        database: Database name to connect to
        port: PostgreSQL port (default: 5432)
        sslmode: SSL mode (default: require)
        
    Returns:
        LakebaseConnectionInfo with all connection details
        
    Raises:
        Exception: If instance not found or token generation fails
    """
    wc = get_workspace_client()
    
    # Get instance details
    instance = wc.database.get_database_instance(name=instance_name)
    
    # Check if instance is available
    if not is_instance_ready(instance.state):
        raise Exception(f"Instance '{instance_name}' is not available. Current state: {instance.state}")
    
    # Get current user
    user = wc.current_user.me().user_name
    
    # Generate database credential token
    cred = wc.database.generate_database_credential(
        request_id=str(uuid.uuid4()),
        instance_names=[instance_name]
    )
    
    # Build connection string
    host = instance.read_write_dns
    connection_string = f"postgresql://{user}:{cred.token}@{host}:{port}/{database}?sslmode={sslmode}"
    
    return LakebaseConnectionInfo(
        instance_name=instance_name,
        instance_id=instance.uid,
        state=str(instance.state),
        host=host,
        read_only_host=instance.read_only_dns,
        port=port,
        user=user,
        database=database,
        token=cred.token,
        sslmode=sslmode,
        connection_string=connection_string,
    )


def list_instances() -> list[LakebaseInstanceInfo]:
    """
    List all Lakebase instances.
    
    Returns:
        List of LakebaseInstanceInfo objects
    """
    wc = get_workspace_client()
    instances = []
    
    for instance in wc.database.list_database_instances():
        info = LakebaseInstanceInfo(
            name=instance.name,
            uid=instance.uid,
            state=str(instance.state),
            capacity=str(instance.capacity) if instance.capacity else None,
            node_count=instance.effective_node_count,
            read_write_dns=instance.read_write_dns,
            read_only_dns=instance.read_only_dns,
            enable_readable_secondaries=instance.enable_readable_secondaries,
            retention_window_days=instance.effective_retention_window_in_days,
            creation_time=str(instance.creation_time) if instance.creation_time else None,
        )
        instances.append(info)
    
    return instances


# =============================================================================
# CLI Command Handlers
# =============================================================================

def cmd_check(args) -> int:
    """Handle the 'check' command."""
    instance_name = args.instance_name
    
    try:
        print(f"Checking Lakebase instance '{instance_name}'...")
        is_ready, info = check_instance(instance_name)
        
        if args.output == "json":
            result = info.to_dict()
            result["is_ready"] = is_ready
            print(json.dumps(result, indent=2))
        else:
            print(f"\n✓ Instance '{instance_name}' exists!")
            print(f"\nInstance Details:")
            print(f"  Instance ID: {info.uid}")
            print(f"  State: {info.state}")
            print(f"  Capacity: {info.capacity}")
            print(f"  Node Count: {info.node_count}")
            print(f"  Read-Write DNS: {info.read_write_dns}")
            print(f"  Read-Only DNS: {info.read_only_dns}")
            print(f"  Enable Readable Secondaries: {info.enable_readable_secondaries}")
            print(f"  Retention Window (days): {info.retention_window_days}")
            print(f"  Created At: {info.creation_time}")
            
            if is_ready:
                print(f"\n✓ Instance is {info.state} and ready to use!")
            else:
                print(f"\n⚠ Instance state is '{info.state}' - may not be ready")
        
        return 0 if is_ready else 1
        
    except Exception as e:
        error_msg = str(e)
        if args.output == "json":
            print(json.dumps({"error": error_msg, "is_ready": False}), file=sys.stderr)
        else:
            print(f"\n✗ Error checking instance '{instance_name}': {error_msg}", file=sys.stderr)
            if "not found" in error_msg.lower() or "does not exist" in error_msg.lower():
                print(f"\n⚠ Instance '{instance_name}' does not exist.", file=sys.stderr)
                print("  Please run lakebase/notebooks/lakebase.ipynb to create it.", file=sys.stderr)
        return 1


def cmd_token(args) -> int:
    """Handle the 'token' command."""
    instance_name = args.instance_name
    database = args.database
    
    try:
        info = get_token(
            instance_name=instance_name,
            database=database,
            port=args.port,
            sslmode=args.sslmode,
        )
        
        if args.output == "json":
            print(json.dumps(info.to_dict(), indent=2))
        elif args.output == "env":
            print(info.to_env())
        else:
            print(f"\n✓ Lakebase Instance Details")
            print(f"{'='*50}")
            print(f"  Instance Name: {info.instance_name}")
            print(f"  Instance ID:   {info.instance_id}")
            print(f"  State:         {info.state}")
            print(f"  Host (R/W):    {info.host}")
            print(f"  Host (R/O):    {info.read_only_host or 'N/A'}")
            print(f"  Port:          {info.port}")
            print(f"  Database:      {info.database}")
            print(f"  User:          {info.user}")
            print(f"  SSL Mode:      {info.sslmode}")
            
            if args.show_token:
                print(f"\n✓ Credentials")
                print(f"{'='*50}")
                print(f"  Token: {info.token}")
                print(f"\n✓ Connection String")
                print(f"{'='*50}")
                print(f"  {info.connection_string}")
            else:
                print(f"\n  (Use --show-token to display credentials)")
        
        return 0
        
    except Exception as e:
        error_msg = str(e)
        if args.output == "json":
            print(json.dumps({"error": error_msg}), file=sys.stderr)
        else:
            print(f"\n✗ Error: {error_msg}", file=sys.stderr)
            if "not found" in error_msg.lower() or "does not exist" in error_msg.lower():
                print(f"\n⚠ Instance '{instance_name}' does not exist.", file=sys.stderr)
                print("  Please create the instance first.", file=sys.stderr)
        return 1


def cmd_list(args) -> int:
    """Handle the 'list' command."""
    try:
        instances = list_instances()
        
        if args.output == "json":
            print(json.dumps([i.to_dict() for i in instances], indent=2))
        else:
            if not instances:
                print("\nNo Lakebase instances found.")
                return 0
            
            print(f"\n✓ Found {len(instances)} Lakebase instance(s)")
            print(f"{'='*70}")
            
            for info in instances:
                ready_indicator = "✓" if is_instance_ready(DatabaseInstanceState(info.state.split(".")[-1])) else "⚠"
                print(f"\n{ready_indicator} {info.name}")
                print(f"  ID: {info.uid}")
                print(f"  State: {info.state}")
                print(f"  Host: {info.read_write_dns}")
                if args.verbose:
                    print(f"  Capacity: {info.capacity}")
                    print(f"  Node Count: {info.node_count}")
                    print(f"  Created: {info.creation_time}")
        
        return 0
        
    except Exception as e:
        error_msg = str(e)
        if args.output == "json":
            print(json.dumps({"error": error_msg}), file=sys.stderr)
        else:
            print(f"\n✗ Error listing instances: {error_msg}", file=sys.stderr)
        return 1


# =============================================================================
# CLI Parser Setup
# =============================================================================

def create_parser() -> argparse.ArgumentParser:
    """Create the argument parser with subcommands."""
    parser = argparse.ArgumentParser(
        prog="lakebase_cli_utils",
        description="Lakebase CLI Utilities - Manage Databricks Lakebase instances.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s check bi-agent-chat-session
  %(prog)s token bi-agent-chat-session databricks_postgres
  %(prog)s token bi-agent-chat-session --output json
  %(prog)s token bi-agent-chat-session --output env > .env
  %(prog)s list
  %(prog)s list --verbose
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # --- check command ---
    check_parser = subparsers.add_parser(
        "check",
        help="Check if a Lakebase instance exists and is running",
        description="Check if a Lakebase instance exists and get its status."
    )
    check_parser.add_argument(
        "instance_name",
        help="Lakebase instance name"
    )
    check_parser.add_argument(
        "--output", "-o",
        choices=["text", "json"],
        default="text",
        help="Output format (default: text)"
    )
    check_parser.set_defaults(func=cmd_check)
    
    # --- token command ---
    token_parser = subparsers.add_parser(
        "token",
        help="Get instance details and generate a database credential token",
        description="Get Lakebase instance details and generate a database credential token."
    )
    token_parser.add_argument(
        "instance_name",
        help="Lakebase instance name"
    )
    token_parser.add_argument(
        "database",
        nargs="?",
        default="postgres",
        help="Database name (default: postgres)"
    )
    token_parser.add_argument(
        "--port", "-p",
        type=int,
        default=5432,
        help="PostgreSQL port (default: 5432)"
    )
    token_parser.add_argument(
        "--sslmode", "-s",
        default="require",
        choices=["disable", "allow", "prefer", "require", "verify-ca", "verify-full"],
        help="SSL mode (default: require)"
    )
    token_parser.add_argument(
        "--output", "-o",
        choices=["text", "json", "env"],
        default="text",
        help="Output format (default: text)"
    )
    token_parser.add_argument(
        "--show-token",
        action="store_true",
        help="Show token and connection string in text output"
    )
    token_parser.set_defaults(func=cmd_token)
    
    # --- list command ---
    list_parser = subparsers.add_parser(
        "list",
        help="List all Lakebase instances",
        description="List all Lakebase instances in the workspace."
    )
    list_parser.add_argument(
        "--output", "-o",
        choices=["text", "json"],
        default="text",
        help="Output format (default: text)"
    )
    list_parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show detailed information for each instance"
    )
    list_parser.set_defaults(func=cmd_list)
    
    return parser


def main() -> int:
    """Main entry point."""
    parser = create_parser()
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
