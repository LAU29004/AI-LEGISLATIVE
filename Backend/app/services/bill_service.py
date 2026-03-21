import logging
from typing import List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bill import Bill
from app.repositories.bill_repo import BillRepository

logger = logging.getLogger(__name__)


class BillService:
    def __init__(self, db: AsyncSession):
        self.repo = BillRepository(db)

    async def get_all_bills(
        self, skip: int = 0, limit: int = 50
    ) -> Tuple[int, List[Bill]]:
        total = await self.repo.count()
        bills = await self.repo.get_all(skip=skip, limit=limit)
        return total, bills

    async def get_bill_by_id(self, bill_id: str) -> Optional[Bill]:
        return await self.repo.get_by_id(bill_id)

    async def get_bill_by_number(self, bill_number: str) -> Optional[Bill]:
        return await self.repo.get_by_bill_number(bill_number)
