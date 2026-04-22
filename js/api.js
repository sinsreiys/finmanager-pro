/* ============================================================
   FINANCIAL MANAGEMENT PRO — main.js
   API: Themes, Sidebar, Modals, Toasts, Table, Forms
   ============================================================ */

(function() {
  'use strict';

  // ======================== STORAGE KEYS ========================
  const STORAGE_THEME = 'fm_theme';

  // ======================== DOM REFERENCES ========================
  let themeButtons = [];
  let sidebar = null;
  let sidebarOverlay = null;
  let mobileMenuBtn = null;
  let modalBackdrop = null;
  let activeModal = null;
  let toastContainer = null;

  // ======================== THEME MANAGER ========================
  const ThemeManager = {
    init() {
      themeButtons = Array.from(document.querySelectorAll('[data-theme-target]'));
      const savedTheme = localStorage.getItem(STORAGE_THEME) || 'dark';
      this.setTheme(savedTheme);
      themeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const theme = btn.getAttribute('data-theme-target');
          if (theme) this.setTheme(theme);
        });
      });
    },

    setTheme(themeName) {
      document.documentElement.setAttribute('data-theme', themeName);
      localStorage.setItem(STORAGE_THEME, themeName);
      themeButtons.forEach(btn => {
        const target = btn.getAttribute('data-theme-target');
        if (target === themeName) btn.classList.add('active');
        else btn.classList.remove('active');
      });
    }
  };

  // ======================== SIDEBAR (MOBILE) ========================
  const SidebarController = {
    init() {
      sidebar = document.querySelector('.sidebar');
      sidebarOverlay = document.querySelector('.sidebar-overlay');
      mobileMenuBtn = document.querySelector('[data-mobile-menu-toggle]');
      if (!sidebar) return;

      // Crear overlay si no existe en el DOM
      if (!sidebarOverlay) {
        sidebarOverlay = document.createElement('div');
        sidebarOverlay.className = 'sidebar-overlay';
        document.body.appendChild(sidebarOverlay);
      }

      if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.open();
        });
      }

      sidebarOverlay.addEventListener('click', () => this.close());
      window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && sidebar.classList.contains('open')) {
          this.close();
        }
      });
    },

    open() {
      sidebar.classList.add('open');
      sidebarOverlay.classList.add('visible');
      document.body.style.overflow = 'hidden';
    },

    close() {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('visible');
      document.body.style.overflow = '';
    }
  };

  // ======================== TOAST NOTIFICATIONS ========================
  const ToastManager = {
    init() {
      toastContainer = document.querySelector('.toast-container');
      if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
      }
    },

    show(message, type = 'info', title = '') {
      const toast = document.createElement('div');
      toast.className = `toast toast--${type}`;
      const icon = this._getIcon(type);
      const defaultTitles = { success: 'Éxito', danger: 'Error', warning: 'Advertencia', info: 'Información' };
      const finalTitle = title || defaultTitles[type] || 'Aviso';

      toast.innerHTML = `
        <div class="toast__icon">${icon}</div>
        <div class="toast__content">
          <div class="toast__title">${finalTitle}</div>
          <div class="toast__msg">${message}</div>
        </div>
      `;
      toastContainer.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 200);
      }, 4000);
    },

    _getIcon(type) {
      const icons = {
        success: '✓',
        danger: '✕',
        warning: '⚠',
        info: 'ℹ'
      };
      return icons[type] || 'ℹ';
    }
  };

  // ======================== MODAL MANAGER ========================
  const ModalManager = {
    init() {
      document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-modal-target]');
        if (trigger) {
          e.preventDefault();
          const modalId = trigger.getAttribute('data-modal-target');
          this.open(modalId);
        }

        if (e.target.closest('.modal__close')) {
          this.close();
        }

        if (e.target.closest('.modal-backdrop') && !e.target.closest('.modal')) {
          this.close();
        }
      });
    },

    open(modalId) {
      const modalElement = document.getElementById(modalId);
      if (!modalElement) return;
      if (activeModal) this.close();
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.style.display = 'flex';
      modalElement.style.display = 'block';
      backdrop.appendChild(modalElement);
      document.body.appendChild(backdrop);
      activeModal = { backdrop, modal: modalElement };
      document.body.style.overflow = 'hidden';
    },

    close() {
      if (activeModal) {
        activeModal.backdrop.remove();
        activeModal.modal.style.display = '';
        activeModal = null;
        document.body.style.overflow = '';
      }
    }
  };

  // ======================== TABLE SORTER ========================
  const TableSorter = {
    init() {
      document.querySelectorAll('.table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
          const table = th.closest('.table');
          const index = Array.from(th.parentNode.children).indexOf(th);
          const rows = Array.from(table.querySelectorAll('tbody tr'));
          const isAsc = th.classList.contains('sort-asc');
          this.sortTable(rows, index, !isAsc);
          this.updateSortIcons(th, !isAsc);
        });
      });
    },

    sortTable(rows, columnIndex, asc) {
      rows.sort((a, b) => {
        let aVal = a.children[columnIndex]?.innerText.trim() || '';
        let bVal = b.children[columnIndex]?.innerText.trim() || '';
        if (!isNaN(parseFloat(aVal)) && !isNaN(parseFloat(bVal))) {
          aVal = parseFloat(aVal);
          bVal = parseFloat(bVal);
        }
        if (aVal < bVal) return asc ? -1 : 1;
        if (aVal > bVal) return asc ? 1 : -1;
        return 0;
      });
      const tbody = rows[0].parentNode;
      rows.forEach(row => tbody.appendChild(row));
    },

    updateSortIcons(th, asc) {
      const siblings = Array.from(th.parentNode.children);
      siblings.forEach(sibling => sibling.classList.remove('sort-asc', 'sort-desc'));
      th.classList.add(asc ? 'sort-asc' : 'sort-desc');
    }
  };

  // ======================== FORM VALIDATOR (ejemplo básico) ========================
  const FormValidator = {
    init() {
      document.querySelectorAll('[data-validate]').forEach(form => {
        form.addEventListener('submit', (e) => {
          if (!this.validateForm(form)) {
            e.preventDefault();
            ToastManager.show('Por favor corrige los errores del formulario', 'warning');
          }
        });
        form.querySelectorAll('.form-control').forEach(input => {
          input.addEventListener('blur', () => this.validateField(input));
        });
      });
    },

    validateForm(form) {
      let isValid = true;
      form.querySelectorAll('.form-control').forEach(field => {
        if (!this.validateField(field)) isValid = false;
      });
      return isValid;
    },

    validateField(field) {
      const value = field.value.trim();
      let errorMsg = '';
      if (field.hasAttribute('required') && !value) errorMsg = 'Este campo es obligatorio';
      else if (field.type === 'email' && value && !/^\S+@\S+\.\S+$/.test(value)) errorMsg = 'Email inválido';
      else if (field.type === 'number' && value && isNaN(parseFloat(value))) errorMsg = 'Debe ser un número';
      const errorSpan = field.parentNode.querySelector('.form-hint.error') || (() => {
        const span = document.createElement('span');
        span.className = 'form-hint error';
        field.parentNode.appendChild(span);
        return span;
      })();
      if (errorMsg) {
        field.classList.add('error');
        errorSpan.textContent = errorMsg;
        return false;
      } else {
        field.classList.remove('error');
        errorSpan.textContent = '';
        return true;
      }
    }
  };

  // ======================== LOADING SKELETON ========================
  const SkeletonLoader = {
    show(container, type = 'card') {
      const skeletonClass = type === 'card' ? 'skeleton-card' : 'skeleton-text';
      const wrapper = document.createElement('div');
      wrapper.className = `skeleton ${skeletonClass}`;
      container.innerHTML = '';
      container.appendChild(wrapper);
    },
    hide(container, contentHtml) {
      container.innerHTML = contentHtml;
    }
  };

  // ======================== DATOS DE EJEMPLO Y RENDER ========================
  // Simula carga de datos para tablas / estadísticas
  async function loadDashboardData() {
    // Simular API delay
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          balance: 12450.75,
          income: 5340.20,
          expenses: 2890.35,
          changeIncome: 8.2,
          changeExpenses: -2.4,
          recentTransactions: [
            { date: '2025-03-01', description: 'Nómina', category: 'Ingresos', amount: 2450.00, type: 'income' },
            { date: '2025-02-28', description: 'Supermercado', category: 'Comida', amount: 185.30, type: 'expense' },
            { date: '2025-02-27', description: 'Netflix', category: 'Suscripciones', amount: 12.99, type: 'expense' }
          ]
        });
      }, 800);
    });
  }

  async function renderDashboard() {
    const statsGrid = document.querySelector('.stats-grid');
    const tableBody = document.querySelector('#transactions-table tbody');
    if (statsGrid) SkeletonLoader.show(statsGrid, 'card');
    if (tableBody) SkeletonLoader.show(tableBody, 'text');
    const data = await loadDashboardData();
    if (statsGrid) {
      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-card__header"><span class="stat-card__label">Saldo total</span><span class="stat-card__icon">💰</span></div>
          <div class="stat-card__value">$${data.balance.toFixed(2)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__header"><span class="stat-card__label">Ingresos</span><span class="stat-card__icon">📈</span></div>
          <div class="stat-card__value">$${data.income.toFixed(2)}</div>
          <div class="stat-card__change up">▲ +${data.changeIncome}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__header"><span class="stat-card__label">Gastos</span><span class="stat-card__icon">📉</span></div>
          <div class="stat-card__value">$${data.expenses.toFixed(2)}</div>
          <div class="stat-card__change down">▼ ${Math.abs(data.changeExpenses)}%</div>
        </div>
      `;
    }
    if (tableBody) {
      tableBody.innerHTML = data.recentTransactions.map(t => `
        <tr>
          <td>${t.date}</td>
          <td>${t.description}</td>
          <td>${t.category}</td>
          <td class="${t.type === 'income' ? 'text-success' : 'text-danger'}">$${t.amount.toFixed(2)}</td>
        </tr>
      `).join('');
    }
    ToastManager.show('Datos actualizados correctamente', 'success');
  }

  // ======================== INICIALIZACIÓN GLOBAL ========================
  function init() {
    ThemeManager.init();
    SidebarController.init();
    ToastManager.init();
    ModalManager.init();
    TableSorter.init();
    FormValidator.init();
    // Si existe un contenedor de dashboard, cargar datos
    if (document.querySelector('.stats-grid') || document.querySelector('#transactions-table')) {
      renderDashboard();
    }
    // Añadir listeners a botones que abren modales mediante data-modal-target
    document.querySelectorAll('[data-modal-target]').forEach(btn => {
      if (!btn.hasAttribute('data-modal-initialized')) {
        btn.setAttribute('data-modal-initialized', 'true');
        // Ya se maneja con delegación en ModalManager.init()
      }
    });
    // Cerrar modal con ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && activeModal) ModalManager.close();
    });
  }

  // Arrancar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exponer algunas APIs globalmente si se necesitan desde otros scripts
  window.FM = {
    theme: ThemeManager,
    toast: ToastManager,
    modal: ModalManager,
    sidebar: SidebarController,
    reloadDashboard: renderDashboard
  };
})();