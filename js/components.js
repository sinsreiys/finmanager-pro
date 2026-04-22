/* ============================================================
   FINANCIAL MANAGEMENT PRO — components.js
   Sistema de componentes UI reutilizables (vanilla JS)
   ============================================================ */

(function() {
  'use strict';

  // ======================== BASE COMPONENT ========================
  class Component {
    constructor(container, props = {}) {
      this.container = typeof container === 'string' 
        ? document.querySelector(container) 
        : container;
      this.props = props;
      this.state = {};
      this.element = null;
      this.children = [];
      if (!this.container) throw new Error(`Container not found: ${container}`);
    }

    setState(newState) {
      this.state = { ...this.state, ...newState };
      this.render();
      this.afterRender();
    }

    render() {
      if (this.element) {
        this.element.innerHTML = this.template();
        this.bindEvents();
      } else {
        this.container.innerHTML = this.template();
        this.element = this.container;
        this.bindEvents();
      }
      return this.element;
    }

    template() { return ''; }
    bindEvents() {}
    afterRender() {}
    destroy() {
      if (this.element) this.element.innerHTML = '';
      this.children.forEach(child => child.destroy());
    }
  }

  // ======================== STAT CARD COMPONENT ========================
  class StatCard extends Component {
    template() {
      const { label, value, icon, change, changeType = 'up' } = this.props;
      return `
        <div class="stat-card">
          <div class="stat-card__header">
            <span class="stat-card__label">${label}</span>
            <span class="stat-card__icon">${icon}</span>
          </div>
          <div class="stat-card__value">${this.formatValue(value)}</div>
          ${change ? `<div class="stat-card__change ${changeType}">${changeType === 'up' ? '▲' : '▼'} ${change}%</div>` : ''}
        </div>
      `;
    }
    formatValue(value) {
      return typeof value === 'number' ? `$${value.toFixed(2)}` : value;
    }
  }

  // ======================== STATS GRID COMPONENT ========================
  class StatsGrid extends Component {
    template() {
      const { stats } = this.props;
      if (!stats) return '<div class="skeleton skeleton-card"></div>';
      return `
        <div class="stats-grid">
          ${new StatCard(null, { label: 'Saldo total', value: stats.balance, icon: '💰' }).template()}
          ${new StatCard(null, { label: 'Ingresos', value: stats.totalIncome, icon: '📈', change: stats.changeIncome, changeType: 'up' }).template()}
          ${new StatCard(null, { label: 'Gastos', value: stats.totalExpenses, icon: '📉', change: Math.abs(stats.changeExpenses), changeType: 'down' }).template()}
        </div>
      `;
    }
  }

  // ======================== TRANSACTION TABLE COMPONENT ========================
  class TransactionTable extends Component {
    template() {
      const { transactions, onEdit, onDelete } = this.props;
      if (!transactions || transactions.length === 0) {
        return `<div class="empty-state">No hay transacciones registradas</div>`;
      }
      return `
        <div class="table-wrapper">
          <table class="table table--striped">
            <thead>
              <tr><th data-sort>Fecha</th><th data-sort>Descripción</th><th data-sort>Categoría</th><th data-sort>Monto</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              ${transactions.map(t => `
                <tr data-id="${t.id}">
                  <td>${this.formatDate(t.date)}</td>
                  <td>${this.escape(t.description)}</td>
                  <td>${this.escape(t.category)}</td>
                  <td class="${t.type === 'income' ? 'text-success' : 'text-danger'}">${this.formatCurrency(t.amount)}</td>
                  <td>
                    <button class="btn btn-sm btn-ghost edit-tx" data-id="${t.id}">✏️</button>
                    <button class="btn btn-sm btn-danger delete-tx" data-id="${t.id}">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    bindEvents() {
      this.element.querySelectorAll('.edit-tx').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = btn.getAttribute('data-id');
          this.props.onEdit?.(id);
        });
      });
      this.element.querySelectorAll('.delete-tx').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = btn.getAttribute('data-id');
          this.props.onDelete?.(id);
        });
      });
      // Sorting (simple)
      this.element.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
          const column = th.innerText.toLowerCase();
          this.props.onSort?.(column);
        });
      });
    }

    formatDate(dateStr) {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-ES');
    }
    formatCurrency(amount) {
      return `$${amount.toFixed(2)}`;
    }
    escape(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  }

  // ======================== FILTER PANEL COMPONENT ========================
  class FilterPanel extends Component {
    template() {
      const { categories, types } = this.props;
      return `
        <div class="filter-panel" style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px;">
          <div class="form-group" style="flex:1; min-width:140px;">
            <label class="form-label">Categoría</label>
            <select id="filter-category" class="form-control">
              <option value="all">Todas</option>
              ${categories?.map(cat => `<option value="${cat}">${cat}</option>`).join('') || ''}
            </select>
          </div>
          <div class="form-group" style="flex:1; min-width:120px;">
            <label class="form-label">Tipo</label>
            <select id="filter-type" class="form-control">
              <option value="all">Todos</option>
              ${types?.map(t => `<option value="${t}">${t === 'income' ? 'Ingresos' : 'Gastos'}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="flex:1; min-width:140px;">
            <label class="form-label">Desde</label>
            <input type="date" id="date-start" class="form-control">
          </div>
          <div class="form-group" style="flex:1; min-width:140px;">
            <label class="form-label">Hasta</label>
            <input type="date" id="date-end" class="form-control">
          </div>
          <div class="form-group" style="display: flex; align-items: flex-end;">
            <button id="clear-filters" class="btn btn-secondary">Limpiar</button>
          </div>
        </div>
      `;
    }

    bindEvents() {
      this.filterCategory = this.element.querySelector('#filter-category');
      this.filterType = this.element.querySelector('#filter-type');
      this.dateStart = this.element.querySelector('#date-start');
      this.dateEnd = this.element.querySelector('#date-end');
      const clearBtn = this.element.querySelector('#clear-filters');

      const emitChange = () => {
        this.props.onFilterChange?.({
          category: this.filterCategory?.value,
          type: this.filterType?.value,
          startDate: this.dateStart?.value,
          endDate: this.dateEnd?.value
        });
      };

      this.filterCategory?.addEventListener('change', emitChange);
      this.filterType?.addEventListener('change', emitChange);
      this.dateStart?.addEventListener('change', emitChange);
      this.dateEnd?.addEventListener('change', emitChange);
      clearBtn?.addEventListener('click', () => {
        if (this.filterCategory) this.filterCategory.value = 'all';
        if (this.filterType) this.filterType.value = 'all';
        if (this.dateStart) this.dateStart.value = '';
        if (this.dateEnd) this.dateEnd.value = '';
        emitChange();
      });
    }

    getFilters() {
      return {
        category: this.filterCategory?.value || 'all',
        type: this.filterType?.value || 'all',
        startDate: this.dateStart?.value || '',
        endDate: this.dateEnd?.value || ''
      };
    }
  }

  // ======================== TRANSACTION FORM MODAL COMPONENT ========================
  class TransactionFormModal extends Component {
    constructor(container, props) {
      super(container, props);
      this.isOpen = false;
    }

    template() {
      const { title = 'Nueva transacción', categories, editingTransaction } = this.props;
      const tx = editingTransaction || {};
      const type = tx.type || 'income';
      const categoryOptions = (categories[type] || []).map(cat => 
        `<option value="${cat}" ${tx.category === cat ? 'selected' : ''}>${cat}</option>`
      ).join('');
      return `
        <div class="modal-backdrop" style="display: ${this.isOpen ? 'flex' : 'none'};">
          <div class="modal">
            <div class="modal__header">
              <h3 class="modal__title" id="modal-title">${title}</h3>
              <button class="modal__close" id="modal-close-btn">&times;</button>
            </div>
            <div class="modal__body">
              <form id="tx-form">
                <input type="hidden" id="tx-id" value="${tx.id || ''}">
                <div class="form-group">
                  <label class="form-label required">Descripción</label>
                  <input type="text" class="form-control" id="description" value="${this.escape(tx.description || '')}" required>
                </div>
                <div class="form-group">
                  <label class="form-label required">Monto</label>
                  <div class="input-group">
                    <span class="input-group__prefix">$</span>
                    <input type="number" step="0.01" class="form-control" id="amount" value="${tx.amount || ''}" required>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label required">Fecha</label>
                  <input type="date" class="form-control" id="date" value="${tx.date || ''}" required>
                </div>
                <div class="form-group">
                  <label class="form-label required">Tipo</label>
                  <select id="tx-type" class="form-control">
                    <option value="income" ${type === 'income' ? 'selected' : ''}>Ingreso</option>
                    <option value="expense" ${type === 'expense' ? 'selected' : ''}>Gasto</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label required">Categoría</label>
                  <select id="tx-category" class="form-control">
                    ${categoryOptions}
                  </select>
                </div>
                <div class="modal__footer">
                  <button type="button" class="btn btn-secondary" id="modal-cancel-btn">Cancelar</button>
                  <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      `;
    }

    bindEvents() {
      const closeBtn = this.element.querySelector('#modal-close-btn');
      const cancelBtn = this.element.querySelector('#modal-cancel-btn');
      const backdrop = this.element.querySelector('.modal-backdrop');
      const form = this.element.querySelector('#tx-form');
      const typeSelect = this.element.querySelector('#tx-type');
      const categorySelect = this.element.querySelector('#tx-category');

      const closeModal = () => this.close();
      closeBtn?.addEventListener('click', closeModal);
      cancelBtn?.addEventListener('click', closeModal);
      backdrop?.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal();
      });

      typeSelect?.addEventListener('change', () => {
        const newType = typeSelect.value;
        const cats = this.props.categories?.[newType] || [];
        categorySelect.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
      });

      form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = {
          id: this.element.querySelector('#tx-id').value,
          description: this.element.querySelector('#description').value,
          amount: parseFloat(this.element.querySelector('#amount').value),
          date: this.element.querySelector('#date').value,
          type: typeSelect.value,
          category: categorySelect.value
        };
        if (isNaN(formData.amount) || formData.amount <= 0) {
          this.props.onError?.('Monto inválido');
          return;
        }
        this.props.onSubmit?.(formData);
        this.close();
      });
    }

    open(data = {}) {
      this.props = { ...this.props, ...data, editingTransaction: data };
      this.isOpen = true;
      this.render();
    }

    close() {
      this.isOpen = false;
      this.render();
    }

    escape(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  }

  // ======================== CHART COMPONENT (usando Chart.js) ========================
  class ChartComponent extends Component {
    constructor(container, props) {
      super(container, props);
      this.chart = null;
    }

    template() {
      return '<canvas id="expense-chart" style="max-height: 300px;"></canvas>';
    }

    afterRender() {
      this.updateChart(this.props.data || []);
    }

    updateChart(transactions) {
      const canvas = this.element.querySelector('#expense-chart');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (this.chart) this.chart.destroy();

      // Agrupar gastos por categoría
      const expensesByCategory = {};
      transactions.filter(t => t.type === 'expense').forEach(t => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
      });
      const labels = Object.keys(expensesByCategory);
      const values = Object.values(expensesByCategory);

      if (typeof Chart === 'undefined') {
        console.warn('Chart.js no cargado');
        return;
      }

      if (labels.length === 0) {
        this.chart = new Chart(ctx, {
          type: 'doughnut',
          data: { labels: ['Sin datos'], datasets: [{ data: [1], backgroundColor: ['#ccc'] }] },
          options: { plugins: { legend: { position: 'bottom' } } }
        });
        return;
      }

      this.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
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
  }

  // ======================== SIDEBAR COMPONENT ========================
  class SidebarComponent extends Component {
    template() {
      const { activeLink = 'dashboard', user = { name: 'Ana García', role: 'Premium' } } = this.props;
      return `
        <div class="sidebar">
          <div class="sidebar__logo">
            <div class="sidebar__logo-icon">FM</div>
            <div class="sidebar__logo-text">FinManager<span>PRO</span></div>
          </div>
          <nav class="sidebar__nav">
            <div class="sidebar__section-label">MENÚ</div>
            <a href="#dashboard" class="sidebar__link ${activeLink === 'dashboard' ? 'active' : ''}" data-nav="dashboard">
              <span class="sidebar__link-icon">📊</span> Dashboard
            </a>
            <a href="#transactions" class="sidebar__link ${activeLink === 'transactions' ? 'active' : ''}" data-nav="transactions">
              <span class="sidebar__link-icon">💰</span> Transacciones
            </a>
            <a href="#reports" class="sidebar__link ${activeLink === 'reports' ? 'active' : ''}" data-nav="reports">
              <span class="sidebar__link-icon">📈</span> Reportes
            </a>
            <div class="sidebar__section-label">HERRAMIENTAS</div>
            <a href="#budget" class="sidebar__link" data-nav="budget">
              <span class="sidebar__link-icon">🎯</span> Presupuestos
            </a>
            <a href="#settings" class="sidebar__link" data-nav="settings">
              <span class="sidebar__link-icon">⚙️</span> Configuración
            </a>
          </nav>
          <div class="sidebar__footer">
            <div class="sidebar__user">
              <div class="sidebar__avatar">AG</div>
              <div class="sidebar__user-info">
                <div class="sidebar__user-name">${this.escape(user.name)}</div>
                <div class="sidebar__user-role">${this.escape(user.role)}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    bindEvents() {
      this.element.querySelectorAll('.sidebar__link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const nav = link.getAttribute('data-nav');
          this.props.onNavigate?.(nav);
        });
      });
    }

    setActiveLink(linkId) {
      this.props.activeLink = linkId;
      this.render();
    }
  }

  // ======================== TOPBAR COMPONENT ========================
  class TopbarComponent extends Component {
    template() {
      return `
        <div class="topbar">
          <button class="btn btn-ghost btn-icon mobile-menu-toggle" data-mobile-menu-toggle style="display: none;">☰</button>
          <h2 class="topbar__title" id="page-title">${this.props.title || 'Dashboard'}</h2>
          <div class="topbar__search">
            <span class="topbar__search-icon">🔍</span>
            <input type="search" class="topbar__search-input" placeholder="Buscar transacción...">
          </div>
          <div class="topbar__actions">
            <div class="theme-switcher" id="theme-switcher"></div>
            <button class="btn btn-primary" data-modal-target="transaction-modal">+ Nueva</button>
          </div>
        </div>
      `;
    }

    afterRender() {
      // Inicializar theme switcher
      const themeContainer = this.element.querySelector('#theme-switcher');
      if (themeContainer && typeof ThemeSwitcher !== 'undefined') {
        new ThemeSwitcher(themeContainer);
      }
      // Mobile menu toggle
      const toggleBtn = this.element.querySelector('.mobile-menu-toggle');
      if (toggleBtn && window.innerWidth <= 768) toggleBtn.style.display = 'flex';
      toggleBtn?.addEventListener('click', () => {
        document.querySelector('.sidebar')?.classList.toggle('open');
        document.querySelector('.sidebar-overlay')?.classList.toggle('visible');
      });
    }
  }

  // ======================== THEME SWITCHER (mini component) ========================
  class ThemeSwitcher extends Component {
    template() {
      const themes = ['dark', 'light', 'cyan', 'green', 'purple'];
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      return `
        <div class="theme-switcher">
          ${themes.map(theme => `
            <button class="theme-btn ${current === theme ? 'active' : ''}" data-theme-target="${theme}" style="background: var(--accent);"></button>
          `).join('')}
        </div>
      `;
    }
    bindEvents() {
      this.element.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const theme = btn.getAttribute('data-theme-target');
          document.documentElement.setAttribute('data-theme', theme);
          localStorage.setItem('fm_theme', theme);
          this.render(); // refresh active state
        });
      });
    }
  }

  // ======================== EXPORT / GLOBAL REGISTRY ========================
  window.FMComponents = {
    Component,
    StatCard,
    StatsGrid,
    TransactionTable,
    FilterPanel,
    TransactionFormModal,
    ChartComponent,
    SidebarComponent,
    TopbarComponent,
    ThemeSwitcher
  };
})();