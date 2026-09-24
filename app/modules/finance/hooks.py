from decimal import Decimal
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.modules.finance.models import Account
from app.modules.finance.schemas import JournalEntryCreate, JournalVoucherCreate
from app.modules.finance.services import JournalVoucherService

logger = logging.getLogger(__name__)


async def auto_post_ecommerce_order(db: AsyncSession, order) -> None:
    """
    Hook called when an ecommerce order is paid/completed.
    Posts Sales Revenue & Output VAT journal entry.
    """
    try:
        business_id = order.business_id
        accs_res = await db.execute(
            select(Account).where(Account.business_id == business_id)
        )
        acc_dict = {a.code: a for a in accs_res.scalars().all()}

        cash_ar_acc = acc_dict.get("1010") or acc_dict.get("1100")  # Cash or AR
        sales_acc = acc_dict.get("4010")  # Sales Revenue
        vat_acc = acc_dict.get("2100")  # Output VAT

        if not (cash_ar_acc and sales_acc and vat_acc):
            logger.warning(f"Default accounts missing for business #{business_id}, skipping ecommerce order auto-posting.")
            return

        entries = [
            JournalEntryCreate(
                account_id=cash_ar_acc.id,
                debit=order.total_amount,
                credit=Decimal("0.00"),
                narration=f"Ecommerce Order Payment - {order.order_number}",
            ),
            JournalEntryCreate(
                account_id=sales_acc.id,
                debit=Decimal("0.00"),
                credit=order.subtotal_amount,
                narration=f"Sales Revenue - {order.order_number}",
            ),
            JournalEntryCreate(
                account_id=vat_acc.id,
                debit=Decimal("0.00"),
                credit=order.tax_amount,
                narration=f"Output VAT 15% - {order.order_number}",
            ),
        ]

        jv_create = JournalVoucherCreate(
            business_id=business_id,
            voucher_type="receipt",
            entry_date=order.created_at.date() if hasattr(order.created_at, "date") else order.created_at,
            reference=order.order_number,
            notes=f"Auto-posted ecommerce order {order.order_number}",
            entries=entries,
        )

        voucher = await JournalVoucherService.create_voucher(db, business_id, None, jv_create)
        await JournalVoucherService.post_voucher(db, business_id, None, voucher.id)
    except Exception as e:
        logger.exception(f"Failed to auto-post ecommerce order {getattr(order, 'order_number', '')}: {e}")


async def auto_post_hr_payroll(db: AsyncSession, payroll_record) -> None:
    """
    Hook called when a payroll record is approved/processed.
    Posts Salary Expense, TDS, PF, and Salary Payable journal entry.
    """
    try:
        business_id = payroll_record.business_id
        accs_res = await db.execute(
            select(Account).where(Account.business_id == business_id)
        )
        acc_dict = {a.code: a for a in accs_res.scalars().all()}

        salary_exp_acc = acc_dict.get("5100")  # Salary Expense
        salary_pay_acc = acc_dict.get("2400")  # Salary Payable
        tds_acc = acc_dict.get("2200")  # TDS Payable
        pf_acc = acc_dict.get("2300")  # Provident Fund Payable

        if not (salary_exp_acc and salary_pay_acc):
            logger.warning(f"Default salary accounts missing for business #{business_id}, skipping payroll auto-posting.")
            return

        gross_salary = (
            getattr(payroll_record, "basic_salary", Decimal("0.00"))
            + getattr(payroll_record, "house_rent", Decimal("0.00"))
            + getattr(payroll_record, "medical_allowance", Decimal("0.00"))
            + getattr(payroll_record, "transport_allowance", Decimal("0.00"))
            + getattr(payroll_record, "food_allowance", Decimal("0.00"))
            + getattr(payroll_record, "other_allowance", Decimal("0.00"))
            + getattr(payroll_record, "overtime_pay", Decimal("0.00"))
            + getattr(payroll_record, "bonus", Decimal("0.00"))
        )

        tax_amt = getattr(payroll_record, "tax", Decimal("0.00"))
        pf_amt = getattr(payroll_record, "provident_fund", Decimal("0.00"))
        other_ded = getattr(payroll_record, "unpaid_leave_deduction", Decimal("0.00")) + getattr(payroll_record, "other_deduction", Decimal("0.00"))

        net_payable = gross_salary - tax_amt - pf_amt - other_ded

        entries = [
            JournalEntryCreate(
                account_id=salary_exp_acc.id,
                debit=gross_salary,
                credit=Decimal("0.00"),
                narration=f"Gross Salary Expense - Emp #{payroll_record.employee_id}",
            ),
            JournalEntryCreate(
                account_id=salary_pay_acc.id,
                debit=Decimal("0.00"),
                credit=net_payable,
                narration=f"Net Salary Payable - Emp #{payroll_record.employee_id}",
            ),
        ]

        if tax_amt > Decimal("0.00") and tds_acc:
            entries.append(
                JournalEntryCreate(
                    account_id=tds_acc.id,
                    debit=Decimal("0.00"),
                    credit=tax_amt,
                    narration=f"TDS Salary Deduction - Emp #{payroll_record.employee_id}",
                )
            )

        if pf_amt > Decimal("0.00") and pf_acc:
            entries.append(
                JournalEntryCreate(
                    account_id=pf_acc.id,
                    debit=Decimal("0.00"),
                    credit=pf_amt,
                    narration=f"Provident Fund Deduction - Emp #{payroll_record.employee_id}",
                )
            )

        entry_date = date.today()

        jv_create = JournalVoucherCreate(
            business_id=business_id,
            voucher_type="journal",
            entry_date=entry_date,
            reference=f"PAYROLL-{payroll_record.employee_id}",
            notes=f"Auto-posted payroll salary for Employee #{payroll_record.employee_id}",
            entries=entries,
        )

        voucher = await JournalVoucherService.create_voucher(db, business_id, None, jv_create)
        await JournalVoucherService.post_voucher(db, business_id, None, voucher.id)
    except Exception as e:
        logger.exception(f"Failed to auto-post payroll for record #{getattr(payroll_record, 'id', '')}: {e}")
