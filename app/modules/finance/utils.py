"""
Utility functions for Finance & Accounting (Bangladesh context).
Includes English & Bangla number-to-words converter for BDT currency amounts.
"""

from decimal import Decimal

UNITS = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
]

TENS = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
]


def _number_to_words_less_than_thousand(n: int) -> str:
    if n == 0:
        return ""
    if n < 20:
        return UNITS[n]
    if n < 100:
        return TENS[n // 10] + ("-" + UNITS[n % 10] if n % 10 != 0 else "")
    return UNITS[n // 100] + " Hundred" + (" " + _number_to_words_less_than_thousand(n % 100) if n % 100 != 0 else "")


def number_to_words_bdt(amount: Decimal | float | int) -> str:
    """
    Converts a numeric amount to BDT currency in words (Indian numbering system: Lakh, Crore).
    e.g. 125000.50 -> "Taka One Lakh Twenty-Five Thousand Fifty Poisha Only"
    """
    val = Decimal(str(amount))
    if val < 0:
        return "Negative " + number_to_words_bdt(abs(val))

    taka = int(val)
    poisha = int(round((val - taka) * 100))

    if taka == 0 and poisha == 0:
        return "Taka Zero Only"

    words = []

    # Indian numbering: Crores (10,00,00,000), Lakhs (1,00,000), Thousands (1,000)
    crore = taka // 10000000
    taka %= 10000000

    lakh = taka // 100000
    taka %= 100000

    thousand = taka // 1000
    taka %= 1000

    hundreds = taka

    if crore > 0:
        words.append(f"{_number_to_words_less_than_thousand(crore)} Crore")
    if lakh > 0:
        words.append(f"{_number_to_words_less_than_thousand(lakh)} Lakh")
    if thousand > 0:
        words.append(f"{_number_to_words_less_than_thousand(thousand)} Thousand")
    if hundreds > 0:
        words.append(_number_to_words_less_than_thousand(hundreds))

    taka_str = " ".join(words) if words else "Zero"
    res = f"Taka {taka_str}"

    if poisha > 0:
        poisha_str = _number_to_words_less_than_thousand(poisha)
        res += f" and {poisha_str} Poisha"

    return res + " Only"
