const express = require('express');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const openapiDocument = require('./openapi');
const salesRouter = require('./routes/sales');
const purchasesRouter = require('./routes/purchases');
const creditSalesRouter = require('./routes/creditSales');
const creditPaymentsRouter = require('./routes/creditPayments');
const dashboardRouter = require('./routes/dashboard');
const productsRouter = require('./routes/products');
const suppliersRouter = require('./routes/suppliers');
const purchaseHistoryRouter = require('./routes/purchaseHistory');
const authRouter = require('./routes/auth');
const profileRouter = require('./routes/profile');
const passwordResetRouter = require('./routes/passwordReset');
const { requireAuth } = require('./middleware/auth');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/api/health', (req, res) => res.json({ name: 'Cashwise API', status: 'ok' }));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));
app.get('/openapi.json', (req, res) => res.json(openapiDocument));
app.use('/auth', authRouter);
app.use('/', passwordResetRouter);
app.use('/', profileRouter);

const protectedRoutes = express.Router();
protectedRoutes.use(requireAuth);
protectedRoutes.use('/dashboard', dashboardRouter);
protectedRoutes.use('/products', productsRouter);
protectedRoutes.use('/suppliers', suppliersRouter);
protectedRoutes.use('/purchase-history', purchaseHistoryRouter);
protectedRoutes.use('/sales', salesRouter);
protectedRoutes.use('/purchases', purchasesRouter);
protectedRoutes.use('/credit-sales', creditSalesRouter);
protectedRoutes.use('/credit-payments', creditPaymentsRouter);

if (process.env.AUTH_REQUIRED === 'true') {
  app.use(protectedRoutes);
} else {
  app.use('/dashboard', dashboardRouter);
  app.use('/products', productsRouter);
  app.use('/suppliers', suppliersRouter);
  app.use('/purchase-history', purchaseHistoryRouter);
  app.use('/sales', salesRouter);
  app.use('/purchases', purchasesRouter);
  app.use('/credit-sales', creditSalesRouter);
  app.use('/credit-payments', creditPaymentsRouter);
}

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} was not found.` });
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must contain valid JSON.' });
  }
  return next(error);
});

const port = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(port, () => console.log(`Cashwise API listening on port ${port}`));
}

module.exports = app;