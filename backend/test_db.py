import asyncio
import asyncpg
async def main():
    try:
        conn = await asyncpg.connect("postgresql://postgres.xojnkjjtvgwyatkcnfpd:mohamed%4001270018663@aws-0-eu-central-1.pooler.supabase.com:5432/postgres")
        print("Success!")
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")
asyncio.run(main())
