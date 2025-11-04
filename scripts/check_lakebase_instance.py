#!/usr/bin/env python3
"""
Script to check if a Lakebase instance exists and is running.
Usage: python scripts/check_lakebase_instance.py [instance_name]
"""

import sys
from databricks.sdk import WorkspaceClient

def check_lakebase_instance(instance_name: str):
    """Check if a Lakebase instance exists and get its status."""
    try:
        wc = WorkspaceClient()
        print(f"Checking Lakebase instance '{instance_name}'...")
        
        instance = wc.database.get_database_instance(name=instance_name)
        
        print(f"\n✓ Instance '{instance_name}' exists!")
        print(f"\nInstance Details:")
        print(f"  Instance ID: {instance.uid}")
        print(f"  State: {instance.state}")
        print(f"  Capacity: {instance.capacity}")
        print(f"  Node Count: {instance.effective_node_count}")
        print(f"  Read-Write DNS: {instance.read_write_dns}")
        print(f"  Read-Only DNS: {instance.read_only_dns}")
        print(f"  Enable Readable Secondaries: {instance.enable_readable_secondaries}")
        print(f"  Retention Window (days): {instance.effective_retention_window_in_days}")
        print(f"  Created At: {instance.creation_time}")
        
        # Check if instance is running (AVAILABLE is the correct state for Lakebase instances)
        from databricks.sdk.service.database import DatabaseInstanceState
        if instance.state == DatabaseInstanceState.AVAILABLE:
            print(f"\n✓ Instance is AVAILABLE and ready to use!")
            return True
        elif instance.state == DatabaseInstanceState.RUNNING:
            print(f"\n✓ Instance is RUNNING and ready to use!")
            return True
        else:
            print(f"\n⚠ Instance state is '{instance.state}' - may not be ready")
            return False
            
    except Exception as e:
        print(f"\n✗ Error checking instance '{instance_name}': {str(e)}")
        if "not found" in str(e).lower() or "does not exist" in str(e).lower():
            print(f"\n⚠ Instance '{instance_name}' does not exist.")
            print("  Please run lakebase/notebooks/lakebase.ipynb to create it.")
        return False

if __name__ == "__main__":
    instance_name = sys.argv[1] if len(sys.argv) > 1 else "cx-live-demo-no-delete"
    success = check_lakebase_instance(instance_name)
    sys.exit(0 if success else 1)

