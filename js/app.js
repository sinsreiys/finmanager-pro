/* ============================================================
   FINANCIAL MANAGEMENT PRO — app.js
   Módulo: Gestión de transacciones, estadísticas, gráficos y persistencia
   Dependencias: main.js (ToastManager, ThemeManager) y Chart.js (opcional)
   ============================================================ */

(function() {
  'use strict';

  // ======================== CONFIGURACIÓN ========================
  const STORAGE_KEY = 'fm_transactions';
  const CATEGORIES = {
    income: ['Salario', 'Freelance', 'Inversiones', 'Regalos', 'Otros ingresos'],
    expense: ['Comida', 'Transporte', 'Vivienda', 'Entretenimiento', 'Salud', 'Suscripciones', 'Compras', 'Otros gastos']
  };

  // Estado global
  let transactions = [];
  let chartInstance = null;

  // Elementos DOM principales
  let statsGrid, transactionsTable, balanceEl, incomeEl, expensesEl;
  let filterCategory, filterType, dateRangeStart, dateRangeEnd;
  let transactionForm, modalTransaction, deleteModal;

  // ======================== UTILIDADES ========================
  const formatCurrency = (amount) => `$${amount.toFixed(2)}`;
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES');
  };

  // ======================== PERSISTENCIA ========================
  function loadTransactions() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      transactions = JSON.parse(stored);
    } else {
      // Datos de ejemplo
      transactions = [
        { id: '1', date: '2025-03-01', description: 'Nómina', amount: 2450, type: 'income', category: 'Salario' },
        { id: '2', date: '2025-02-28', description: 'Supermercado', amount: 185.30, type: 'expense', category: 'Comida' },
        { id: '3', date: '2025-02-27', description: 'Netflix', amount: 12.99, type: 'expense', category: 'Suscripciones' },
        { id: '4', date: '2025-02-25', description: 'Venta freelance', amount: 600, type: 'income', category: 'Freelance' },
        { id: '5', date: '2025-02-20', description: 'Gasolina', amount: 45, type: 'expense', category: 'Transporte' }
      ];
      saveTransactions();
    }
  }

  function saveTransactions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }

  // ======================== CÁLCULO DE ESTADÍSTICAS ========================
  function calculateStats() {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpenses;
    // Cambio porcentual (simulado con mes anterior - solo para demo)
    const lastMonthIncome = totalIncome * 0.92; // placeholder
    const lastMonthExpenses = totalExpenses * 1.05;
    const changeIncome = ((totalIncome - lastMonthIncome) / lastMonthIncome * 100).toFixed(1);
    const changeExpenses = ((totalExpenses - lastMonthExpenses) / lastMonthExpenses * 100).toFixed(1);
    return { balance, totalIncome, totalExpenses, changeIncome, changeExpenses };
  }

  // ======================== RENDERIZAR DASHBOARD (STATS + TABLA) ========================
  function renderStats() {
    const stats = calculateStats();
    if (statsGrid) {
      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-card__header"><span class="stat-card__label">Saldo total</span><span class="stat-card__icon">💰</span></div>
          <div class="stat-card__value">${formatCurrency(stats.balance)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__header"><span class="stat-card__label">Ingresos</span><span class="stat-card__icon">📈</span></div>
          <div class="stat-card__value">${formatCurrency(stats.totalIncome)}</div>
          <div class="stat-card__change up">▲ +${stats.changeIncome}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__header"><span class="stat-card__label">Gastos</span><span class="stat-card__icon">📉</span></div>
          <div class="stat-card__value">${formatCurrency(stats.totalExpenses)}</div>
          <div class="stat-card__change down">▼ ${Math.abs(stats.changeExpenses)}%</div>
        </div>
      `;
    }
    return stats;
  }

  function renderTransactionsTable(filteredTransactions = null) {
    const data = filteredTransactions || transactions;
    if (!transactionsTable) return;
    if (data.length === 0) {
      transactionsTable.innerHTML = `<tr><td colspan="5" class="empty-state">No hay transacciones registradas</td></tr>`;
      return;
    }
    transactionsTable.innerHTML = data.map(t => `
      <tr data-id="${t.id}">
        <td>${formatDate(t.date)}</td>
        <td>${t.description}</td>
        <td>${t.category}</td>
        <td class="${t.type === 'income' ? 'text-success' : 'text-danger'}">${formatCurrency(t.amount)}</td>
        <td>
          <button class="btn btn-sm btn-ghost edit-transaction" data-id="${t.id}">✏️</button>
          <button class="btn btn-sm btn-danger delete-transaction" data-id="${t.id}">🗑️</button>
        </td>
      </tr>
    `).join('');

    // Reasignar eventos de edición/eliminación
    document.querySelectorAll('.edit-transaction').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        openEditModal(id);
      });
    });
    document.querySelectorAll('.delete-transaction').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        openDeleteModal(id);
      });
    });
  }

  // ======================== FILTROS ========================
  function applyFilters() {
    let filtered = [...transactions];
    const category = filterCategory?.value;
    const type = filterType?.value;
    const startDate = dateRangeStart?.value;
    const endDate = dateRangeEnd?.value;

    if (category && category !== 'all') {
      filtered = filtered.filter(t => t.category === category);
    }
    if (type && type !== 'all') {
      filtered = filtered.filter(t => t.type === type);
    }
    if (startDate) {
      filtered = filtered.filter(t => t.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(t => t.date <= endDate);
    }
    renderTransactionsTable(filtered);
    updateChart(filtered);
  }

  // ======================== GRÁFICO CON CHART.JS ========================
  function initChart() {
    const canvas = document.getElementById('expense-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // Destruir gráfico anterior si existe
    if (chartInstance) chartInstance.destroy();
    updateChart(transactions);
  }

  function updateChart(data) {
    const canvas = document.getElementById('expense-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartInstance) chartInstance.destroy();

    // Agrupar gastos por categoría
    const expensesByCategory = {};
    data.filter(t => t.type === 'expense').forEach(t => {
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
    });
    const labels = Object.keys(expensesByCategory);
    const values = Object.values(expensesByCategory);

    if (labels.length === 0) {
      chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Sin datos'], datasets: [{ data: [1], backgroundColor: ['#ccc'] }] },
        options: { plugins: { legend: { position: 'bottom' } } }
      });
      return;
    }

    chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: ['#6c8fff', '#34d399', '#f87171', '#fbbf24', '#a855f7', '#00d4e8', '#22c55e'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') } }
        }
      }
    });
  }

  // ======================== CRUD: AGREGAR/EDITAR/ELIMINAR ========================
  function addTransaction(transaction) {
    const newId = Date.now().toString();
    const newTransaction = { id: newId, ...transaction };
    transactions.push(newTransaction);
    saveTransactions();
    refreshUI();
    window.FM?.toast.show('Transacción agregada', 'success');
  }

  function updateTransaction(id, updatedData) {
    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      transactions[index] = { ...transactions[index], ...updatedData };
      saveTransactions();
      refreshUI();
      window.FM?.toast.show('Transacción actualizada', 'success');
    }
  }

  function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveTransactions();
    refreshUI();
    window.FM?.toast.show('Transacción eliminada', 'info');
  }

  // ======================== MODALES (usando ModalManager de main.js) ========================
  function openEditModal(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    // Llenar formulario
    const form = document.getElementById('transaction-form');
    if (form) {
      form.setAttribute('data-editing-id', id);
      document.getElementById('transaction-id')?.setAttribute('value', id);
      document.getElementById('description').value = transaction.description;
      document.getElementById('amount').value = transaction.amount;
      document.getElementById('date').value = transaction.date;
      document.getElementById('type').value = transaction.type;
      // Actualizar categorías según tipo
      updateCategorySelect(transaction.type);
      document.getElementById('category').value = transaction.category;
      document.getElementById('modal-title').innerText = 'Editar transacción';
    }
    window.FM?.modal.open('transaction-modal');
  }

  function openDeleteModal(id) {
    if (confirm('¿Estás seguro de eliminar esta transacción?')) {
      deleteTransaction(id);
    }
  }

  function updateCategorySelect(type) {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return;
    const cats = type === 'income' ? CATEGORIES.income : CATEGORIES.expense;
    categorySelect.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  // ======================== REFRESCAR UI COMPLETA ========================
  function refreshUI() {
    renderStats();
    applyFilters(); // respeta filtros y actualiza tabla y gráfico
  }

  // ======================== CONFIGURAR FORMULARIO ========================
  function setupForm() {
    transactionForm = document.getElementById('transaction-form');
    if (!transactionForm) return;

    transactionForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(transactionForm);
      const transaction = {
        description: formData.get('description'),
        amount: parseFloat(formData.get('amount')),
        date: formData.get('date'),
        type: formData.get('type'),
        category: formData.get('category')
      };
      if (isNaN(transaction.amount) || transaction.amount <= 0) {
        window.FM?.toast.show('Monto inválido', 'danger');
        return;
      }
      const editingId = transactionForm.getAttribute('data-editing-id');
      if (editingId) {
        updateTransaction(editingId, transaction);
        transactionForm.removeAttribute('data-editing-id');
        document.getElementById('transaction-id')?.setAttribute('value', '');
      } else {
        addTransaction(transaction);
      }
      window.FM?.modal.close();
      transactionForm.reset();
    });

    const typeSelect = document.getElementById('type');
    if (typeSelect) {
      typeSelect.addEventListener('change', () => updateCategorySelect(typeSelect.value));
    }
  }

  // ======================== INICIALIZAR FILTROS ========================
  function setupFilters() {
    filterCategory = document.getElementById('filter-category');
    filterType = document.getElementById('filter-type');
    dateRangeStart = document.getElementById('date-start');
    dateRangeEnd = document.getElementById('date-end');
    if (filterCategory) filterCategory.addEventListener('change', applyFilters);
    if (filterType) filterType.addEventListener('change', applyFilters);
    if (dateRangeStart) dateRangeStart.addEventListener('change', applyFilters);
    if (dateRangeEnd) dateRangeEnd.addEventListener('change', applyFilters);
  }

  // ======================== INICIALIZAR APP ========================
  function initApp() {
    loadTransactions();
    statsGrid = document.querySelector('.stats-grid');
    transactionsTable = document.querySelector('#transactions-table tbody');
    if (!transactionsTable && document.querySelector('#transactions-table')) {
      transactionsTable = document.querySelector('#transactions-table tbody');
    }
    setupForm();
    setupFilters();
    renderStats();
    renderTransactionsTable();
    if (typeof Chart !== 'undefined') {
      initChart();
    } else {
      console.warn('Chart.js no cargado. Gráficos deshabilitados.');
    }
    // Botón para agregar nueva transacción
    const addBtn = document.querySelector('[data-modal-target="transaction-modal"]');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const form = document.getElementById('transaction-form');
        if (form) {
          form.reset();
          form.removeAttribute('data-editing-id');
          document.getElementById('modal-title').innerText = 'Nueva transacción';
          document.getElementById('type').dispatchEvent(new Event('change'));
        }
      });
    }
    // Si existe algún modal de transacción, aseguramos que al cerrar se limpie el formulario
    document.addEventListener('modalClosed', () => {
      const form = document.getElementById('transaction-form');
      if (form) form.removeAttribute('data-editing-id');
    });
  }

  // Esperar que el DOM esté listo y que Chart.js esté cargado (si se desea)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  // Exponer API pública para uso externo
  window.FinanceApp = {
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactions: () => [...transactions],
    refreshUI
  };
})();