#!/usr/bin/env python3
"""Generate all supported ML sample datasets."""
import csv
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "ml-samples"
OUT.mkdir(parents=True, exist_ok=True)

random.seed(42)


def write_csv(path: Path, fields: list[str], rows: list[dict]) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    print(f"Wrote {path} ({len(rows)} rows)")


def generate_churn(path: Path, n: int = 220) -> None:
    contracts = ["Month-to-month", "One year", "Two year"]
    payments = ["Electronic check", "Mailed check", "Bank transfer", "Credit card"]
    rows = []
    for i in range(1, n + 1):
        contract = random.choices(contracts, weights=[0.45, 0.3, 0.25])[0]
        tenure = random.randint(1, 72)
        monthly = round(random.uniform(25, 120), 2)
        total = round(monthly * tenure * random.uniform(0.85, 1.1), 2)
        tickets = random.randint(0, 8)
        logins = random.randint(0, 28)
        adoption = random.randint(15, 98)
        payment = random.choice(payments)
        churn_score = 0.0
        if contract == "Month-to-month":
            churn_score += 0.35
        if tenure < 12:
            churn_score += 0.25
        if monthly > 85:
            churn_score += 0.15
        if tickets >= 4:
            churn_score += 0.2
        if logins < 8:
            churn_score += 0.2
        if adoption < 40:
            churn_score += 0.25
        if payment in ("Electronic check", "Mailed check"):
            churn_score += 0.1
        churned = "Yes" if random.random() < min(0.92, churn_score + 0.08) else "No"
        rows.append({
            "customer_id": f"C{i:04d}",
            "tenure_months": tenure,
            "monthly_charges": monthly,
            "total_charges": total,
            "contract_type": contract,
            "payment_method": payment,
            "support_tickets_last_6mo": tickets,
            "avg_login_days_per_month": logins,
            "feature_adoption_score": adoption,
            "churned": churned,
        })
    write_csv(path, list(rows[0].keys()), rows)


def co_report_text(facility: str, risk: str, seq: int) -> str:
    ppm = 10 + (seq % 8) if risk == "Low" else 35 + (seq % 15) if risk == "Medium" else 150 + (seq % 80)
    templates = {
        "Low": [
            f"Inspection RPT-{seq:04d}: {facility} stack CO averaged {ppm} ppm with stable combustion. Scrubbers serviced; no visible leaks.",
            f"Site {seq}: {facility} outlet CO {ppm} ppm. Quarterly burner tuning complete. Ventilation adequate per EPA limits.",
        ],
        "Medium": [
            f"RPT-{seq:04d}: {facility} intermittent CO spikes to {ppm} ppm during shift change. Aging ductwork may restrict flow.",
            f"Audit {seq} at {facility}: CO reached {ppm} ppm when secondary burner cycled. Filters overdue by {seq % 8 + 1} weeks.",
        ],
        "High": [
            f"CRITICAL RPT-{seq:04d}: {facility} CO peaked at {ppm} ppm. Failed stack test; cracked heat exchanger identified.",
            f"Emergency {seq}: {facility} reading {ppm} ppm CO in enclosed bay. Sensors tripped; ventilation inadequate.",
        ],
    }
    return templates[risk][seq % len(templates[risk])]


def generate_co_reports(path: Path, n: int = 180) -> None:
    facilities = ["Steel mill", "Cement plant", "Chemical refinery", "Power station", "Foundry"]
    regions = ["North", "South", "East", "West", "Central"]
    rows = []
    for i in range(1, n + 1):
        facility = random.choice(facilities)
        risk = random.choices(["Low", "Medium", "High"], weights=[0.4, 0.35, 0.25])[0]
        rows.append({
            "report_id": f"RPT-{i:04d}",
            "facility_type": facility,
            "region": random.choice(regions),
            "inspection_report": co_report_text(facility, risk, i),
            "co_risk_level": risk,
        })
    write_csv(path, list(rows[0].keys()), rows)


def generate_loan_default(path: Path, n: int = 200) -> None:
    rows = []
    for i in range(1, n + 1):
        age = random.randint(22, 65)
        income = round(random.uniform(28000, 145000), 2)
        credit = random.randint(480, 820)
        amount = round(random.uniform(5000, 85000), 2)
        term = random.choice([12, 24, 36, 48, 60])
        employment = round(random.uniform(0.5, 25), 1)
        dti = round(random.uniform(0.08, 0.72), 2)
        risk = 0.0
        if credit < 580:
            risk += 0.35
        elif credit < 650:
            risk += 0.2
        if dti > 0.45:
            risk += 0.25
        if amount > income * 0.8:
            risk += 0.2
        if employment < 2:
            risk += 0.15
        if term >= 48:
            risk += 0.1
        default = "Yes" if random.random() < min(0.88, risk + 0.06) else "No"
        rows.append({
            "loan_id": f"LN{i:04d}",
            "applicant_age": age,
            "annual_income": income,
            "credit_score": credit,
            "loan_amount": amount,
            "loan_term_months": term,
            "employment_years": employment,
            "debt_to_income_ratio": dti,
            "loan_default": default,
        })
    write_csv(path, list(rows[0].keys()), rows)


def generate_fraud(path: Path, n: int = 240) -> None:
    merchants = ["Grocery", "Gas", "Electronics", "Travel", "Restaurant", "Online retail", "ATM"]
    rows = []
    for i in range(1, n + 1):
        amount = round(random.uniform(4, 2800), 2)
        category = random.choice(merchants)
        distance = round(random.uniform(0, 1200), 1)
        hour = random.randint(0, 23)
        card_present = random.choice(["Yes", "No"])
        prior = random.randint(0, 3)
        risk = 0.0
        if amount > 1500:
            risk += 0.25
        if distance > 400:
            risk += 0.3
        if hour < 5 or hour > 23:
            risk += 0.15
        if card_present == "No" and category in ("Electronics", "Online retail", "Travel"):
            risk += 0.25
        if prior >= 1:
            risk += 0.2
        is_fraud = "Yes" if random.random() < min(0.85, risk + 0.04) else "No"
        rows.append({
            "transaction_id": f"TXN{i:05d}",
            "amount": amount,
            "merchant_category": category,
            "distance_from_home_km": distance,
            "hour_of_day": hour,
            "card_present": card_present,
            "prev_fraud_alerts_90d": prior,
            "is_fraud": is_fraud,
        })
    write_csv(path, list(rows[0].keys()), rows)


def qa_report_text(product: str, severity: str, seq: int) -> str:
    pct = (seq % 5) + 1
    templates = {
        "Minor": [
            f"QA-{seq:04d}: {product} unit {seq} passed dimensional check with minor cosmetic scratch. No functional impact.",
            f"Inspection {seq}: surface finish on {product} batch B-{seq % 40} slightly below spec on non-critical panel.",
        ],
        "Major": [
            f"QA-{seq:04d}: {product} lot L-{seq} solder bridge on control board affecting {pct}% of units. Rework queue initiated.",
            f"Line audit {seq}: torque variance on {product} assembly; {pct} units exceed upper control limit.",
        ],
        "Critical": [
            f"CRITICAL QA-{seq:04d}: {product} serial {seq} safety interlock failed stress test. Stop-ship issued.",
            f"Hold {seq}: {product} weld crack on bracket batch W-{seq % 30}. Full lot recall recommended.",
        ],
    }
    return templates[severity][seq % len(templates[severity])]


def generate_qa_reports(path: Path, n: int = 170) -> None:
    products = ["Automotive sensor", "Medical device housing", "Industrial pump", "PCB module", "Hydraulic valve"]
    shifts = ["Day", "Evening", "Night"]
    rows = []
    for i in range(1, n + 1):
        product = random.choice(products)
        severity = random.choices(["Minor", "Major", "Critical"], weights=[0.45, 0.35, 0.2])[0]
        rows.append({
            "inspection_id": f"QA-{i:04d}",
            "product_line": product,
            "shift": random.choice(shifts),
            "qa_report": qa_report_text(product, severity, i),
            "defect_severity": severity,
        })
    write_csv(path, list(rows[0].keys()), rows)


def email_text(label: str, seq: int) -> str:
    """Unique body per row so TF-IDF training survives deduplication."""
    day = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"][seq % 5]
    hour = (seq % 11) + 1
    order = 48000 + seq
    if label == "Phishing":
        variants = [
            f"URGENT EM-{seq:04d}: Account user-{seq} suspended in {seq % 47 + 1} hours. Verify credentials at secure-login-update.net immediately.",
            f"Invoice INV-{8000 + seq} is overdue. Confirm your password on invoice-pay-center.biz to avoid legal action by {day}.",
            f"Security alert #{seq}: unusual sign-in detected in region {(seq % 9) + 1}. Reset your banking PIN now before funds are locked.",
            f"Congratulations! Prize code WIN-{seq} expires in {(seq % 5) + 2} hours. Provide card details at account-alert-secure.com to claim.",
            f"Mailbox {seq}: Your subscription payment failed. Update billing at bank-verify-now.io within {seq % 12 + 1} hours or lose access.",
        ]
    else:
        variants = [
            f"Hi team, sprint {(seq % 12) + 1} review is scheduled for {day} at {hour}pm in conference room {chr(65 + seq % 6)}. Agenda attached.",
            f"Your order #{order} has shipped via route {seq % 20}. Track delivery in your account dashboard. Thank you for your purchase.",
            f"Reminder REF-{seq}: annual benefits enrollment closes {day}. Visit the HR portal to update your selections.",
            f"Project kickoff notes for initiative P-{seq} are in /shared/projects/{seq % 50}. Please review action items by EOD.",
            f"IT ticket #{1000 + seq} resolved. Your laptop patch KB-{seq % 200} installed successfully. Contact helpdesk with questions.",
        ]
    return variants[seq % len(variants)]


def generate_phishing_emails(path: Path, n: int = 190) -> None:
    legit_domains = ["company.com", "hr-portal.org", "shop-retail.com", "university.edu"]
    phish_domains = ["secure-login-update.net", "bank-verify-now.io", "invoice-pay-center.biz", "account-alert-secure.com"]
    rows = []
    for i in range(1, n + 1):
        label = random.choices(["Legitimate", "Phishing"], weights=[0.55, 0.45])[0]
        domain = random.choice(phish_domains if label == "Phishing" else legit_domains)
        rows.append({
            "email_id": f"EM-{i:04d}",
            "sender_domain": domain,
            "email_body": email_text(label, i),
            "phishing_label": label,
        })
    write_csv(path, list(rows[0].keys()), rows)


# Filenames match model titles in src/features/ml/model-presets.ts
SAMPLE_CONFIG = [
    ("customer_churn_predictor.csv", generate_churn, 500),
    ("industrial_co_emission_risk.csv", generate_co_reports, 450),
    ("loan_default_risk_predictor.csv", generate_loan_default, 480),
    ("transaction_fraud_detector.csv", generate_fraud, 550),
    ("manufacturing_qa_defect_severity.csv", generate_qa_reports, 450),
    ("phishing_email_classifier.csv", generate_phishing_emails, 500),
]

LEGACY_FILENAMES = [
    "customer_churn.csv",
    "industrial_co_reports.csv",
    "loan_default_risk.csv",
    "transaction_fraud.csv",
    "manufacturing_qa_reports.csv",
    "phishing_emails.csv",
]


if __name__ == "__main__":
    print(f"Output: {OUT}\n")
    for filename, generator, row_count in SAMPLE_CONFIG:
        generator(OUT / filename, row_count)
    for old in LEGACY_FILENAMES:
        legacy = OUT / old
        if legacy.exists():
            legacy.unlink()
            print(f"Removed legacy file: {old}")
    print("\nAll 6 sample datasets ready.")
