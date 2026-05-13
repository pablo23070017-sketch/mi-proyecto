const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path'); 
const app = express();

// --- CONFIGURACIÓN DE MIDDLEWARE ---
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express.json());

// --- CONFIGURACIÓN PARA SERVIR ARCHIVOS ESTÁTICOS ---
app.use(express.static(path.join(__dirname, 'public'))); 

// --- RUTAS PARA NAVEGACIÓN ---
app.get('/mesero', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mesero.html'));
});

app.get('/admin-menu', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'gestionar_menu.html'));
});

app.get('/cocina', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cocina.html'));
});

// ----------------------------------------------------------

// CONFIGURACIÓN DE CONEXIÓN A BASE DE DATOS
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'pablo123', 
    database: 'tio_garnacha',
    port: 3307
});

db.connect(err => {
    if (err) {
        console.error('❌ ERROR AL CONECTAR A MYSQL:', err.message);
        return;
    }
    console.log('✅ SERVIDOR CONECTADO A MYSQL (PUERTO 3307)');
});

// --- 1. RUTA DE LOGIN ---
app.post('/login', (req, res) => {
    const { user, pass } = req.body;
    const sql = "SELECT id_usuario, nombre, rol FROM usuarios WHERE usuario = ? AND password = ?";
    db.query(sql, [user, pass], (err, results) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        if (results.length > 0) {
            res.status(200).json({ success: true, usuario: results[0] });
        } else {
            res.status(401).json({ success: false });
        }
    });
});

// --- 2. RUTA DE REGISTRO CON CANDADO DE ÚNICO ADMIN ---
app.post('/registrar', (req, res) => {
    const { id, usuario, password, rol, nombre } = req.body;

    if (rol === 'admin') {
        db.query("SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'admin'", (err, results) => {
            if (err) return res.status(500).json({ error: err.sqlMessage });

            if (results[0].total >= 1) {
                console.log("🚫 Registro bloqueado: Ya existe un Administrador");
                return res.status(403).send("Ya existe un administrador.");
            } else {
                const sql = "INSERT INTO usuarios (id_usuario, nombre, rol, usuario, password) VALUES (?, ?, ?, ?, ?)";
                db.query(sql, [id, nombre, rol, usuario, password], (err) => {
                    if (err) return res.status(500).json({ error: err.sqlMessage });
                    res.status(200).send("Admin creado con éxito");
                });
            }
        });
    } else {
        const sql = "INSERT INTO usuarios (id_usuario, nombre, rol, usuario, password) VALUES (?, ?, ?, ?, ?)";
        db.query(sql, [id, nombre, rol, usuario, password], (err) => {
            if (err) return res.status(500).json({ error: err.sqlMessage });
            res.status(200).send("Mesero creado");
        });
    }
});

// --- 3. RUTA DE ENVÍO DE PEDIDOS (MESERO) ---
app.post('/pedidos', (req, res) => {
    const { mesa, items, id_usuario } = req.body;
    const sqlPed = "INSERT INTO pedidos (id_mesa, id_usuario, fecha, estado) VALUES (?, ?, NOW(), 'pendiente')";
    
    db.query(sqlPed, [mesa, id_usuario], (err, result) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });

        const pedidoId = result.insertId;
        const valoresDetalle = items.map(i => [pedidoId, null, i.nombre, i.cant, i.precio, i.nota]); 
        const sqlDet = "INSERT INTO detalle_pedido (id_pedido, id_producto, nombre_producto_t, cantidad, precio_unitario, nota) VALUES ?";

        db.query(sqlDet, [valoresDetalle], (errDet) => {
            if (errDet) return res.status(500).json({ error: errDet.sqlMessage });
            res.status(200).json({ message: "OK", id: pedidoId });
        });
    });
});

// --- 4. RUTA DE PEDIDOS PENDIENTES (COCINA) ---
app.get('/pedidos-pendientes', (req, res) => {
    const sql = `
        SELECT p.id_pedido, p.id_mesa AS mesa, p.fecha,
                d.nombre_producto_t AS nombre_producto, d.cantidad, d.nota
        FROM pedidos p
        JOIN detalle_pedido d ON p.id_pedido = d.id_pedido
        WHERE p.estado = 'pendiente'
        ORDER BY p.fecha ASC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ Error en cocina:", err.sqlMessage);
            return res.status(500).json({ error: err.sqlMessage });
        }

        const pedidosMap = {};
        results.forEach(fila => {
            if (!pedidosMap[fila.id_pedido]) {
                pedidosMap[fila.id_pedido] = {
                    id_pedido: fila.id_pedido,
                    mesa: fila.mesa,
                    fecha: fila.fecha,
                    detalles: []
                };
            }
            pedidosMap[fila.id_pedido].detalles.push({
                nombre_producto: fila.nombre_producto,
                cantidad: fila.cantidad,
                nota: fila.nota || ""
            });
        });
        res.status(200).json(Object.values(pedidosMap));
    });
});

// --- 5. RUTA PARA MARCAR COMO ENTREGADO (Cambiado a 'listo' para evitar error de truncado) ---
app.get('/pedidos-entregar/:id', (req, res) => {
    const { id } = req.params;
    const sql = "UPDATE pedidos SET estado = 'listo' WHERE id_pedido = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("❌ Error SQL:", err.sqlMessage);
            return res.status(500).send(err.sqlMessage);
        }
        console.log(`✅ Pedido #${id} actualizado a 'listo'`);
        res.status(200).send("Pedido entregado");
    });
});

// --- 6. RUTA DE CLIENTES ---
app.post('/clientes', (req, res) => {
    const { nombre } = req.body;
    db.query("INSERT INTO clientes (nombre) VALUES (?)", [nombre], (err) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        res.status(200).json({ success: true });
    });
});

// --- 7. RUTA DE HISTORIAL (REPORTE PARA ADMIN) ---
app.get('/pedidos', (req, res) => {
    const sql = `
        SELECT 
            p.id_pedido, 
            u.nombre AS nombre_mesero, 
            p.fecha, 
            p.estado,
            GROUP_CONCAT(CONCAT(d.cantidad, 'x ', d.nombre_producto_t) SEPARATOR ', ') AS productos,
            SUM(d.cantidad * d.precio_unitario) AS total_cuenta
        FROM pedidos p
        LEFT JOIN usuarios u ON p.id_usuario = u.id_usuario
        JOIN detalle_pedido d ON p.id_pedido = d.id_pedido
        GROUP BY p.id_pedido
        ORDER BY p.fecha DESC;
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        res.status(200).json(results);
    });
});

// --- 8. GESTIÓN DE PRODUCTOS ---
app.get('/productos-gestion', (req, res) => {
    db.query("SELECT id_producto, nombre, precio, disponible FROM productos", (err, results) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        res.status(200).json(results);
    });
});

app.put('/productos/disponibilidad/:id', (req, res) => {
    const { id } = req.params;
    const { disponible } = req.body; 
    const sql = "UPDATE productos SET disponible = ? WHERE id_producto = ?";
    db.query(sql, [disponible, id], (err) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        res.status(200).send("Estado actualizado");
    });
});

app.put('/productos/disponibilidad-nombre', (req, res) => {
    const { nombre, disponible } = req.body;
    const sql = "UPDATE productos SET disponible = ? WHERE UPPER(TRIM(nombre)) = UPPER(TRIM(?))";
    db.query(sql, [disponible, nombre], (err, result) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        if (result.affectedRows > 0) {
            res.status(200).send("Actualizado por nombre");
        } else {
            res.status(404).send("Producto no encontrado");
        }
    });
});

// --- 9. RUTA CORTE DE CAJA ---
app.get('/corte-caja/:fecha', (req, res) => {
    const { fecha } = req.params; 
    const sql = `
        SELECT 
            COUNT(DISTINCT p.id_pedido) AS cantidadPedidos,
            IFNULL(SUM(d.cantidad * d.precio_unitario), 0) AS totalVendido
        FROM pedidos p
        JOIN detalle_pedido d ON p.id_pedido = d.id_pedido
        WHERE DATE(p.fecha) = ?;
    `;
    db.query(sql, [fecha], (err, results) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        const datos = results[0];
        const total = parseFloat(datos.totalVendido) || 0;
        res.json({
            total: total,
            pedidos: datos.cantidadPedidos,
            efectivo: total * 0.7, 
            tarjeta: total * 0.3   
        });
    });
});

// --- 10. RUTAS PARA CLIENTES FRECUENTES ---
app.get('/clientes-frecuentes', (req, res) => {
    const query = "SELECT id, nombre, pedido_usual FROM clientes_frecuentes ORDER BY nombre ASC";
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        res.json(results);
    });
});

app.post('/clientes-frecuentes', (req, res) => {
    const { nombre, pedido } = req.body;
    const query = "INSERT INTO clientes_frecuentes (nombre, pedido_usual) VALUES (?, ?)";
    db.query(query, [nombre, pedido], (err) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        res.status(200).send("Cliente guardado");
    });
});

// INICIO DEL SERVIDOR
app.listen(3000, '0.0.0.0', () => {
    console.log('🚀 SERVIDOR TÍO GARNACHA CORRIENDO EN PUERTO 3000');
    console.log('📱 Accesible en tu red local para meseros y cocina');
});