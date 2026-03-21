from app.config.database import Base, engine
from app.models.bill import Bill, BillSection  # import models

print("Creating tables...")
Base.metadata.create_all(bind=engine)
print("Done ✅")