import asyncio
import asyncpg
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://postgres.xojnkjjtvgwyatkcnfpd:mohamed%4001270018663@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
)

async def main():
    with open("../db/migrate_auth.sql", "r") as f:
        sql = f.read()
    
    conn = await asyncpg.connect(DATABASE_URL)
    await conn.execute(sql)
    await conn.close()
    print("Migration successful")

if __name__ == "__main__":
    asyncio.run(main())
