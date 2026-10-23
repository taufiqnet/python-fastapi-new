import os
import sys
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.schema import CreateColumn

# Add workspace to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.database import Base
import app.models_registry  # Loads all models

def sync_schema():
    db_url = os.environ.get("DATABASE_URL") or settings.database_url
    if "@127.0.0.1" in db_url or "@localhost" in db_url:
        db_url = db_url.replace("@127.0.0.1", "@db").replace("@localhost", "@db")
    print(f"Connecting to database at {db_url}...")
    engine = create_engine(db_url)
    
    # First, create all missing tables
    print("Creating any missing tables via Base.metadata.create_all...")
    Base.metadata.create_all(bind=engine)
    
    # Inspect actual columns in database
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    print(f"Found {len(existing_tables)} existing tables in database.")
    
    added_columns_count = 0
    with engine.connect() as conn:
        for table_name, table in Base.metadata.tables.items():
            if table_name not in existing_tables:
                continue
                
            db_cols = {col["name"] for col in inspector.get_columns(table_name)}
            
            for col in table.columns:
                if col.name not in db_cols:
                    print(f"Missing column detected: {table_name}.{col.name}")
                    col_type_str = col.type.compile(engine.dialect)
                    
                    # Build ALTER TABLE statement
                    # For safety, allow nullable or set default
                    alter_stmt = f'ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS "{col.name}" {col_type_str}'
                    if col.default is not None and hasattr(col.default, 'arg'):
                        # If simple scalar default
                        arg = col.default.arg
                        if isinstance(arg, (int, float)):
                            alter_stmt += f" DEFAULT {arg}"
                        elif isinstance(arg, bool):
                            alter_stmt += f" DEFAULT {'TRUE' if arg else 'FALSE'}"
                        elif isinstance(arg, str):
                            alter_stmt += f" DEFAULT '{arg}'"
                    elif col.nullable is False:
                        # If non-nullable without explicit default, provide sensible fallback
                        if "bool" in str(col_type_str).lower():
                            alter_stmt += " DEFAULT FALSE"
                        elif "int" in str(col_type_str).lower() or "numeric" in str(col_type_str).lower():
                            alter_stmt += " DEFAULT 0"
                        else:
                            alter_stmt += " DEFAULT ''"

                    print(f"Executing: {alter_stmt}")
                    try:
                        conn.execute(text(alter_stmt))
                        conn.commit()
                        added_columns_count += 1
                        print(f"  -> Successfully added {table_name}.{col.name}")
                    except Exception as err:
                        print(f"  -> Error adding column {table_name}.{col.name}: {err}")
                        conn.rollback()

    print(f"\nSchema sync complete! Total columns added: {added_columns_count}")

if __name__ == "__main__":
    sync_schema()
