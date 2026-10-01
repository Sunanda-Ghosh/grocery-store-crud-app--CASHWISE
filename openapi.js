module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'CashWise API',
    version: '1.0.0',
    description: 'Sales, purchases, credit sales, and credit payment endpoints.',
  },
  servers: [{ url: 'http://localhost:3000' }],
  paths: {
    '/': {
      get: {
        summary: 'Check API status',
        responses: { 200: { description: 'API is running' } },
      },
    },
    '/sales': {
      post: {
        summary: 'Record a cash sale',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Sale' } } } },
        responses: { 201: { description: 'Cash sale recorded' }, 400: { description: 'Invalid request' }, 422: { description: 'Cash received is below the total' } },
      },
    },
    '/purchases': {
      post: {
        summary: 'Record a stock purchase',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Purchase' } } } },
        responses: { 201: { description: 'Purchase recorded' }, 400: { description: 'Invalid request' } },
      },
    },
    '/credit-sales': {
      post: {
        summary: 'Record a credit sale',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreditSale' } } } },
        responses: { 201: { description: 'Credit sale recorded' }, 400: { description: 'Invalid request' } },
      },
    },
    '/credit-payments': {
      post: {
        summary: 'Record a credit payment',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreditPayment' } } } },
        responses: { 201: { description: 'Credit payment recorded' }, 400: { description: 'Invalid request' }, 404: { description: 'Customer not found' } },
      },
    },
    '/products': {
      get: {
        summary: 'List inventory products',
        responses: { 200: { description: 'Products with stock and reorder data' }, 503: { description: 'Inventory unavailable' } },
      },
    },
    '/products/{id}': {
      patch: {
        summary: 'Update a product price',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductPriceUpdate' } } } },
        responses: { 200: { description: 'Product updated' }, 400: { description: 'Invalid price' }, 404: { description: 'Product not found' } },
      },
    },
    '/suppliers': {
      get: {
        summary: 'List suppliers',
        responses: { 200: { description: 'Suppliers' }, 503: { description: 'Supplier data unavailable' } },
      },
    },
    '/suppliers/{id}': {
      get: {
        summary: 'Get a supplier and its purchase history',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Supplier detail' }, 404: { description: 'Supplier not found' } },
      },
    },
    '/purchase-history': {
      get: {
        summary: 'List purchase history',
        responses: { 200: { description: 'Purchases, newest first' }, 503: { description: 'Purchase history unavailable' } },
      },
    },
  },
  components: {
    schemas: {
      SaleItem: {
        type: 'object',
        required: ['product_id', 'quantity', 'unit_price'],
        properties: {
          product_id: { type: 'integer', example: 2 },
          quantity: { type: 'integer', minimum: 1, example: 1 },
          unit_price: { type: 'number', minimum: 0, example: 25 },
        },
      },
      Sale: {
        type: 'object',
        required: ['items', 'cash_received'],
        properties: {
          customer_id: { type: 'integer', nullable: true, example: null },
          items: { type: 'array', items: { $ref: '#/components/schemas/SaleItem' } },
          cash_received: { type: 'number', minimum: 0, example: 200 },
        },
      },
      Purchase: {
        type: 'object',
        required: ['supplier_id', 'purchase_date', 'items'],
        properties: {
          supplier_id: { type: 'integer', example: 2 },
          purchase_date: { type: 'string', format: 'date', example: '2026-09-23' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/PurchaseItem' },
            example: [{ product_id: 2, quantity: 10, unit_cost: 18 }],
          },
        },
      },
      PurchaseItem: {
        type: 'object',
        required: ['quantity', 'unit_cost'],
        oneOf: [
          { required: ['product_id'] },
          { required: ['product_name', 'category_id', 'unit'] },
        ],
        properties: {
          product_id: { type: 'integer', example: 2 },
          product_name: { type: 'string', example: 'Sunflower Oil (1L)' },
          category_id: { type: 'integer', example: 2 },
          unit: { type: 'string', example: 'bottle' },
          quantity: { type: 'integer', minimum: 1, example: 10 },
          unit_cost: { type: 'number', minimum: 0, example: 18 },
        },
      },
      CreditSale: {
        type: 'object',
        required: ['customer_id', 'items'],
        properties: {
          customer_id: { type: 'integer', example: 2 },
          items: { type: 'array', items: { $ref: '#/components/schemas/SaleItem' } },
        },
      },
      CreditPayment: {
        type: 'object',
        required: ['customer_id', 'amount_paid'],
        properties: {
          customer_id: { type: 'integer', example: 2 },
          amount_paid: { type: 'number', exclusiveMinimum: 0, example: 50 },
          note: { type: 'string', nullable: true, example: 'Partial payment' },
        },
      },
      ProductPriceUpdate: {
        type: 'object',
        required: ['unit_price'],
        properties: { unit_price: { type: 'number', minimum: 0, example: 25 } },
      },
    },
  },
};