from decimal import Decimal
from typing import Annotated

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

from routes.customer import (
    get_all_cash_sessions,
    get_customers,
    record_credit_payment,
    record_credit_sale,
    save_cash_session,
)
from routes.inventory import refresh_inventory
from routes.products import add_product, get_products
from routes.supplier import create_supplier, get_suppliers, record_purchase
from routes.triggers import verify_triggers

app = FastAPI(title="Cashwise API", version="1.0.0")


class CustomerInput(BaseModel):
    name: str | None = None
    phone: str | None = None


class ProductInput(BaseModel):
    name: str = Field(min_length=1)
    category: str = Field(min_length=1)
    unit_price: Decimal = Field(ge=0)
    unit: str = Field(min_length=1)
    reorder_level: int = Field(default=0, ge=0)


class SaleItem(BaseModel):
    product_name: str = Field(min_length=1)
    quantity: int = Field(gt=0)
    unit_price: Decimal | None = Field(default=None, ge=0)


class CashSaleInput(BaseModel):
    customer: CustomerInput | None = None
    items: list[SaleItem] = Field(min_length=1)
    cash_received: Decimal = Field(gt=0)


class PurchaseItem(BaseModel):
    product_name: str = Field(min_length=1)
    quantity: int = Field(gt=0)
    unit_cost: Decimal = Field(ge=0)


class PurchaseInput(BaseModel):
    supplier_id: int
    items: list[PurchaseItem] = Field(min_length=1)


class CreditSaleInput(BaseModel):
    customer_id: int
    items: list[SaleItem] = Field(min_length=1)


class PaymentInput(BaseModel):
    customer_id: int
    amount_paid: Decimal = Field(gt=0)
    note: str | None = None


class SupplierInput(BaseModel):
    name: str = Field(min_length=1)
    phone: str | None = None


def _items_as_dict(items: list[SaleItem]):
    return {item.product_name: item.quantity for item in items}


def _price_items(items: list[SaleItem], use_current_prices=True):
    products = get_products()
    result = []
    for item in items:
        product = products.get(item.product_name)
        if product is None:
            raise HTTPException(status_code=404, detail=f"Product '{item.product_name}' not found.")
        price = product["price"] if use_current_prices else item.unit_price
        if price is None:
            raise HTTPException(status_code=422, detail="unit_price is required for this sale.")
        result.append((item.product_name, item.quantity, price))
    return result


@app.get("/", tags=["health"])
def root():
    return {"name": "Cashwise API", "status": "ok"}


@app.get("/health", tags=["health"])
def health():
    try:
        triggers = verify_triggers()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database is unavailable.") from exc
    return {"status": "ok", "trigger_count": len(triggers)}


@app.get("/products")
def list_products():
    return get_products()


@app.post("/products", status_code=status.HTTP_201_CREATED)
def create_product(product: ProductInput):
    try:
        product_id = add_product(
            product.name,
            product.category,
            product.unit_price,
            product.unit,
            product.reorder_level,
        )
        refresh_inventory()
        return {"product_id": product_id, "name": product.name}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/customers")
def list_customers():
    return [
        {
            "customer_id": row[0],
            "name": row[1],
            "phone": row[2],
            "balance_due": float(row[3]),
        }
        for row in get_customers()
    ]


@app.get("/suppliers")
def list_suppliers():
    return [{"supplier_id": row[0], "name": row[1], "phone": row[2]} for row in get_suppliers()]


@app.post("/suppliers", status_code=status.HTTP_201_CREATED)
def create_supplier_endpoint(supplier: SupplierInput):
    try:
        supplier_id = create_supplier(supplier.name, supplier.phone)
        return {"supplier_id": supplier_id, "name": supplier.name}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/cash-sales", status_code=status.HTTP_201_CREATED)
def create_cash_sale(sale: CashSaleInput):
    products = get_products()
    items = _price_items(sale.items)
    total = sum(quantity * price for _, quantity, price in items)
    if sale.cash_received < total:
        raise HTTPException(status_code=422, detail="cash_received is less than the sale total.")

    try:
        session_id = save_cash_session(
            sale.customer.model_dump() if sale.customer else {},
            _items_as_dict(sale.items),
            total,
            sale.cash_received,
        )
        return {
            "session_id": session_id,
            "total_amount": total,
            "change_given": sale.cash_received - total,
            "items": items,
            "products_checked": len(products),
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/cash-sales")
def list_cash_sales():
    return get_all_cash_sessions()


@app.post("/purchases", status_code=status.HTTP_201_CREATED)
def create_purchase(purchase: PurchaseInput):
    items = [(item.product_name, item.quantity, item.unit_cost) for item in purchase.items]
    try:
        purchase_id, total = record_purchase(purchase.supplier_id, items)
        refresh_inventory()
        return {"purchase_id": purchase_id, "total_amount": total}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/credit-sales", status_code=status.HTTP_201_CREATED)
def create_credit_sale(sale: CreditSaleInput):
    items = _price_items(sale.items, use_current_prices=False)
    try:
        credit_id, total = record_credit_sale(sale.customer_id, items)
        refresh_inventory()
        return {"credit_id": credit_id, "total_amount": total}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/credit-payments", status_code=status.HTTP_201_CREATED)
def create_credit_payment(payment: PaymentInput):
    try:
        payment_id = record_credit_payment(payment.customer_id, payment.amount_paid, payment.note)
        return {"payment_id": payment_id, "amount_paid": payment.amount_paid}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
