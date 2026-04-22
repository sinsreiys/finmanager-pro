# ============================================================
# FINANCIAL MANAGEMENT PRO — app.py
# Backend con Flask + SQLite (API REST)
# ============================================================

import os
import sqlite3
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# Inicializar app
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)  # Permitir peticiones desde el frontend (útil si están en puertos distintos)

# ======================== CONFIGURACIÓN ========================
DATABASE = 'finances.db'

# ======================== FUNCIONES DE BASE DE DATOS ========================
def get_db():
    """Retorna una conexión a la base de datos SQLite."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row  # Permite acceder por nombre de columna
    return conn

def init_db():
    """Crea la tabla de transacciones si no existe."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
            category TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

# ======================== ENDPOINTS API ========================

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    """Obtener todas las transacciones."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM transactions ORDER BY date DESC')
    rows = cursor.fetchall()
    conn.close()
    transactions = [dict(row) for row in rows]
    return jsonify(transactions)

@app.route('/api/transactions', methods=['POST'])
def add_transaction():
    """Agregar una nueva transacción."""
    data = request.get_json()
    required_fields = ['id', 'date', 'description', 'amount', 'type', 'category']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Faltan campos requeridos'}), 400
    
    # Validar tipo
    if data['type'] not in ('income', 'expense'):
        return jsonify({'error': 'Tipo inválido. Debe ser "income" o "expense"'}), 400
    
    # Validar monto
    try:
        amount = float(data['amount'])
        if amount <= 0:
            raise ValueError
    except:
        return jsonify({'error': 'Monto debe ser un número positivo'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO transactions (id, date, description, amount, type, category)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (data['id'], data['date'], data['description'], amount, data['type'], data['category']))
        conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Ya existe una transacción con ese ID'}), 409
    finally:
        conn.close()
    
    return jsonify({'message': 'Transacción agregada', 'id': data['id']}), 201

@app.route('/api/transactions/<id>', methods=['PUT'])
def update_transaction(id):
    """Actualizar una transacción existente."""
    data = request.get_json()
    allowed_fields = ['date', 'description', 'amount', 'type', 'category']
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if not update_data:
        return jsonify({'error': 'No se proporcionaron campos para actualizar'}), 400
    
    # Validar tipo si se envía
    if 'type' in update_data and update_data['type'] not in ('income', 'expense'):
        return jsonify({'error': 'Tipo inválido'}), 400
    
    # Validar monto si se envía
    if 'amount' in update_data:
        try:
            amount = float(update_data['amount'])
            if amount <= 0:
                raise ValueError
            update_data['amount'] = amount
        except:
            return jsonify({'error': 'Monto debe ser un número positivo'}), 400
    
    # Construir SET dinámicamente
    set_clause = ', '.join([f"{key} = ?" for key in update_data.keys()])
    values = list(update_data.values())
    values.append(id)
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f'UPDATE transactions SET {set_clause} WHERE id = ?', values)
    conn.commit()
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Transacción no encontrada'}), 404
    conn.close()
    return jsonify({'message': 'Transacción actualizada'})

@app.route('/api/transactions/<id>', methods=['DELETE'])
def delete_transaction(id):
    """Eliminar una transacción."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM transactions WHERE id = ?', (id,))
    conn.commit()
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Transacción no encontrada'}), 404
    conn.close()
    return jsonify({'message': 'Transacción eliminada'})

# ======================== SERVIR FRONTEND ========================
@app.route('/')
def index():
    """Servir el archivo index.html."""
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    """Servir archivos estáticos (CSS, JS, etc.) desde el directorio actual."""
    return send_from_directory('.', path)

# ======================== INICIALIZAR Y EJECUTAR ========================
if __name__ == '__main__':
    init_db()
    # Si quieres agregar datos de ejemplo (opcional)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM transactions')
    count = cursor.fetchone()[0]
    if count == 0:
        # Insertar datos de ejemplo
        sample_transactions = [
            ('1', '2025-03-01', 'Nómina', 2450.00, 'income', 'Salario'),
            ('2', '2025-02-28', 'Supermercado', 185.30, 'expense', 'Comida'),
            ('3', '2025-02-27', 'Netflix', 12.99, 'expense', 'Suscripciones'),
            ('4', '2025-02-25', 'Venta freelance', 600.00, 'income', 'Freelance'),
            ('5', '2025-02-20', 'Gasolina', 45.00, 'expense', 'Transporte')
        ]
        cursor.executemany('''
            INSERT INTO transactions (id, date, description, amount, type, category)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', sample_transactions)
        conn.commit()
    conn.close()
    
    app.run(debug=True, host='0.0.0.0', port=5001)