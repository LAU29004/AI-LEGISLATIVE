from app.ingestion.pipeline import run_ingestion

if __name__ == "__main__":
    print("🚀 Starting ingestion...")

    run_ingestion()

    print("✅ Finished")